// Checks the referential-integrity rules of SRS DD-4 / NFR-6. Used by the dev checks and the reset flow.
export function checkIntegrity(db) {
  const errors = [];
  const ids = (rows, key = 'id') => new Set(rows.map((r) => r[key]));
  const users = ids(db.users);
  const listings = ids(db.listings);
  const orders = ids(db.orders);
  const storages = ids(db.storages);
  const vehicles = ids(db.vehicles);

  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  const roleOf = (id) => db.users.find((u) => u.id === id)?.role;

  db.listings.forEach((x) => {
    need(roleOf(x.farmerId) === 'Farmer', `Listing ${x.id}: missing farmer ${x.farmerId}`);
    need(x.storage?.mode !== 'provider' || storages.has(x.storage.storageId), `Listing ${x.id}: missing storage facility`);
  });
  db.orders.forEach((x) => {
    need(roleOf(x.customerId) === 'Customer', `Order ${x.id}: missing customer ${x.customerId}`);
    need(listings.has(x.listingId), `Order ${x.id}: missing listing ${x.listingId}`);
    need(db.listings.find((l) => l.id === x.listingId)?.farmerId === x.farmerId, `Order ${x.id}: farmer mismatch`);
  });
  const shipmentIds = ids(db.shipments, 'trackingId');
  const storageReqIds = ids(db.storageRequests);
  const payerRole = { Order: 'Customer', Transport: 'Farmer', Storage: 'Farmer' };
  const payeeRole = { Order: 'Farmer', Transport: 'Transporter', Storage: 'StorageOwner' };
  db.payments.forEach((x) => {
    need(Boolean(payerRole[x.kind]), `Payment ${x.id}: unknown kind ${x.kind}`);
    need(roleOf(x.payerId) === payerRole[x.kind], `Payment ${x.id}: payer ${x.payerId} is not a ${payerRole[x.kind]}`);
    need(roleOf(x.payeeId) === payeeRole[x.kind], `Payment ${x.id}: payee ${x.payeeId} is not a ${payeeRole[x.kind]}`);
    need(x.kind !== 'Order' || (orders.has(x.orderId) && x.refId === x.orderId), `Payment ${x.id}: missing order ${x.orderId}`);
    need(x.kind !== 'Transport' || shipmentIds.has(x.refId), `Payment ${x.id}: missing shipment ${x.refId}`);
    need(x.kind !== 'Storage' || storageReqIds.has(x.refId), `Payment ${x.id}: missing storage request ${x.refId}`);
    need(Math.abs(x.amount - x.platformFee - x.netAmount) < 0.01, `Payment ${x.id}: amount does not equal fee plus net`);
    need(['Pending', 'In escrow', 'Paid', 'Disputed', 'Refunded', 'Failed'].includes(x.status), `Payment ${x.id}: unknown status ${x.status}`);
    need(x.status !== 'Disputed' || (db.disputes || []).some((d) => d.paymentId === x.id && d.status === 'Open'), `Payment ${x.id}: disputed without an open dispute`);
  });
  const payIds = ids(db.payments);
  (db.disputes || []).forEach((d) => {
    need(payIds.has(d.paymentId), `Dispute ${d.id}: missing payment ${d.paymentId}`);
    need(users.has(d.raisedBy), `Dispute ${d.id}: missing user ${d.raisedBy}`);
  });
  (db.payouts || []).forEach((x) => {
    need(users.has(x.userId), `Payout ${x.id}: missing user ${x.userId}`);
    need(x.amount > 0, `Payout ${x.id}: amount must be positive`);
  });
  db.enquiries.forEach((x) => need(listings.has(x.listingId) && users.has(x.customerId), `Enquiry ${x.id}: broken reference`));
  db.storages.forEach((x) => {
    need(roleOf(x.ownerId) === 'StorageOwner', `Facility ${x.id}: missing owner ${x.ownerId}`);
    need(x.availableCapacity <= x.totalCapacity, `Facility ${x.id}: available exceeds total`);
  });
  db.vehicles.forEach((x) => need(roleOf(x.ownerId) === 'Transporter', `Vehicle ${x.id}: missing owner ${x.ownerId}`));
  const tReqs = ids(db.transportRequests);
  const tBids = ids(db.transportBids);
  db.transportRequests.forEach((x) => {
    need(orders.has(x.orderId), `Transport request ${x.id}: missing order ${x.orderId}`);
    need(roleOf(x.farmerId) === 'Farmer', `Transport request ${x.id}: missing farmer`);
    need(!['Confirmed', 'Completed'].includes(x.status) || tBids.has(x.selectedBidId), `Transport request ${x.id}: missing selected bid`);
  });
  db.transportBids.forEach((x) => {
    need(tReqs.has(x.requestId), `Transport bid ${x.id}: missing request`);
    need(['Rejected', 'Withdrawn'].includes(x.status) || vehicles.has(x.vehicleId), `Transport bid ${x.id}: live bid without vehicle`);
    need(roleOf(x.transporterId) === 'Transporter', `Transport bid ${x.id}: missing transporter`);
  });
  db.shipments.forEach((x) => {
    need(tReqs.has(x.requestId), `Shipment ${x.trackingId}: missing request ${x.requestId}`);
    need(orders.has(x.orderId), `Shipment ${x.trackingId}: missing order ${x.orderId}`);
  });
  const sReqs = ids(db.storageRequests);
  const sBids = ids(db.storageBids);
  db.storageRequests.forEach((x) => {
    need(roleOf(x.farmerId) === 'Farmer', `Storage request ${x.id}: missing farmer ${x.farmerId}`);
    need(!['Confirmed', 'Completed'].includes(x.status) || (storages.has(x.storageId) && sBids.has(x.selectedBidId)), `Storage request ${x.id}: missing facility or bid`);
  });
  db.storageBids.forEach((x) => {
    need(sReqs.has(x.requestId), `Storage bid ${x.id}: missing request`);
    need(['Rejected', 'Withdrawn'].includes(x.status) || storages.has(x.storageId), `Storage bid ${x.id}: live bid without facility`);
    need(roleOf(x.ownerId) === 'StorageOwner', `Storage bid ${x.id}: missing owner`);
  });
  return errors;
}
