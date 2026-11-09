// Dev check: node scripts/check-flows.mjs
// Exercises order -> transport bidding -> storage bidding -> payment flows against the mock API layer.
import { buildSeed } from '../src/data/seed.js';
import * as A from '../src/data/actions.js';
import { checkIntegrity } from '../src/data/integrity.js';
import { recommendTransportPrice, recommendStoragePrice, roadDistanceKm } from '../src/lib/pricing.js';
import { duesOf, round2 as round, walletOf, spendingOf, platformSummary, validateInstrument, validatePayoutAccount, luhn, feeFor, describeInstrument, MIN_PAYOUT } from '../src/lib/payments.js';
import { charge } from '../src/lib/gateway.js';

let db = buildSeed();
let failures = 0;
const check = (name, cond) => { if (!cond) { failures++; console.log('FAIL', name); } else console.log('ok  ', name); };
const run = (fn, args) => { const r = fn(db, args); db = r.db; return r.result; };
const bid = (id) => db.transportBids.find((b) => b.id === id);
const sbid = (id) => db.storageBids.find((b) => b.id === id);
const treq = (id) => db.transportRequests.find((r) => r.id === id);
const sreq = (id) => db.storageRequests.find((r) => r.id === id);

check('seed integrity', checkIntegrity(db).length === 0);
if (checkIntegrity(db).length) console.log(checkIntegrity(db));

// ---------- orders ----------
let r = run(A.placeOrder, { customerId: 'C1', listingId: 'L103', quantity: 50 });
check('place order', r.ok && db.orders.at(-1).totalAmount === 50 * 2275);
const oid = r.id;
check('over-quantity rejected', !run(A.placeOrder, { customerId: 'C1', listingId: 'L103', quantity: 99999 }).ok);
check('out-of-stock rejected', !run(A.placeOrder, { customerId: 'C1', listingId: 'L108', quantity: 1 }).ok);
const opay = () => db.payments.find((p) => p.kind === 'Order' && p.orderId === oid);
check('payment created pending with payer, payee and fee', opay().status === 'Pending' && opay().payerId === 'C1' && opay().payeeId === 'F2'
  && opay().amount === 113750 && opay().platformFee === 2275 && opay().netAmount === 111475);
check('transport blocked before accept', !run(A.createTransportRequest, { farmerId: 'F2', orderId: oid, date: '2026-11-10', offeredPrice: 9000 }).ok);
const before = db.listings.find((l) => l.id === 'L103').quantity;
check('farmer accepts', run(A.respondOrder, { orderId: oid, accept: true }).ok);
check('stock reduced', db.listings.find((l) => l.id === 'L103').quantity === before - 50);
check('pay order: money goes to escrow, not to the farmer', run(A.payOrder, { orderId: oid, method: 'UPI', gatewayRef: 'pay_T1', instrument: 'UPI a@b' }).ok && opay().status === 'In escrow' && opay().gatewayRef === 'pay_T1');
check('cannot pay twice', !run(A.payOrder, { orderId: oid, method: 'UPI' }).ok);
check('escrowed money is not yet in the farmer wallet', walletOf(db, 'F2').inEscrow >= 111475 && !walletOf(db, 'F2').ledger.some((e) => e.paymentId === opay().id));

// ---------- transport negotiation ----------
check('request needs a price', !run(A.createTransportRequest, { farmerId: 'F2', orderId: oid, date: '2026-11-10', offeredPrice: 0 }).ok);
check('other farmer cannot request for this order', !run(A.createTransportRequest, { farmerId: 'F1', orderId: oid, date: '2026-11-10', offeredPrice: 9000 }).ok);
r = run(A.createTransportRequest, { farmerId: 'F2', orderId: oid, date: '2026-11-10', offeredPrice: 9000, notes: 'Wheat bags' });
const tq = r.id;
check('farmer posts transport request', r.ok && treq(tq).status === 'Open' && treq(tq).loadTonnes === 5);
check('duplicate active request blocked', !run(A.createTransportRequest, { farmerId: 'F2', orderId: oid, date: '2026-11-10', offeredPrice: 9000 }).ok);

check('vehicle too small cannot bid (load 5 t, V1 1.5 t)', !run(A.submitTransportBid, { requestId: tq, transporterId: 'T1', vehicleId: 'V1', kind: 'accept', etaDays: 1 }).ok);
check('transporter cannot bid with another transporter\'s vehicle', !run(A.submitTransportBid, { requestId: tq, transporterId: 'T1', vehicleId: 'V3', kind: 'accept', etaDays: 1 }).ok);
check('unavailable vehicle cannot bid (V2 on trip)', !run(A.submitTransportBid, { requestId: tq, transporterId: 'T1', vehicleId: 'V2', kind: 'accept', etaDays: 1 }).ok);
check('counter needs a price', !run(A.submitTransportBid, { requestId: tq, transporterId: 'T2', vehicleId: 'V3', kind: 'counter', etaDays: 2 }).ok);

r = run(A.submitTransportBid, { requestId: tq, transporterId: 'T2', vehicleId: 'V3', kind: 'accept', etaDays: 2, note: 'Free that day' });
const bAccept = r.id;
check('transporter accepts farmer price', r.ok && bid(bAccept).price === 9000 && bid(bAccept).kind === 'accept' && bid(bAccept).status === 'Pending');
r = run(A.submitTransportBid, { requestId: tq, transporterId: 'T4', vehicleId: 'V6', kind: 'counter', price: 12000, etaDays: 1 });
check('mini truck (2 t) too small', !r.ok);
r = run(A.submitTransportBid, { requestId: tq, transporterId: 'T3', vehicleId: 'V5', kind: 'counter', price: 11000, etaDays: 3 });
const bCounter = r.id;
check('transporter counter-offers', r.ok && bid(bCounter).price === 11000 && bid(bCounter).kind === 'counter');
r = run(A.submitTransportBid, { requestId: tq, transporterId: 'T3', vehicleId: 'V5', kind: 'counter', price: 10500, etaDays: 3 });
check('re-bidding updates the same bid', r.ok && r.id === bCounter && bid(bCounter).price === 10500 && db.transportBids.filter((b) => b.requestId === tq).length === 2);

// farmer raises the price: accepting bids go stale, counter bids stay
check('invalid price update rejected', !run(A.updateTransportRequest, { id: tq, changes: { offeredPrice: -5 } }).ok);
check('farmer raises offered price', run(A.updateTransportRequest, { id: tq, changes: { offeredPrice: 10000 } }).ok && treq(tq).offeredPrice === 10000);
check('accepting bid becomes Outdated', bid(bAccept).status === 'Outdated');
check('counter bid unaffected', bid(bCounter).status === 'Pending');
check('cannot select an Outdated bid', !run(A.selectTransportBid, { bidId: bAccept, farmerId: 'F2' }).ok);
r = run(A.submitTransportBid, { requestId: tq, transporterId: 'T2', vehicleId: 'V3', kind: 'accept', etaDays: 2 });
check('re-confirming at the new price reactivates the bid', r.ok && r.id === bAccept && bid(bAccept).price === 10000 && bid(bAccept).status === 'Pending');
check('another farmer cannot select', !run(A.selectTransportBid, { bidId: bCounter, farmerId: 'F1' }).ok);

// withdrawing and cancelling
r = run(A.submitTransportBid, { requestId: tq, transporterId: 'T3', vehicleId: 'V5', kind: 'counter', price: 9800, etaDays: 2 });
check('withdraw bid', run(A.withdrawTransportBid, { bidId: bCounter, transporterId: 'T3' }).ok && bid(bCounter).status === 'Withdrawn');
check('withdrawn bid can be revived by bidding again', run(A.submitTransportBid, { requestId: tq, transporterId: 'T3', vehicleId: 'V5', kind: 'counter', price: 9800, etaDays: 2 }).ok && bid(bCounter).status === 'Pending');

// select the cheaper counter-offer
const vehicleBefore = db.vehicles.find((v) => v.id === 'V5').availability;
r = run(A.selectTransportBid, { bidId: bCounter, farmerId: 'F2' });
const trk = r.id;
check('farmer selects a bid -> shipment', r.ok && db.shipments.find((s) => s.trackingId === trk)?.agreedPrice === 9800 && vehicleBefore === 'Available');
check('request confirmed with agreed price', treq(tq).status === 'Confirmed' && treq(tq).agreedPrice === 9800 && treq(tq).selectedBidId === bCounter);
check('losing bid rejected', bid(bAccept).status === 'Rejected' && bid(bCounter).status === 'Selected');
check('selected vehicle is on trip', db.vehicles.find((v) => v.id === 'V5').availability === 'On trip');
check('closed request cannot take bids', !run(A.submitTransportBid, { requestId: tq, transporterId: 'T2', vehicleId: 'V3', kind: 'accept', etaDays: 1 }).ok);
check('closed request cannot be edited or cancelled', !run(A.updateTransportRequest, { id: tq, changes: { offeredPrice: 1 } }).ok && !run(A.cancelTransportRequest, { id: tq }).ok);
['Picked up', 'In transit', 'Delivered'].forEach((s) => { run(A.updateShipment, { trackingId: trk }); check(`shipment -> ${s}`, db.shipments.find((x) => x.trackingId === trk).status === s); });
check('order delivered, request completed, vehicle freed', db.orders.find((o) => o.id === oid).status === 'Delivered' && treq(tq).status === 'Completed' && db.vehicles.find((v) => v.id === 'V5').availability === 'Available');
check('shipment cannot go past delivered', !run(A.updateShipment, { trackingId: trk }).ok);

// ---------- payments: escrow, release, fees ----------
const farePay = () => db.payments.find((p) => p.kind === 'Transport' && p.refId === trk);
check('selecting a transporter creates the fare payment (farmer -> transporter, 1.5% fee)', farePay()?.payerId === 'F2' && farePay().payeeId === 'T3' && farePay().amount === 9800 && farePay().platformFee === 147 && farePay().netAmount === 9653);
check('an unpaid fare stays pending after delivery', farePay().status === 'Pending');
check('order money stays in escrow after delivery, with an auto-release date', opay().status === 'In escrow' && Boolean(opay().autoReleaseAt));
check('only the buyer can confirm receipt', !run(A.confirmReceipt, { paymentId: opay().id, userId: 'C2' }).ok);
check('farmer pays a delivered shipment: straight to the transporter', run(A.makePayment, { paymentId: farePay().id, payerId: 'F2', method: 'Card', instrument: 'Card ••••4242' }).ok && farePay().status === 'Paid' && Boolean(farePay().releasedAt));
check('cash on delivery is not available for a transport fare', !run(A.makePayment, { paymentId: farePay().id, payerId: 'F2', method: 'Cash on delivery' }).ok);
check('buyer confirms receipt: released to the farmer wallet', run(A.confirmReceipt, { paymentId: opay().id, userId: 'C1' }).ok && opay().status === 'Paid'
  && walletOf(db, 'F2').ledger.some((e) => e.paymentId === opay().id && e.amount === 111475));
check('cannot confirm twice', !run(A.confirmReceipt, { paymentId: opay().id, userId: 'C1' }).ok);
check('payment history records every step', opay().history.length >= 4 && opay().history.at(-1).status === 'Paid');

// seed request: farmer cancels an open request, bids are closed
check('cancel open transport request', run(A.cancelTransportRequest, { id: 'TQ4003' }).ok && treq('TQ4003').status === 'Cancelled' && bid('TB4005').status === 'Rejected' && bid('TB4006').status === 'Rejected');
check('cancelled request frees the order for a new request', run(A.createTransportRequest, { farmerId: 'F5', orderId: 'O1003', date: '2026-11-08', offeredPrice: 1700 }).ok);

// ---------- cancel / reject order paths ----------
r = run(A.placeOrder, { customerId: 'C2', listingId: 'L105', quantity: 10 });
check('cancel placed order', run(A.cancelOrder, { orderId: r.id }).ok);
check('cannot cancel twice', !run(A.cancelOrder, { orderId: r.id }).ok);
check('cancelling an unpaid order closes its payment', db.payments.find((p) => p.orderId === r.id).status === 'Failed');
{
  // paid order cancelled by the buyer / rejected by the farmer -> refund from escrow
  const a = run(A.placeOrder, { customerId: 'C2', listingId: 'L105', quantity: 10 }).id;
  run(A.payOrder, { orderId: a, method: 'Net banking', instrument: 'Net banking, HDFC Bank' });
  check('paid order is in escrow', db.payments.find((p) => p.orderId === a).status === 'In escrow');
  check('cancelling a paid order refunds it', run(A.cancelOrder, { orderId: a }).ok && db.payments.find((p) => p.orderId === a).status === 'Refunded' && Boolean(db.payments.find((p) => p.orderId === a).refundedAt));
  check('a closed order cannot be paid', !run(A.payOrder, { orderId: a, method: 'UPI' }).ok);
  const b = run(A.placeOrder, { customerId: 'C2', listingId: 'L105', quantity: 5 }).id;
  run(A.payOrder, { orderId: b, method: 'UPI', instrument: 'UPI a@b' });
  check('farmer rejecting a paid order refunds the buyer', run(A.respondOrder, { orderId: b, accept: false, reason: 'no stock' }).ok && db.payments.find((p) => p.orderId === b).status === 'Refunded');
  const c = run(A.placeOrder, { customerId: 'C2', listingId: 'L105', quantity: 5 }).id;
  check('farmer rejecting an unpaid order closes the payment', run(A.respondOrder, { orderId: c, accept: false }).ok && db.payments.find((p) => p.orderId === c).status === 'Failed');
}
{
  // declined attempts keep the payment pending; cash on delivery waits for the driver
  const o2 = run(A.placeOrder, { customerId: 'C3', listingId: 'L113', quantity: 4 }).id;
  const pid = db.payments.find((p) => p.orderId === o2).id;
  check('a failed attempt keeps the payment pending and counts the attempt', run(A.recordPaymentFailure, { paymentId: pid, payerId: 'C3', method: 'Card', reason: 'declined' }).ok && db.payments.find((p) => p.id === pid).status === 'Pending' && db.payments.find((p) => p.id === pid).attempts === 1);
  check('another user cannot pay this payment', !run(A.makePayment, { paymentId: pid, payerId: 'C1', method: 'UPI' }).ok);
  check('unknown payment method rejected', !run(A.makePayment, { paymentId: pid, payerId: 'C3', method: 'Bitcoin' }).ok);
  check('choose cash on delivery', run(A.makePayment, { paymentId: pid, payerId: 'C3', method: 'Cash on delivery' }).ok && db.payments.find((p) => p.id === pid).method === 'Cash on delivery' && db.payments.find((p) => p.id === pid).status === 'Pending');
  check('cash on delivery is not "due" online', !duesOf(db, 'C3').some((p) => p.id === pid));
}

// ---------- storage negotiation ----------
check('storage request validation', !run(A.createStorageRequest, { farmerId: 'F2', listingId: 'L103', quantity: 0, days: 10, startDate: '2026-11-20', city: 'Ludhiana', offeredPrice: 7 }).ok
  && !run(A.createStorageRequest, { farmerId: 'F2', listingId: 'L103', quantity: 10, days: 10, startDate: '2026-11-20', city: 'Ludhiana', offeredPrice: 0 }).ok
  && !run(A.createStorageRequest, { farmerId: 'F2', listingId: 'L101', quantity: 10, days: 10, startDate: '2026-11-20', city: 'Ludhiana', offeredPrice: 7 }).ok);
const cap = db.storages.find((s) => s.id === 'ST3').availableCapacity;
r = run(A.createStorageRequest, { farmerId: 'F2', listingId: 'L105', quantity: 100, days: 30, startDate: '2026-11-20', city: 'Ludhiana', offeredPrice: 6, storageType: 'Silo' });
const sq = r.id;
check('farmer posts storage request', r.ok && sreq(sq).status === 'Open');
check('facility without enough capacity cannot bid', !run(A.submitStorageBid, { requestId: sq, ownerId: 'S2', storageId: 'ST4', kind: 'accept' }).ok);
check('another owner\'s facility cannot be used', !run(A.submitStorageBid, { requestId: sq, ownerId: 'S1', storageId: 'ST3', kind: 'accept' }).ok);
r = run(A.submitStorageBid, { requestId: sq, ownerId: 'S2', storageId: 'ST3', kind: 'counter', price: 8, note: 'Standard silo rate' });
const sb1 = r.id;
check('storage owner counters', r.ok && sbid(sb1).price === 8);
r = run(A.submitStorageBid, { requestId: sq, ownerId: 'S2', storageId: 'ST3', kind: 'accept' });
check('same owner re-bids: accepts farmer price', r.ok && r.id === sb1 && sbid(sb1).price === 6 && sbid(sb1).kind === 'accept');
check('farmer changes price', run(A.updateStorageRequest, { id: sq, changes: { offeredPrice: 7 } }).ok && sreq(sq).offeredPrice === 7);
check('storage accept-bid becomes Outdated', sbid(sb1).status === 'Outdated');
check('cannot select Outdated storage bid', !run(A.selectStorageBid, { bidId: sb1, farmerId: 'F2' }).ok);
run(A.submitStorageBid, { requestId: sq, ownerId: 'S2', storageId: 'ST3', kind: 'counter', price: 7.5 });
check('storage owner re-prices', sbid(sb1).status === 'Pending' && sbid(sb1).price === 7.5);
check('another farmer cannot select storage bid', !run(A.selectStorageBid, { bidId: sb1, farmerId: 'F1' }).ok);
r = run(A.selectStorageBid, { bidId: sb1, farmerId: 'F2' });
check('farmer selects storage bid', r.ok && sreq(sq).status === 'Confirmed' && sreq(sq).storageId === 'ST3' && sreq(sq).agreedPrice === 7.5);
check('capacity reserved', db.storages.find((s) => s.id === 'ST3').availableCapacity === cap - 100);
check('listing now shows provider storage', db.listings.find((l) => l.id === 'L105').storage.storageId === 'ST3');
const spay = () => db.payments.find((p) => p.kind === 'Storage' && p.refId === sq);
check('selecting storage creates the storage payment (qty x days x rate, 1.5% fee)', spay()?.payerId === 'F2' && spay().payeeId === 'S2' && spay().amount === 100 * 30 * 7.5 && spay().platformFee === 337.5 && spay().netAmount === 22162.5 && spay().status === 'Pending');
check('farmer pays storage: held in escrow', run(A.makePayment, { paymentId: spay().id, payerId: 'F2', method: 'UPI', instrument: 'UPI f@b' }).ok && spay().status === 'In escrow');
check('complete booking', run(A.completeStorage, { requestId: sq }).ok);
check('completing the booking releases the charges to the storage owner', spay().status === 'Paid' && walletOf(db, 'S2').ledger.some((e) => e.paymentId === spay().id && e.amount === 22162.5));
check('capacity restored and listing back to own storage', db.storages.find((s) => s.id === 'ST3').availableCapacity === cap && db.listings.find((l) => l.id === 'L105').storage.mode === 'own');
check('cancel open storage request closes bids', run(A.cancelStorageRequest, { id: 'SQ5002' }).ok && sbid('SB5005').status === 'Rejected');
check('facility with active booking cannot be deleted', !run(A.deleteFacility, { id: 'ST1' }).ok);

// ---------- listings, vehicles, facilities, users ----------
r = run(A.addListing, { farmerId: 'F1', name: 'Test', category: 'Vegetables', price: 10, unit: 'quintal', quantity: 5, location: 'X', description: 'd', image: '', availability: 'Available', storage: { mode: 'own', note: '' } });
check('add listing', r.ok && db.listings.some((l) => l.id === r.id));
check('delete listing', run(A.deleteListing, { id: r.id }).ok);
check('delete listing with open order blocked', !run(A.deleteListing, { id: 'L101' }).ok);
check('provider listing with unknown facility rejected', !run(A.addListing, { farmerId: 'F2', name: 'S', category: 'Grains', price: 1, unit: 'quintal', quantity: 5, location: 'X', description: 'd', image: '', availability: 'Available', storage: { mode: 'provider', storageId: 'NOPE' } }).ok);
check('seed listings carry a storage choice', db.listings.every((l) => l.storage && ['own', 'provider'].includes(l.storage.mode)));
check('duplicate vehicle blocked', !run(A.addVehicle, { ownerId: 'T1', vehicleType: 'Mini Truck', regNo: 'MH15 AB 1234', loadCapacity: 1, serviceArea: ['X'], pricePerKm: 10, availability: 'Available' }).ok);
check('vehicle on active shipment cannot be deleted', !run(A.deleteVehicle, { id: 'V2' }).ok);
check('deleting a vehicle withdraws its open bids', run(A.deleteVehicle, { id: 'V3' }).ok && db.transportBids.filter((b) => b.vehicleId === 'V3').every((b) => !['Pending', 'Outdated'].includes(b.status)));
check('facility capacity rule', !run(A.addFacility, { ownerId: 'S1', name: 'x', type: 'Warehouse', location: 'y', totalCapacity: 10, availableCapacity: 20, pricePerTonneDay: 1, facilities: [], availability: 'Available' }).ok);
check('duplicate email blocked', !run(A.addUser, { user: { role: 'Farmer', name: 'x', email: 'RAMESH@agrilogix.demo', password: 'p' } }).ok);
r = run(A.addUser, { user: { role: 'Transporter', name: 'New T', email: 'nt@x.com', password: 'p', location: 'Delhi' }, vehicle: { vehicleType: 'Mini Truck', regNo: 'DL01 XX 0001', loadCapacity: 2, serviceArea: ['Delhi'], pricePerKm: 20, availability: 'Available' } });
check('register transporter + vehicle', r.ok && db.vehicles.some((v) => v.ownerId === r.id));

// ---------- payments: seed state, shipments release, disputes, payouts, wallet ----------
{
  const pid = (id) => db.payments.find((p) => p.id === id);
  check('seed: every payment kind and state is present', ['Order', 'Transport', 'Storage'].every((k) => db.payments.some((p) => p.kind === k))
    && ['Pending', 'In escrow', 'Paid', 'Disputed', 'Refunded', 'Failed'].every((s) => buildSeed().payments.some((p) => p.status === s)));
  check('seed: fee + net = amount on every payment', buildSeed().payments.every((p) => Math.abs(p.amount - p.platformFee - p.netAmount) < 0.001));
  check('fee rates: 2% orders, 1.5% transport and storage', feeFor('Order', 1000) === 20 && feeFor('Transport', 1000) === 15 && feeFor('Storage', 1000) === 15);

  // delivering a shipment whose fare is in escrow releases it to the transporter
  const t1Before = walletOf(db, 'T1').available;
  ['Picked up', 'In transit', 'Delivered'].forEach(() => run(A.updateShipment, { trackingId: 'TRK-24002' }));
  check('delivery releases an escrowed fare to the transporter', pid('P2010').status === 'Paid' && walletOf(db, 'T1').available === t1Before + 13790);
  check('delivery keeps the buyer\'s order money in escrow (needs confirmation)', pid('P2002').status === 'In escrow' && Boolean(pid('P2002').autoReleaseAt));

  // auto-release after the confirmation window
  const early = run(A.autoRelease, { now: '2026-01-01T00:00:00.000Z' });
  check('auto-release does nothing before the window ends', early.released === 0 && pid('P2002').status === 'In escrow');
  const late = run(A.autoRelease, { now: '2099-01-01T00:00:00.000Z' });
  check('auto-release pays the farmer after the window', late.released >= 1 && pid('P2002').status === 'Paid');

  // disputes
  const dOrder = run(A.placeOrder, { customerId: 'C4', listingId: 'L110', quantity: 10 }).id;
  const dp = db.payments.find((p) => p.orderId === dOrder);
  check('cannot dispute before paying', !run(A.raiseDispute, { paymentId: dp.id, userId: 'C4', reason: 'Wrong grade delivered' }).ok);
  run(A.payOrder, { orderId: dOrder, method: 'UPI', instrument: 'UPI c@b' });
  check('dispute needs a real reason', !run(A.raiseDispute, { paymentId: dp.id, userId: 'C4', reason: 'bad' }).ok);
  check('only the payer can dispute', !run(A.raiseDispute, { paymentId: dp.id, userId: 'F4', reason: 'I want to dispute this' }).ok);
  r = run(A.raiseDispute, { paymentId: dp.id, userId: 'C4', reason: 'Quality does not match the listing' });
  check('payer raises a dispute: payment frozen', r.ok && pid(dp.id).status === 'Disputed' && db.disputes.find((d) => d.id === r.id).status === 'Open');
  check('a frozen payment cannot be paid again or cancelled', !run(A.payOrder, { orderId: dOrder, method: 'UPI' }).ok);
  check('resolution needs a note', !run(A.resolveDispute, { disputeId: r.id, resolution: 'refund', note: '' }).ok);
  check('resolution must be refund or release', !run(A.resolveDispute, { disputeId: r.id, resolution: 'maybe', note: 'x' }).ok);
  check('admin refunds the payer', run(A.resolveDispute, { disputeId: r.id, resolution: 'refund', note: 'Photos confirm the mismatch' }).ok && pid(dp.id).status === 'Refunded' && db.disputes.find((d) => d.id === r.id).status === 'Resolved');
  check('a resolved dispute cannot be resolved again', !run(A.resolveDispute, { disputeId: r.id, resolution: 'release', note: 'x' }).ok);
  check('admin releases a seeded dispute to the farmer', run(A.resolveDispute, { disputeId: 'D6001', resolution: 'release', note: 'Description matches the listing' }).ok && pid('P2007').status === 'Paid');

  // wallet and payouts
  const f3 = walletOf(db, 'F3');
  check('wallet: balance = released credits - payouts', f3.balance === 139160 - 100000 && f3.available === 39160 && f3.withdrawn === 100000);
  check('wallet: pending payout is already deducted', walletOf(db, 'T3').processing === 20000);
  check('payout needs a saved account', !run(A.requestPayout, { userId: 'F1', amount: 500 }).ok);
  check('payout account is validated', !run(A.savePayoutAccount, { userId: 'F1', account: { type: 'UPI', upiId: 'nope' } }).ok
    && !run(A.savePayoutAccount, { userId: 'F1', account: { type: 'Bank', holder: 'R', accountNumber: '12', ifsc: 'X' } }).ok);
  check('customers cannot receive payouts', !run(A.savePayoutAccount, { userId: 'C1', account: { type: 'UPI', upiId: 'a@b' } }).ok);
  check('save a bank account', run(A.savePayoutAccount, { userId: 'F1', account: { type: 'Bank', holder: 'Ramesh Patil', accountNumber: '123456789012', ifsc: 'sbin0001234', bankName: 'State Bank of India' } }).ok && db.users.find((u) => u.id === 'F1').payoutAccount.ifsc === 'SBIN0001234');
  const avail = walletOf(db, 'F1').available;
  check('cannot withdraw more than the wallet holds', !run(A.requestPayout, { userId: 'F1', amount: avail + 1 }).ok);
  check('cannot withdraw below the minimum', !run(A.requestPayout, { userId: 'F1', amount: MIN_PAYOUT - 1 }).ok);
  r = run(A.requestPayout, { userId: 'F3', amount: 9000 });
  check('withdraw part of the wallet', r.ok && walletOf(db, 'F3').available === 39160 - 9000 && db.payouts.find((x) => x.id === r.id).destination === 'HDFC Bank ••••1234');
  check('rejecting a payout needs a reason', !run(A.processPayout, { payoutId: r.id, approve: false, note: '' }).ok);
  check('a rejected payout returns to the wallet', run(A.processPayout, { payoutId: r.id, approve: false, note: 'Account name mismatch' }).ok && walletOf(db, 'F3').available === 39160);
  check('approving a payout marks it paid with a reference', run(A.processPayout, { payoutId: 'PO7002', approve: true }).ok && db.payouts.find((x) => x.id === 'PO7002').status === 'Paid' && Boolean(db.payouts.find((x) => x.id === 'PO7002').reference));
  check('a processed payout cannot be processed again', !run(A.processPayout, { payoutId: 'PO7002', approve: true }).ok);

  // cash on delivery sale: farmer is paid in cash, platform commission is owed
  const f5 = walletOf(db, 'F5');
  check('cash on delivery order is paid on delivery with commission owed', (() => {
    const o3 = run(A.placeOrder, { customerId: 'C3', listingId: 'L114', quantity: 10 }).id;
    run(A.payOrder, { orderId: o3, method: 'Cash on delivery' });
    run(A.respondOrder, { orderId: o3, accept: true });
    const rq = run(A.createTransportRequest, { farmerId: 'F5', orderId: o3, date: '2026-12-01', offeredPrice: 2000 }).id;
    run(A.submitTransportBid, { requestId: rq, transporterId: 'T1', vehicleId: 'V1', kind: 'accept', etaDays: 1 });
    const tk = run(A.selectTransportBid, { bidId: db.transportBids.at(-1).id, farmerId: 'F5' }).id;
    ['Picked up', 'In transit', 'Delivered'].forEach(() => run(A.updateShipment, { trackingId: tk }));
    const p = db.payments.find((x) => x.orderId === o3);
    return p.status === 'Paid' && walletOf(db, 'F5').balance === round(f5.balance - p.platformFee);
  })());

  // spending and platform summary
  check('spending: totals add up for a customer', (() => { const s = spendingOf(db, 'C2'); return s.count === db.payments.filter((p) => p.payerId === 'C2').length && s.refunded >= 227500; })());
  const ps = platformSummary(db);
  check('platform: fees earned = fees on paid payments', ps.feesEarned === Math.round(db.payments.filter((p) => p.status === 'Paid').reduce((n, p) => n + p.platformFee, 0) * 100) / 100);
  check('platform: kind breakdown covers all payments', ps.byKind.reduce((n, k) => n + k.count, 0) === db.payments.length);
}

// ---------- payments: input checks and gateway simulator ----------
{
  check('luhn: valid and invalid card numbers', luhn('4242424242424242') && !luhn('4242424242424241'));
  check('card: valid details pass', validateInstrument('Card', { holder: 'A B', number: '4242 4242 4242 4242', expiry: '12/40', cvv: '123' }) === null);
  check('card: bad number, expired, bad cvv, no name are rejected', Boolean(validateInstrument('Card', { holder: 'A', number: '1234 5678 9012 3456', expiry: '12/40', cvv: '123' }))
    && Boolean(validateInstrument('Card', { holder: 'A', number: '4242424242424242', expiry: '01/20', cvv: '123' }))
    && Boolean(validateInstrument('Card', { holder: 'A', number: '4242424242424242', expiry: '12/40', cvv: '1' }))
    && Boolean(validateInstrument('Card', { holder: ' ', number: '4242424242424242', expiry: '12/40', cvv: '123' })));
  check('upi and bank validation', validateInstrument('UPI', { upiId: 'name@okaxis' }) === null && Boolean(validateInstrument('UPI', { upiId: 'name' })) && Boolean(validateInstrument('Net banking', {})) && validateInstrument('Net banking', { bank: 'HDFC Bank' }) === null);
  check('payout account validation', validatePayoutAccount({ type: 'UPI', upiId: 'a.b@okicici' }) === null && Boolean(validatePayoutAccount({ type: 'Bank', holder: 'X', accountNumber: '123', ifsc: 'HDFC0001234' })) && validatePayoutAccount({ type: 'Bank', holder: 'X', accountNumber: '123456789', ifsc: 'HDFC0001234' }) === null);
  check('stored instrument is masked (no full card number)', describeInstrument('Card', { number: '4242 4242 4242 4242' }) === 'Card ••••4242');
  const ok = await charge({ amount: 100, method: 'Card', details: { holder: 'A', number: '4242 4242 4242 4242', expiry: '12/40', cvv: '123' }, delay: 0 });
  check('gateway: test card succeeds with a reference', ok.ok && /^pay_/.test(ok.gatewayRef) && ok.instrument === 'Card ••••4242');
  const declined = await charge({ amount: 100, method: 'Card', details: { holder: 'A', number: '4000 0000 0000 0002', expiry: '12/40', cvv: '123' }, delay: 0 });
  check('gateway: declined test card fails with a message', !declined.ok && /declined/i.test(declined.error));
  check('gateway: UPI id ending @fail is declined', !(await charge({ amount: 100, method: 'UPI', details: { upiId: 'x@fail' }, delay: 0 })).ok);
  check('gateway: invalid input never reaches the network', !(await charge({ amount: 100, method: 'UPI', details: { upiId: 'bad' }, delay: 0 })).ok);
}

// ---------- admin: KYC review, suspension, analytics ----------
import { kycStatus } from '../src/lib/kyc.js';
import { computeAnalytics } from '../src/lib/analytics.js';
check('seed has accounts in every KYC state', ['Verified', 'Under review', 'Rejected', 'Not submitted'].every((st) => db.users.some((u) => u.role !== 'Admin' && kycStatus(u) === st)));
check('seed legacy users count as verified', kycStatus(db.users.find((u) => u.id === 'F1')) === 'Verified');
check('cannot review an account with nothing under review', !run(A.reviewKyc, { userId: 'F1', approve: true }).ok);
check('rejection needs a reason', !run(A.reviewKyc, { userId: 'F7', approve: false, note: '  ' }).ok);
check('admin approves KYC', run(A.reviewKyc, { userId: 'F7', approve: true, note: 'Documents match records' }).ok && kycStatus(db.users.find((u) => u.id === 'F7')) === 'Verified' && db.users.find((u) => u.id === 'F7').verified === true);
check('approved account cannot be reviewed again', !run(A.reviewKyc, { userId: 'F7', approve: true }).ok);
check('admin rejects KYC with reason', run(A.reviewKyc, { userId: 'T5', approve: false, note: 'Licence number unreadable' }).ok && kycStatus(db.users.find((u) => u.id === 'T5')) === 'Rejected' && db.users.find((u) => u.id === 'T5').kycNote === 'Licence number unreadable');
check('farmer needs land proof to submit KYC', !run(A.submitKyc, { userId: 'F9', kyc: { landProof: null } }).ok);
check('farmer submits KYC', run(A.submitKyc, { userId: 'F9', kyc: { landProof: { name: 'land.pdf', size: 1, uploadedAt: 'x' } } }).ok && kycStatus(db.users.find((u) => u.id === 'F9')) === 'Under review');
check('rejected user can resubmit (details text)', run(A.submitKyc, { userId: 'T5', kyc: { summary: 'Licence TS09-2021-0044110, clear copy attached' } }).ok && kycStatus(db.users.find((u) => u.id === 'T5')) === 'Under review' && db.users.find((u) => u.id === 'T5').kycNote === '');
check('non-farmer must write KYC details', !run(A.submitKyc, { userId: 'C5', kyc: { summary: '   ' } }).ok);
check('new registration starts Under review when details given', (() => { const r = run(A.addUser, { user: { role: 'Customer', name: 'N', email: 'n@x.com', password: 'p', location: 'X', kyc: { summary: 'GSTIN 1' } } }); return kycStatus(db.users.find((u) => u.id === r.id)) === 'Under review'; })());
check('new registration without details is Not submitted', (() => { const r = run(A.addUser, { user: { role: 'Farmer', name: 'N2', email: 'n2@x.com', password: 'p', location: 'X' } }); return kycStatus(db.users.find((u) => u.id === r.id)) === 'Not submitted'; })());
check('suspension needs a reason', !run(A.setUserStatus, { userId: 'C1', status: 'Suspended', note: '' }).ok);
check('admin cannot be suspended', !run(A.setUserStatus, { userId: 'A1', status: 'Suspended', note: 'x' }).ok);
check('admin suspends and reactivates', run(A.setUserStatus, { userId: 'C1', status: 'Suspended', note: 'Fraud report' }).ok && db.users.find((u) => u.id === 'C1').status === 'Suspended'
  && run(A.setUserStatus, { userId: 'C1', status: 'Active' }).ok && db.users.find((u) => u.id === 'C1').status === 'Active');
const an = computeAnalytics(db);
check('analytics: users total excludes admin and equals role sum', an.users.total === an.users.byRole.reduce((n, r) => n + r.value, 0) && an.users.total === db.users.filter((u) => u.role !== 'Admin').length);
check('analytics: KYC counts sum to users', an.users.kyc.reduce((n, r) => n + r.value, 0) === an.users.total);
check('analytics: order value excludes rejected and cancelled', an.market.gmv === db.orders.filter((o) => !['Rejected', 'Cancelled'].includes(o.status)).reduce((n, o) => n + o.totalAmount, 0));
check('analytics: order status counts sum to orders', an.market.ordersByStatus.reduce((n, r) => n + r.value, 0) === db.orders.length);
check('analytics: storage utilisation matches facilities', an.storage.usedCapacity === db.storages.reduce((n, s) => n + s.totalCapacity - s.availableCapacity, 0));
check('analytics: transport funnel is non-increasing', an.transport.posted >= an.transport.withBids && an.transport.withBids >= an.transport.confirmed);
check('analytics: activity is newest first', an.activity.every((e, i, arr) => i === 0 || arr[i - 1].timestamp >= e.timestamp));
// ---------- recommended prices ----------
{
  const seed = buildSeed();
  const dist = roadDistanceKm('Nashik, Maharashtra', 'Mumbai, Maharashtra');
  check('distance: Nashik to Mumbai is plausible', dist > 120 && dist < 220);
  check('distance: unknown city gives null', roadDistanceKm('Nowhereville', 'Mumbai') === null);
  const t = recommendTransportPrice(seed, { pickup: 'Nashik, Maharashtra', destination: 'Mumbai, Maharashtra', loadTonnes: 4, vehicleType: 'Refrigerated Truck' });
  check('transport: recommends a price inside its range', t.price > 0 && t.low <= t.price && t.price <= t.high);
  check('transport: refrigerated rate comes from reefer vehicles', t.rate === 41);
  const small = recommendTransportPrice(seed, { pickup: 'Pune, Maharashtra', destination: 'Pune, Maharashtra', loadTonnes: 0.5, vehicleType: '' });
  check('transport: small load priced like a mini truck, minimum trip applies', small.rate === 19 && small.billedKm === 40);
  check('transport: no vehicle fits a 40 t load', Boolean(recommendTransportPrice(seed, { pickup: 'Pune', destination: 'Mumbai', loadTonnes: 40, vehicleType: '' }).reason));
  check('transport: unknown route gives a reason, no price', Boolean(recommendTransportPrice(seed, { pickup: 'Pune', destination: 'Nowhereville', loadTonnes: 1, vehicleType: '' }).reason));
  const sp = recommendStoragePrice(seed, { city: 'Pune', storageType: 'Cold storage' });
  check('storage: same-city cold storage uses that facility price', sp.price === 52 && sp.count === 1);
  const sw = recommendStoragePrice(seed, { city: 'Nashik', storageType: 'Silo' });
  check('storage: falls back to other cities when none in city or state', sw.price === 8 && /across all/.test(sw.basis));
  const ss = recommendStoragePrice(seed, { city: 'Satara', storageType: 'Cold storage' });
  check('storage: falls back to the same state', ss.price === 49 && ss.count === 2);
  const none = recommendStoragePrice({ ...seed, storages: [] }, { city: 'Pune', storageType: '' });
  check('storage: no facilities gives a reason', Boolean(none.reason));
}
check('final integrity', checkIntegrity(db).length === 0);
if (checkIntegrity(db).length) console.log(checkIntegrity(db));
console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
process.exit(failures ? 1 : 0);
