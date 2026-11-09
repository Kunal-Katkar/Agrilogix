// Helpers shared by the transport and storage negotiation screens.

// Vehicles a transporter could offer for a request: theirs, available, big enough, and of the requested type.
export const eligibleVehicles = (db, ownerId, req) => db.vehicles.filter((v) => (
  v.ownerId === ownerId && v.availability === 'Available' && v.loadCapacity >= req.loadTonnes
  && (!req.vehicleType || v.vehicleType === req.vehicleType)
));

// Facilities a storage owner could offer for a request: theirs, available, with enough free capacity.
export const eligibleFacilities = (db, ownerId, req) => db.storages.filter((s) => (
  s.ownerId === ownerId && s.availability === 'Available' && s.availableCapacity >= req.quantity
));

// The bid a provider currently has on a request (not rejected): used to show "Update bid" instead of "Respond".
export const myTransportBid = (db, requestId, transporterId) => db.transportBids.find((b) => (
  b.requestId === requestId && b.transporterId === transporterId && b.status !== 'Rejected'
));
export const myStorageBid = (db, requestId, ownerId) => db.storageBids.find((b) => (
  b.requestId === requestId && b.ownerId === ownerId && b.status !== 'Rejected'
));

// Bids the farmer can act on or compare, cheapest first.
export const liveBids = (bids, requestId) => bids
  .filter((b) => b.requestId === requestId && ['Pending', 'Outdated'].includes(b.status))
  .sort((a, b) => a.price - b.price);

export const storageTotal = (req, price = req.offeredPrice) => req.quantity * req.days * price;
