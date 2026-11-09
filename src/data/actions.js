// Mock API layer: pure business-logic functions over the central db object (SRS SH-4).
// Every action is (db, args) => { db, result }, where result is { ok, error?, id? }.
// The UI never edits records directly, so all modules stay consistent with one another.

import { kycStatus, initialKycStatus } from '../lib/kyc.js';
import {
  splitAmount, round2, isCod, COD, methodsFor, walletOf, MIN_PAYOUT, AUTO_RELEASE_DAYS,
  validatePayoutAccount, normalizePayoutAccount, describeAccount, RECEIVER_ROLES,
} from '../lib/payments.js';

export const SHIPMENT_FLOW = ['Assigned', 'Picked up', 'In transit', 'Delivered'];
const PROGRESS = { Assigned: 10, 'Picked up': 35, 'In transit': 70, Delivered: 100 };

const fail = (db, error) => ({ db, result: { ok: false, error } });
const done = (db, extra = {}) => ({ db, result: { ok: true, ...extra } });

const nextId = (prefix, rows, start = 1000) => {
  const max = rows.reduce((m, r) => {
    const n = parseInt(String(r.id).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, start);
  return `${prefix}${max + 1}`;
};

const logEvent = (db, entityType, entityId, status, note) => ({
  ...db,
  events: [...db.events, {
    id: nextId('EV', db.events, 0), entityType, entityId, status, timestamp: new Date().toISOString(), note,
  }],
});

const patch = (rows, id, changes, key = 'id') => rows.map((r) => (r[key] === id ? { ...r, ...changes } : r));

const addDays = (iso, days) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------- Payment ledger helpers ----------
// Every payment keeps its own history (an audit trail) and important steps also go to the activity log.
const stamp = () => new Date().toISOString();

const addPayment = (db, { kind, refId, orderId = null, payerId, payeeId, amount, method = 'UPI' }) => {
  const id = nextId('P', db.payments, 2000);
  const total = round2(amount);
  const at = stamp();
  const payment = {
    id, kind, refId, orderId, payerId, payeeId, amount: total, ...splitAmount(kind, total), method, status: 'Pending',
    attempts: 0, createdAt: at, history: [{ at, status: 'Pending', note: 'Payment requested' }],
  };
  return { db: logEvent({ ...db, payments: [...db.payments, payment] }, 'Payment', id, 'Pending', `${kind} payment of ${total} requested`), id };
};

// Changes a payment, appends to its history and logs it. `silent` skips the activity log (for failed attempts).
const record = (db, id, changes, note, silent = false) => {
  const p = db.payments.find((x) => x.id === id);
  const status = changes.status ?? p.status;
  const at = stamp();
  const next = { ...db, payments: patch(db.payments, id, { ...changes, history: [...(p.history || []), { at, status, note }] }) };
  return silent ? next : logEvent(next, 'Payment', id, status, note);
};

const releaseHeld = (db, id, note) => {
  const p = db.payments.find((x) => x.id === id);
  return p && p.status === 'In escrow' ? record(db, id, { status: 'Paid', releasedAt: stamp(), autoReleaseAt: null }, note) : db;
};

const refundHeld = (db, id, note) => {
  const p = db.payments.find((x) => x.id === id);
  return p && p.status === 'In escrow' ? record(db, id, { status: 'Refunded', refundedAt: stamp(), autoReleaseAt: null }, note) : db;
};

// When an order is rejected or cancelled: money already in escrow goes back, an unpaid request is closed.
const closeOrderPayment = (db, orderId, why) => {
  const p = db.payments.find((x) => x.kind === 'Order' && x.orderId === orderId);
  if (!p) return db;
  if (p.status === 'In escrow') return refundHeld(db, p.id, `Refunded to the buyer: ${why}`);
  if (p.status === 'Pending') return record(db, p.id, { status: 'Failed' }, `Closed without payment: ${why}`);
  return db;
};

// ---------- Users ----------
export const addUser = (db, { user, facility, vehicle }) => {
  if (db.users.some((x) => x.email.toLowerCase() === user.email.toLowerCase())) {
    return fail(db, 'An account with this email already exists.');
  }
  const prefix = { Farmer: 'F', Customer: 'C', Transporter: 'T', StorageOwner: 'S', Admin: 'A' }[user.role];
  const sameRole = db.users.filter((x) => x.role === user.role);
  const id = nextId(prefix, sameRole, 0);
  const created = { ...user, id, verified: false, status: 'Active', kycStatus: initialKycStatus(user) };
  let next = { ...db, users: [...db.users, created] };
  if (facility) {
    next = { ...next, storages: [...next.storages, { ...facility, id: nextId('ST', next.storages, 0), ownerId: id }] };
  }
  if (vehicle) {
    next = { ...next, vehicles: [...next.vehicles, { ...vehicle, id: nextId('V', next.vehicles, 0), ownerId: id }] };
  }
  return done(next, { id });
};

export const updateUser = (db, { id, changes }) => done({ ...db, users: patch(db.users, id, changes) });

// ---------- KYC and account administration ----------
// A user submits (or resubmits) KYC. Farmers send documents; other roles send a short details text.
export const submitKyc = (db, { userId, kyc }) => {
  const user = db.users.find((x) => x.id === userId);
  if (!user || user.role === 'Admin') return fail(db, 'Account not found.');
  if (user.role === 'Farmer' && !kyc?.landProof) return fail(db, 'Land ownership proof is required for KYC.');
  if (user.role !== 'Farmer' && !String(kyc?.summary || '').trim()) return fail(db, 'Enter your KYC details.');
  const stored = user.role === 'Farmer' ? kyc : { summary: kyc.summary.trim(), submittedAt: new Date().toISOString() };
  const next = { ...db, users: patch(db.users, userId, { kyc: stored, kycStatus: 'Under review', verified: false, kycNote: '' }) };
  return done(logEvent(next, 'User', userId, 'Under review', 'KYC submitted for review'));
};

// Admin approves or rejects a submission. A rejection needs a reason so the user knows what to fix.
export const reviewKyc = (db, { userId, approve, note }) => {
  const user = db.users.find((x) => x.id === userId);
  if (!user || user.role === 'Admin') return fail(db, 'Account not found.');
  if (kycStatus(user) !== 'Under review') return fail(db, 'This account has no KYC waiting for review.');
  if (!approve && !String(note || '').trim()) return fail(db, 'Give a reason so the user knows what to fix.');
  const changes = approve
    ? { kycStatus: 'Verified', verified: true, kycNote: String(note || '').trim() }
    : { kycStatus: 'Rejected', verified: false, kycNote: note.trim() };
  const next = { ...db, users: patch(db.users, userId, changes) };
  return done(logEvent(next, 'User', userId, approve ? 'Verified' : 'Rejected', approve ? 'KYC approved by admin' : `KYC rejected: ${changes.kycNote}`));
};

export const setUserStatus = (db, { userId, status, note }) => {
  const user = db.users.find((x) => x.id === userId);
  if (!user || user.role === 'Admin') return fail(db, 'Administrator accounts cannot be changed here.');
  if (!['Active', 'Suspended'].includes(status)) return fail(db, 'Unknown status.');
  if (status === 'Suspended' && !String(note || '').trim()) return fail(db, 'Give a reason for the suspension.');
  const next = { ...db, users: patch(db.users, userId, { status, statusNote: status === 'Suspended' ? note.trim() : '' }) };
  return done(logEvent(next, 'User', userId, status, status === 'Suspended' ? `Suspended: ${note.trim()}` : 'Account reactivated'));
};

// ---------- Farmer: listings ----------
const badStorage = (db, storage) => {
  if (!storage) return null;
  if (storage.mode === 'provider' && !db.storages.some((s) => s.id === storage.storageId)) {
    return 'Choose a valid storage facility.';
  }
  return null;
};

export const addListing = (db, listing) => {
  const problem = badStorage(db, listing.storage);
  if (problem) return fail(db, problem);
  const id = nextId('L', db.listings, 100);
  return done({ ...db, listings: [...db.listings, { ...listing, id }] }, { id });
};

export const updateListing = (db, { id, changes }) => {
  const problem = badStorage(db, changes.storage);
  if (problem) return fail(db, problem);
  const merged = { ...changes };
  if (merged.quantity !== undefined && Number(merged.quantity) <= 0) merged.availability = 'Out of stock';
  return done({ ...db, listings: patch(db.listings, id, merged) });
};

const OPEN_ORDER = ['Placed', 'Accepted', 'In transit'];

export const deleteListing = (db, { id }) => {
  if (db.orders.some((o) => o.listingId === id && OPEN_ORDER.includes(o.status))) {
    return fail(db, 'This listing has open orders. Resolve them before deleting.');
  }
  return done({ ...db, listings: db.listings.filter((x) => x.id !== id) });
};

// ---------- Customer: orders and enquiries ----------
export const placeOrder = (db, { customerId, listingId, quantity }) => {
  const listing = db.listings.find((x) => x.id === listingId);
  const qty = Number(quantity);
  if (!listing) return fail(db, 'Listing not found.');
  if (!(qty > 0)) return fail(db, 'Enter a valid quantity.');
  if (listing.availability === 'Out of stock' || qty > listing.quantity) {
    return fail(db, `Only ${listing.quantity} ${listing.unit} available.`);
  }
  const id = nextId('O', db.orders, 1000);
  const order = {
    id, customerId, listingId, farmerId: listing.farmerId, quantity: qty, unit: listing.unit,
    totalAmount: qty * listing.price, status: 'Placed', createdAt: new Date().toISOString(),
  };
  let next = { ...db, orders: [...db.orders, order] };
  next = addPayment(next, { kind: 'Order', refId: id, orderId: id, payerId: customerId, payeeId: listing.farmerId, amount: order.totalAmount }).db;
  next = logEvent(next, 'Order', id, 'Placed', 'Order placed by customer');
  return done(next, { id });
};

export const sendEnquiry = (db, { customerId, listingId, message }) => {
  const listing = db.listings.find((x) => x.id === listingId);
  if (!listing) return fail(db, 'Listing not found.');
  if (!message.trim()) return fail(db, 'Write a message first.');
  const id = nextId('E', db.enquiries, 3000);
  const enquiry = { id, customerId, listingId, farmerId: listing.farmerId, message: message.trim(), reply: '', status: 'Open', createdAt: new Date().toISOString() };
  return done({ ...db, enquiries: [...db.enquiries, enquiry] }, { id });
};

export const replyEnquiry = (db, { id, reply }) => {
  if (!reply.trim()) return fail(db, 'Write a reply first.');
  return done({ ...db, enquiries: patch(db.enquiries, id, { reply: reply.trim(), status: 'Replied' }) });
};

// ---------- Payments: pay, escrow, release, refund ----------
// The payer's money is first held in escrow. It reaches the payee's wallet when the service is delivered
// (see updateShipment, confirmReceipt, completeStorage). The gateway call itself happens in the UI
// (src/lib/gateway.js); these actions record the outcome.
export const makePayment = (db, { paymentId, payerId, method, gatewayRef, instrument }) => {
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p || p.payerId !== payerId) return fail(db, 'Payment record not found.');
  if (['In escrow', 'Disputed', 'Paid'].includes(p.status)) return fail(db, 'This payment has already been made.');
  if (['Refunded', 'Failed'].includes(p.status)) return fail(db, 'This payment is closed.');
  if (!methodsFor(p.kind).includes(method)) return fail(db, 'That payment method is not available for this payment.');

  let delivered = false;
  if (p.kind === 'Order') {
    const order = db.orders.find((x) => x.id === p.orderId);
    if (!order || ['Rejected', 'Cancelled'].includes(order.status)) return fail(db, 'This order is closed.');
    delivered = order.status === 'Delivered';
  } else if (p.kind === 'Transport') {
    delivered = db.shipments.find((s) => s.trackingId === p.refId)?.status === 'Delivered';
  } else {
    const req = db.storageRequests.find((r) => r.id === p.refId);
    if (!req || req.status === 'Cancelled') return fail(db, 'This booking is closed.');
    delivered = req.status === 'Completed';
  }

  if (method === COD) {
    if (p.kind !== 'Order') return fail(db, 'Cash on delivery is only available for produce orders.');
    return done(record(db, p.id, { method: COD }, 'Cash on delivery chosen: the buyer pays the driver on arrival'), { id: p.id, status: 'Pending' });
  }

  const until = p.kind === 'Order' ? 'the buyer confirms receipt' : p.kind === 'Transport' ? 'the shipment is delivered' : 'the storage booking is completed';
  let next = record(db, p.id, { method, instrument: instrument || method, gatewayRef: gatewayRef || null, paidAt: stamp(), status: 'In escrow' },
    `Payment received via ${instrument || method}. Held in escrow until ${until}`);
  if (delivered) {
    if (p.kind === 'Order') next = record(next, p.id, { autoReleaseAt: new Date(Date.now() + AUTO_RELEASE_DAYS * 864e5).toISOString() }, 'Order already delivered: releases once the buyer confirms');
    else next = releaseHeld(next, p.id, 'Service already delivered: released to the payee');
  }
  return done(next, { id: p.id, status: next.payments.find((x) => x.id === p.id).status });
};

// Back-compat wrapper used by older callers: pay the payment that belongs to an order.
export const payOrder = (db, { orderId, method, gatewayRef, instrument }) => {
  const pay = db.payments.find((x) => x.kind === 'Order' && x.orderId === orderId);
  if (!pay) return fail(db, 'Payment record not found.');
  return makePayment(db, { paymentId: pay.id, payerId: pay.payerId, method, gatewayRef, instrument });
};

// A declined or abandoned attempt. The payment stays Pending so the payer can try again.
export const recordPaymentFailure = (db, { paymentId, payerId, method, reason }) => {
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p || p.payerId !== payerId || p.status !== 'Pending') return fail(db, 'Payment record not found.');
  return done(record(db, p.id, { attempts: (p.attempts || 0) + 1, lastFailure: reason }, `Attempt failed (${method}): ${reason}`, true));
};

// Buyer confirms the goods arrived: escrow is released to the farmer.
export const confirmReceipt = (db, { paymentId, userId }) => {
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p || p.kind !== 'Order' || p.payerId !== userId) return fail(db, 'Payment record not found.');
  const order = db.orders.find((x) => x.id === p.orderId);
  if (order?.status !== 'Delivered') return fail(db, 'You can confirm receipt once the order is delivered.');
  if (p.status === 'Disputed') return fail(db, 'This payment is under dispute. The admin will resolve it.');
  if (p.status !== 'In escrow') return fail(db, 'There is no held payment to release.');
  return done(releaseHeld(db, p.id, 'Buyer confirmed receipt: released to the farmer'));
};

// Releases order payments whose confirmation window has passed. The app calls this when it loads.
export const autoRelease = (db, { now = new Date().toISOString() } = {}) => {
  let next = db;
  let released = 0;
  db.payments.forEach((p) => {
    if (p.status === 'In escrow' && p.autoReleaseAt && p.autoReleaseAt <= now) {
      next = releaseHeld(next, p.id, `Released automatically: no issue reported within ${AUTO_RELEASE_DAYS} days of delivery`);
      released += 1;
    }
  });
  return done(next, { released });
};

export const raiseDispute = (db, { paymentId, userId, reason }) => {
  const p = db.payments.find((x) => x.id === paymentId);
  if (!p || p.payerId !== userId) return fail(db, 'Payment record not found.');
  if (p.status !== 'In escrow') return fail(db, 'A dispute can only be raised while the money is held in escrow.');
  if (String(reason || '').trim().length < 10) return fail(db, 'Describe the problem in a few words so the admin can decide.');
  const id = nextId('D', db.disputes, 6000);
  const dispute = {
    id, paymentId, raisedBy: userId, against: p.payeeId, reason: reason.trim(), status: 'Open',
    createdAt: stamp(), resolution: null, adminNote: '', resolvedAt: null,
  };
  let next = { ...db, disputes: [...db.disputes, dispute] };
  next = record(next, paymentId, { status: 'Disputed', autoReleaseAt: null }, `Dispute ${id} raised: ${dispute.reason}`);
  return done(logEvent(next, 'Dispute', id, 'Open', `Dispute raised on payment ${paymentId}`), { id });
};

// Admin decides: give the money back to the payer, or release it to the payee.
export const resolveDispute = (db, { disputeId, resolution, note }) => {
  const d = db.disputes.find((x) => x.id === disputeId);
  if (!d || d.status !== 'Open') return fail(db, 'This dispute is already resolved.');
  if (!['refund', 'release'].includes(resolution)) return fail(db, 'Choose refund or release.');
  if (!String(note || '').trim()) return fail(db, 'Add a note explaining the decision.');
  const p = db.payments.find((x) => x.id === d.paymentId);
  if (!p || p.status !== 'Disputed') return fail(db, 'The payment is no longer under dispute.');
  const refund = resolution === 'refund';
  let next = record(db, p.id, refund ? { status: 'Refunded', refundedAt: stamp() } : { status: 'Paid', releasedAt: stamp() },
    refund ? `Dispute ${d.id} resolved: refunded to the payer` : `Dispute ${d.id} resolved: released to the payee`);
  next = {
    ...next,
    disputes: patch(next.disputes, d.id, { status: 'Resolved', resolution: refund ? 'Refunded to payer' : 'Released to payee', adminNote: note.trim(), resolvedAt: stamp() }),
  };
  return done(logEvent(next, 'Dispute', d.id, 'Resolved', refund ? 'Refunded to the payer' : 'Released to the payee'));
};

// ---------- Payouts: payees withdraw their wallet balance ----------
export const savePayoutAccount = (db, { userId, account }) => {
  const user = db.users.find((x) => x.id === userId);
  if (!user || !RECEIVER_ROLES.includes(user.role)) return fail(db, 'This account does not receive payments.');
  const problem = validatePayoutAccount(account);
  if (problem) return fail(db, problem);
  return done({ ...db, users: patch(db.users, userId, { payoutAccount: normalizePayoutAccount(account) }) });
};

export const requestPayout = (db, { userId, amount }) => {
  const user = db.users.find((x) => x.id === userId);
  if (!user || !RECEIVER_ROLES.includes(user.role)) return fail(db, 'This account does not receive payments.');
  if (!user.payoutAccount) return fail(db, 'Save a bank account or UPI id first.');
  const value = round2(amount);
  if (!(value >= MIN_PAYOUT)) return fail(db, `The minimum withdrawal is ${MIN_PAYOUT} rupees.`);
  const { available } = walletOf(db, userId);
  if (value > available) return fail(db, `You can withdraw up to ${available} rupees.`);
  const id = nextId('PO', db.payouts, 7000);
  const payout = { id, userId, amount: value, destination: describeAccount(user.payoutAccount), status: 'Processing', requestedAt: stamp(), processedAt: null, reference: null, note: '' };
  return done(logEvent({ ...db, payouts: [...db.payouts, payout] }, 'Payout', id, 'Processing', `Withdrawal of ${value} requested`), { id });
};

// Admin approves (money sent) or rejects (money returns to the wallet) a withdrawal.
export const processPayout = (db, { payoutId, approve, note, reference }) => {
  const x = db.payouts.find((y) => y.id === payoutId);
  if (!x || x.status !== 'Processing') return fail(db, 'This withdrawal is already processed.');
  if (!approve && !String(note || '').trim()) return fail(db, 'Give a reason so the user knows what to fix.');
  const changes = approve
    ? { status: 'Paid', processedAt: stamp(), reference: reference || `UTR${Date.now()}`, note: String(note || '').trim() }
    : { status: 'Failed', processedAt: stamp(), note: note.trim() };
  const next = { ...db, payouts: patch(db.payouts, payoutId, changes) };
  return done(logEvent(next, 'Payout', payoutId, changes.status, approve ? 'Withdrawal paid out' : `Withdrawal rejected: ${changes.note}`));
};

export const cancelOrder = (db, { orderId }) => {
  const order = db.orders.find((x) => x.id === orderId);
  if (!order) return fail(db, 'Order not found.');
  if (order.status !== 'Placed') return fail(db, 'Only orders not yet accepted can be cancelled.');
  let next = { ...db, orders: patch(db.orders, orderId, { status: 'Cancelled' }) };
  next = closeOrderPayment(next, orderId, 'order cancelled by the buyer');
  return done(logEvent(next, 'Order', orderId, 'Cancelled', 'Cancelled by customer'));
};

// ---------- Farmer: respond to order ----------
export const respondOrder = (db, { orderId, accept, reason }) => {
  const order = db.orders.find((x) => x.id === orderId);
  if (!order || order.status !== 'Placed') return fail(db, 'Order is no longer awaiting a response.');
  if (!accept) {
    let next = { ...db, orders: patch(db.orders, orderId, { status: 'Rejected' }) };
    next = closeOrderPayment(next, orderId, 'order rejected by the farmer');
    return done(logEvent(next, 'Order', orderId, 'Rejected', `Rejected by farmer${reason ? `: ${reason}` : ''}`));
  }
  const listing = db.listings.find((x) => x.id === order.listingId);
  if (!listing || listing.quantity < order.quantity) return fail(db, 'Not enough stock left in the listing.');
  const left = listing.quantity - order.quantity;
  let next = {
    ...db,
    orders: patch(db.orders, orderId, { status: 'Accepted' }),
    listings: patch(db.listings, listing.id, { quantity: left, availability: left === 0 ? 'Out of stock' : listing.availability }),
  };
  next = logEvent(next, 'Order', orderId, 'Accepted', 'Accepted by farmer');
  return done(next);
};

// ---------- Transport: request -> provider bids -> farmer selects ----------
// A farmer posts a request with an offered price for the whole trip (INR). Each transporter may bid once per
// request: accept the offered price, or counter with their own. The farmer can re-price an open request; bids
// that had accepted the old price become 'Outdated' until the transporter re-confirms.
const OPEN_BID = ['Pending', 'Outdated'];

const outdateAcceptBids = (bids, field, requestId) => bids.map((b) => (
  b[field] === requestId && b.kind === 'accept' && b.status === 'Pending' ? { ...b, status: 'Outdated' } : b
));

const closeOpenBids = (bids, requestId, keepId, status = 'Rejected') => bids.map((b) => (
  b.requestId === requestId && b.id !== keepId && OPEN_BID.includes(b.status) ? { ...b, status } : b
));

const tonnesOf = (qty, unit) => Math.round(Number(qty) * ({ quintal: 0.1, kg: 0.001, tonne: 1 }[unit] ?? 0.1) * 100) / 100;

export const createTransportRequest = (db, { farmerId, orderId, date, vehicleType, notes, offeredPrice }) => {
  const order = db.orders.find((x) => x.id === orderId);
  if (!order || order.farmerId !== farmerId) return fail(db, 'Order not found.');
  if (order.status !== 'Accepted') return fail(db, 'Transport can only be requested for accepted orders.');
  if (db.transportRequests.some((r) => r.orderId === orderId && ['Open', 'Confirmed'].includes(r.status))) {
    return fail(db, 'A transport request is already active for this order.');
  }
  const price = Number(offeredPrice);
  if (!(price > 0)) return fail(db, 'Enter the price you are offering for this trip.');
  if (!date) return fail(db, 'Choose a pickup date.');
  const listing = db.listings.find((x) => x.id === order.listingId);
  const customer = db.users.find((x) => x.id === order.customerId);
  const id = nextId('TQ', db.transportRequests, 4000);
  const req = {
    id, orderId, farmerId, pickup: listing.location, destination: customer.location, quantity: order.quantity,
    unit: order.unit, loadTonnes: tonnesOf(order.quantity, order.unit), date, vehicleType: vehicleType || '',
    notes: (notes || '').trim(), offeredPrice: price, status: 'Open', selectedBidId: null, agreedPrice: null,
    createdAt: new Date().toISOString(),
  };
  const next = { ...db, transportRequests: [...db.transportRequests, req] };
  return done(logEvent(next, 'TransportRequest', id, 'Open', `Transport requested, offering ${price}`), { id });
};

export const updateTransportRequest = (db, { id, changes }) => {
  const req = db.transportRequests.find((x) => x.id === id);
  if (!req || req.status !== 'Open') return fail(db, 'Only open requests can be edited.');
  const edit = {};
  if (changes.offeredPrice !== undefined) {
    if (!(Number(changes.offeredPrice) > 0)) return fail(db, 'Enter a valid price.');
    edit.offeredPrice = Number(changes.offeredPrice);
  }
  ['date', 'vehicleType', 'notes'].forEach((k) => { if (changes[k] !== undefined) edit[k] = changes[k]; });
  const repriced = edit.offeredPrice !== undefined && edit.offeredPrice !== req.offeredPrice;
  const retimed = edit.date !== undefined && edit.date !== req.date;
  let next = { ...db, transportRequests: patch(db.transportRequests, id, edit) };
  if (repriced || retimed) next = { ...next, transportBids: outdateAcceptBids(next.transportBids, 'requestId', id) };
  if (repriced) next = logEvent(next, 'TransportRequest', id, 'Open', `Offered price changed from ${req.offeredPrice} to ${edit.offeredPrice}`);
  return done(next);
};

export const cancelTransportRequest = (db, { id }) => {
  const req = db.transportRequests.find((x) => x.id === id);
  if (!req || req.status !== 'Open') return fail(db, 'Only open requests can be cancelled.');
  const next = {
    ...db,
    transportRequests: patch(db.transportRequests, id, { status: 'Cancelled' }),
    transportBids: closeOpenBids(db.transportBids, id, null),
  };
  return done(logEvent(next, 'TransportRequest', id, 'Cancelled', 'Cancelled by farmer'));
};

export const submitTransportBid = (db, { requestId, transporterId, vehicleId, kind, price, etaDays, note }) => {
  const req = db.transportRequests.find((x) => x.id === requestId);
  if (!req || req.status !== 'Open') return fail(db, 'This request is no longer open.');
  const vehicle = db.vehicles.find((v) => v.id === vehicleId && v.ownerId === transporterId);
  if (!vehicle) return fail(db, 'Choose one of your vehicles.');
  if (vehicle.availability !== 'Available') return fail(db, 'That vehicle is not available right now.');
  if (vehicle.loadCapacity < req.loadTonnes) return fail(db, `That vehicle carries ${vehicle.loadCapacity} t but the load is ${req.loadTonnes} t.`);
  if (req.vehicleType && vehicle.vehicleType !== req.vehicleType) return fail(db, `The farmer needs a ${req.vehicleType}.`);
  const finalPrice = kind === 'accept' ? req.offeredPrice : Number(price);
  if (!(finalPrice > 0)) return fail(db, 'Enter your price for this trip.');
  const fields = { vehicleId, kind, price: finalPrice, etaDays: Math.max(1, Number(etaDays) || 1), note: (note || '').trim(), status: 'Pending' };
  const existing = db.transportBids.find((b) => b.requestId === requestId && b.transporterId === transporterId
    && ['Pending', 'Outdated', 'Withdrawn'].includes(b.status));
  if (existing) return done({ ...db, transportBids: patch(db.transportBids, existing.id, { ...fields, updatedAt: new Date().toISOString() }) }, { id: existing.id });
  const id = nextId('TB', db.transportBids, 4000);
  return done({ ...db, transportBids: [...db.transportBids, { id, requestId, transporterId, ...fields, createdAt: new Date().toISOString() }] }, { id });
};

export const withdrawTransportBid = (db, { bidId, transporterId }) => {
  const bid = db.transportBids.find((b) => b.id === bidId && b.transporterId === transporterId);
  const req = bid && db.transportRequests.find((r) => r.id === bid.requestId);
  if (!bid || !OPEN_BID.includes(bid.status) || req?.status !== 'Open') return fail(db, 'This bid can no longer be withdrawn.');
  return done({ ...db, transportBids: patch(db.transportBids, bidId, { status: 'Withdrawn' }) });
};

export const selectTransportBid = (db, { bidId, farmerId }) => {
  const bid = db.transportBids.find((b) => b.id === bidId);
  const req = bid && db.transportRequests.find((r) => r.id === bid.requestId);
  if (!bid || !req || req.farmerId !== farmerId) return fail(db, 'Bid not found.');
  if (req.status !== 'Open') return fail(db, 'This request is already closed.');
  if (bid.status === 'Outdated') return fail(db, 'You changed the price. This transporter must re-confirm before you can select them.');
  if (bid.status !== 'Pending') return fail(db, 'This bid is no longer active.');
  const vehicle = db.vehicles.find((v) => v.id === bid.vehicleId);
  if (!vehicle || vehicle.availability !== 'Available') return fail(db, 'That vehicle has just been booked elsewhere. Choose another bid.');
  const trackingId = `TRK-${nextId('', db.shipments.map((x) => ({ id: x.trackingId })), 24000)}`;
  const shipment = {
    trackingId, requestId: req.id, bidId, orderId: req.orderId, transporterId: bid.transporterId, vehicleId: bid.vehicleId,
    agreedPrice: bid.price, status: 'Assigned', pickup: req.pickup, destination: req.destination,
    eta: addDays(req.date, bid.etaDays || 2), progress: PROGRESS.Assigned,
  };
  let next = {
    ...db,
    transportRequests: patch(db.transportRequests, req.id, { status: 'Confirmed', selectedBidId: bidId, agreedPrice: bid.price }),
    transportBids: closeOpenBids(patch(db.transportBids, bidId, { status: 'Selected' }), req.id, bidId),
    shipments: [...db.shipments, shipment],
    vehicles: patch(db.vehicles, vehicle.id, { availability: 'On trip' }),
  };
  next = logEvent(next, 'TransportRequest', req.id, 'Confirmed', `Transporter selected at ${bid.price}`);
  next = logEvent(next, 'Shipment', trackingId, 'Assigned', 'Vehicle assigned');
  // The farmer now owes the agreed fare. It is held in escrow once paid and released on delivery.
  next = addPayment(next, { kind: 'Transport', refId: trackingId, payerId: req.farmerId, payeeId: bid.transporterId, amount: bid.price }).db;
  return done(next, { id: trackingId });
};

export const updateShipment = (db, { trackingId }) => {
  const sh = db.shipments.find((x) => x.trackingId === trackingId);
  if (!sh) return fail(db, 'Shipment not found.');
  const idx = SHIPMENT_FLOW.indexOf(sh.status);
  if (idx === SHIPMENT_FLOW.length - 1) return fail(db, 'Shipment is already delivered.');
  const status = SHIPMENT_FLOW[idx + 1];
  let next = { ...db, shipments: patch(db.shipments, trackingId, { status, progress: PROGRESS[status] }, 'trackingId') };
  next = logEvent(next, 'Shipment', trackingId, status, { 'Picked up': `Picked up from ${sh.pickup}`, 'In transit': `En route to ${sh.destination}`, Delivered: 'Delivered to buyer' }[status]);
  if (status === 'Picked up' || status === 'In transit') {
    next = { ...next, orders: patch(next.orders, sh.orderId, { status: 'In transit' }) };
    if (status === 'Picked up') next = logEvent(next, 'Order', sh.orderId, 'In transit', 'Goods picked up for delivery');
  }
  if (status === 'Delivered') {
    next = {
      ...next,
      orders: patch(next.orders, sh.orderId, { status: 'Delivered' }),
      transportRequests: patch(next.transportRequests, sh.requestId, { status: 'Completed' }),
      vehicles: patch(next.vehicles, sh.vehicleId, { availability: 'Available' }),
    };
    // Money: cash on delivery is collected by the driver now; escrowed orders wait for the buyer's confirmation
    // (or the auto-release date); the transport fare is released to the transporter.
    const orderPay = next.payments.find((p) => p.kind === 'Order' && p.orderId === sh.orderId);
    if (orderPay?.status === 'Pending' && isCod(orderPay)) {
      next = record(next, orderPay.id, { status: 'Paid', paidAt: stamp(), releasedAt: stamp() }, 'Cash collected by the driver on delivery');
    } else if (orderPay?.status === 'In escrow') {
      next = record(next, orderPay.id, { autoReleaseAt: new Date(Date.now() + AUTO_RELEASE_DAYS * 864e5).toISOString() },
        `Delivered. Released when the buyer confirms receipt, or automatically after ${AUTO_RELEASE_DAYS} days`);
    }
    const farePay = next.payments.find((p) => p.kind === 'Transport' && p.refId === sh.trackingId);
    if (farePay) next = releaseHeld(next, farePay.id, 'Shipment delivered: fare released to the transporter');
    next = logEvent(next, 'Order', sh.orderId, 'Delivered', 'Order delivered');
  }
  return done(next);
};

export const addVehicle = (db, vehicle) => {
  if (db.vehicles.some((x) => x.regNo.toLowerCase() === vehicle.regNo.toLowerCase())) {
    return fail(db, 'A vehicle with this registration number already exists.');
  }
  const id = nextId('V', db.vehicles, 0);
  return done({ ...db, vehicles: [...db.vehicles, { ...vehicle, id }] }, { id });
};

export const updateVehicle = (db, { id, changes }) => done({ ...db, vehicles: patch(db.vehicles, id, changes) });

export const deleteVehicle = (db, { id }) => {
  if (db.shipments.some((x) => x.vehicleId === id && x.status !== 'Delivered')) {
    return fail(db, 'This vehicle is on an active shipment.');
  }
  const bids = db.transportBids.map((b) => (b.vehicleId === id && OPEN_BID.includes(b.status) ? { ...b, status: 'Withdrawn' } : b));
  return done({ ...db, transportBids: bids, vehicles: db.vehicles.filter((x) => x.id !== id) });
};

// ---------- Storage ----------
export const addFacility = (db, facility) => {
  if (Number(facility.availableCapacity) > Number(facility.totalCapacity)) {
    return fail(db, 'Available capacity cannot exceed total capacity.');
  }
  const id = nextId('ST', db.storages, 0);
  return done({ ...db, storages: [...db.storages, { ...facility, id }] }, { id });
};

export const updateFacility = (db, { id, changes }) => {
  const current = db.storages.find((x) => x.id === id);
  const merged = { ...current, ...changes };
  if (Number(merged.availableCapacity) > Number(merged.totalCapacity)) {
    return fail(db, 'Available capacity cannot exceed total capacity.');
  }
  return done({ ...db, storages: patch(db.storages, id, changes) });
};

export const deleteFacility = (db, { id }) => {
  if (db.storageRequests.some((r) => r.storageId === id && r.status === 'Confirmed')) {
    return fail(db, 'This facility has active bookings.');
  }
  // Listings that pointed at this facility fall back to the farmer's own storage; open bids from it are withdrawn.
  const listings = db.listings.map((l) => (l.storage?.storageId === id ? { ...l, storage: { mode: 'own', note: '' } } : l));
  const bids = db.storageBids.map((b) => (b.storageId === id && OPEN_BID.includes(b.status) ? { ...b, status: 'Withdrawn' } : b));
  return done({ ...db, listings, storageBids: bids, storages: db.storages.filter((x) => x.id !== id) });
};

// ---------- Storage: request -> provider bids -> farmer selects ----------
// Same negotiation as transport. The farmer offers a price in INR per tonne per day; storage owners accept it or
// counter. Selecting a bid reserves the capacity and links the farmer's listing to that facility.
export const createStorageRequest = (db, { farmerId, listingId, quantity, days, startDate, city, storageType, notes, offeredPrice }) => {
  if (!(Number(quantity) > 0) || !(Number(days) > 0)) return fail(db, 'Enter a valid quantity and duration.');
  if (!(Number(offeredPrice) > 0)) return fail(db, 'Enter the price you are offering per tonne per day.');
  if (!startDate) return fail(db, 'Choose the date storage should start.');
  if (!String(city || '').trim()) return fail(db, 'Enter the city where you need storage.');
  if (listingId && !db.listings.some((l) => l.id === listingId && l.farmerId === farmerId)) return fail(db, 'Listing not found.');
  const id = nextId('SQ', db.storageRequests, 5000);
  const req = {
    id, farmerId, listingId: listingId || null, quantity: Number(quantity), days: Number(days), startDate, city: city.trim(),
    storageType: storageType || '', notes: (notes || '').trim(), offeredPrice: Number(offeredPrice), status: 'Open',
    storageId: null, selectedBidId: null, agreedPrice: null, createdAt: new Date().toISOString(),
  };
  const next = { ...db, storageRequests: [...db.storageRequests, req] };
  return done(logEvent(next, 'StorageRequest', id, 'Open', `Storage requested, offering ${req.offeredPrice} per tonne per day`), { id });
};

export const updateStorageRequest = (db, { id, changes }) => {
  const req = db.storageRequests.find((x) => x.id === id);
  if (!req || req.status !== 'Open') return fail(db, 'Only open requests can be edited.');
  const edit = {};
  ['offeredPrice', 'quantity', 'days'].forEach((k) => {
    if (changes[k] !== undefined) {
      if (!(Number(changes[k]) > 0)) edit.__bad = true;
      edit[k] = Number(changes[k]);
    }
  });
  if (edit.__bad) return fail(db, 'Enter valid numbers.');
  ['startDate', 'city', 'storageType', 'notes'].forEach((k) => { if (changes[k] !== undefined) edit[k] = changes[k]; });
  const termsChanged = ['offeredPrice', 'quantity', 'days', 'startDate'].some((k) => edit[k] !== undefined && edit[k] !== req[k]);
  let next = { ...db, storageRequests: patch(db.storageRequests, id, edit) };
  if (termsChanged) next = { ...next, storageBids: outdateAcceptBids(next.storageBids, 'requestId', id) };
  if (edit.offeredPrice !== undefined && edit.offeredPrice !== req.offeredPrice) {
    next = logEvent(next, 'StorageRequest', id, 'Open', `Offered price changed from ${req.offeredPrice} to ${edit.offeredPrice}`);
  }
  return done(next);
};

export const cancelStorageRequest = (db, { id }) => {
  const req = db.storageRequests.find((x) => x.id === id);
  if (!req || req.status !== 'Open') return fail(db, 'Only open requests can be cancelled.');
  const next = {
    ...db,
    storageRequests: patch(db.storageRequests, id, { status: 'Cancelled' }),
    storageBids: closeOpenBids(db.storageBids, id, null),
  };
  return done(logEvent(next, 'StorageRequest', id, 'Cancelled', 'Cancelled by farmer'));
};

export const submitStorageBid = (db, { requestId, ownerId, storageId, kind, price, note }) => {
  const req = db.storageRequests.find((x) => x.id === requestId);
  if (!req || req.status !== 'Open') return fail(db, 'This request is no longer open.');
  const facility = db.storages.find((s) => s.id === storageId && s.ownerId === ownerId);
  if (!facility) return fail(db, 'Choose one of your facilities.');
  if (facility.availability !== 'Available') return fail(db, 'That facility is not accepting bookings.');
  if (facility.availableCapacity < req.quantity) return fail(db, `That facility has only ${facility.availableCapacity} t free; the farmer needs ${req.quantity} t.`);
  const finalPrice = kind === 'accept' ? req.offeredPrice : Number(price);
  if (!(finalPrice > 0)) return fail(db, 'Enter your price per tonne per day.');
  const fields = { storageId, kind, price: finalPrice, note: (note || '').trim(), status: 'Pending' };
  const existing = db.storageBids.find((b) => b.requestId === requestId && b.ownerId === ownerId
    && ['Pending', 'Outdated', 'Withdrawn'].includes(b.status));
  if (existing) return done({ ...db, storageBids: patch(db.storageBids, existing.id, { ...fields, updatedAt: new Date().toISOString() }) }, { id: existing.id });
  const id = nextId('SB', db.storageBids, 5000);
  return done({ ...db, storageBids: [...db.storageBids, { id, requestId, ownerId, ...fields, createdAt: new Date().toISOString() }] }, { id });
};

export const withdrawStorageBid = (db, { bidId, ownerId }) => {
  const bid = db.storageBids.find((b) => b.id === bidId && b.ownerId === ownerId);
  const req = bid && db.storageRequests.find((r) => r.id === bid.requestId);
  if (!bid || !OPEN_BID.includes(bid.status) || req?.status !== 'Open') return fail(db, 'This bid can no longer be withdrawn.');
  return done({ ...db, storageBids: patch(db.storageBids, bidId, { status: 'Withdrawn' }) });
};

export const selectStorageBid = (db, { bidId, farmerId }) => {
  const bid = db.storageBids.find((b) => b.id === bidId);
  const req = bid && db.storageRequests.find((r) => r.id === bid.requestId);
  if (!bid || !req || req.farmerId !== farmerId) return fail(db, 'Bid not found.');
  if (req.status !== 'Open') return fail(db, 'This request is already closed.');
  if (bid.status === 'Outdated') return fail(db, 'You changed the terms. This provider must re-confirm before you can select them.');
  if (bid.status !== 'Pending') return fail(db, 'This bid is no longer active.');
  const facility = db.storages.find((s) => s.id === bid.storageId);
  if (!facility || facility.availability !== 'Available' || facility.availableCapacity < req.quantity) {
    return fail(db, 'That facility no longer has enough free capacity. Choose another bid.');
  }
  const left = facility.availableCapacity - req.quantity;
  let next = {
    ...db,
    storageRequests: patch(db.storageRequests, req.id, { status: 'Confirmed', storageId: facility.id, selectedBidId: bidId, agreedPrice: bid.price }),
    storageBids: closeOpenBids(patch(db.storageBids, bidId, { status: 'Selected' }), req.id, bidId),
    storages: patch(db.storages, facility.id, { availableCapacity: left, availability: left === 0 ? 'Full' : facility.availability }),
    // The linked listing now shows the provider's facility to buyers.
    listings: req.listingId ? patch(db.listings, req.listingId, { storage: { mode: 'provider', storageId: facility.id } }) : db.listings,
  };
  next = logEvent(next, 'StorageRequest', req.id, 'Confirmed', `Farmer selected ${facility.name} at ${bid.price} per tonne per day`);
  // The farmer now owes quantity x days x agreed rate. Held in escrow once paid and released on completion.
  next = addPayment(next, { kind: 'Storage', refId: req.id, payerId: req.farmerId, payeeId: facility.ownerId, amount: req.quantity * req.days * bid.price }).db;
  return done(next);
};

export const completeStorage = (db, { requestId }) => {
  const req = db.storageRequests.find((x) => x.id === requestId);
  if (!req || req.status !== 'Confirmed') return fail(db, 'Only confirmed bookings can be completed.');
  const facility = db.storages.find((x) => x.id === req.storageId);
  const restored = Math.min(facility.totalCapacity, facility.availableCapacity + req.quantity);
  let next = {
    ...db,
    storageRequests: patch(db.storageRequests, requestId, { status: 'Completed' }),
    storages: patch(db.storages, facility.id, { availableCapacity: restored, availability: facility.availability === 'Full' ? 'Available' : facility.availability }),
    // Storage period over: the produce is no longer held at the provider.
    listings: db.listings.map((l) => (l.id === req.listingId && l.storage?.storageId === facility.id ? { ...l, storage: { mode: 'own', note: '' } } : l)),
  };
  const storagePay = next.payments.find((p) => p.kind === 'Storage' && p.refId === requestId);
  if (storagePay) next = releaseHeld(next, storagePay.id, 'Storage completed: charges released to the storage owner');
  return done(logEvent(next, 'StorageRequest', requestId, 'Completed', 'Storage period completed'));
};
