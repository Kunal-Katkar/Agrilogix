// MongoDB collections, validators and indexes for AgriLogiX.
// Each collection holds the same documents the prototype's mock API uses, so the future backend can replace
// src/data/actions.js without changing the data shape. The prototype's string ids (F1, L101, TQ4001 ...) are kept as _id.

const str = { bsonType: 'string' };
const num = { bsonType: ['int', 'long', 'double', 'decimal'] };
const strArr = { bsonType: 'array', items: str };
const oneOf = (...v) => ({ bsonType: 'string', enum: v });

const ROLES = ['Farmer', 'Customer', 'Transporter', 'StorageOwner', 'Admin'];
const BID_STATUS = ['Pending', 'Outdated', 'Selected', 'Rejected', 'Withdrawn'];
const REQUEST_STATUS = ['Open', 'Confirmed', 'Completed', 'Cancelled'];
const LIVE_BID = ['Pending', 'Outdated', 'Selected'];

const v = (required, properties) => ({ $jsonSchema: { bsonType: 'object', required, properties } });

export const COLLECTIONS = {
  users: {
    validator: v(['_id', 'role', 'name', 'email', 'passwordHash'], {
      role: oneOf(...ROLES), name: str, email: str, passwordHash: str, location: str,
      verified: { bsonType: 'bool' }, kycStatus: oneOf('Not submitted', 'Under review', 'Verified', 'Rejected'),
      status: oneOf('Active', 'Suspended'),
    }),
    indexes: [
      [{ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } }],
      [{ role: 1 }],
      [{ kycStatus: 1 }],
    ],
  },
  listings: {
    validator: v(['_id', 'farmerId', 'name', 'category', 'price', 'unit', 'quantity', 'location', 'availability'], {
      farmerId: str, name: str, category: str, price: num, unit: str, quantity: num, location: str,
      availability: oneOf('Available', 'Limited', 'Out of stock'),
      storage: { bsonType: 'object', properties: { mode: oneOf('own', 'provider'), storageId: str } },
    }),
    indexes: [[{ farmerId: 1 }], [{ category: 1, availability: 1 }], [{ name: 'text', description: 'text' }]],
  },
  storages: {
    validator: v(['_id', 'ownerId', 'name', 'type', 'location', 'totalCapacity', 'availableCapacity', 'pricePerTonneDay', 'availability'], {
      ownerId: str, name: str, type: str, location: str, totalCapacity: num, availableCapacity: num, pricePerTonneDay: num,
      facilities: strArr, availability: oneOf('Available', 'Full', 'Unavailable'),
    }),
    indexes: [[{ ownerId: 1 }], [{ type: 1, location: 1 }]],
  },
  vehicles: {
    validator: v(['_id', 'ownerId', 'vehicleType', 'regNo', 'loadCapacity', 'pricePerKm', 'availability'], {
      ownerId: str, vehicleType: str, regNo: str, loadCapacity: num, serviceArea: strArr, pricePerKm: num,
      availability: oneOf('Available', 'On trip', 'Unavailable'),
    }),
    indexes: [[{ regNo: 1 }, { unique: true }], [{ ownerId: 1 }], [{ vehicleType: 1, loadCapacity: 1 }]],
  },
  orders: {
    validator: v(['_id', 'customerId', 'listingId', 'farmerId', 'quantity', 'unit', 'totalAmount', 'status', 'createdAt'], {
      customerId: str, listingId: str, farmerId: str, quantity: num, unit: str, totalAmount: num,
      status: oneOf('Placed', 'Accepted', 'In transit', 'Delivered', 'Rejected', 'Cancelled'),
    }),
    indexes: [[{ customerId: 1, createdAt: -1 }], [{ farmerId: 1, status: 1 }], [{ listingId: 1 }]],
  },
  // One document per payment: kind Order (customer -> farmer), Transport (farmer -> transporter) or Storage
  // (farmer -> storage owner). refId is the order id, shipment tracking id or storage request id. Never store card
  // numbers, CVVs or full account numbers: `instrument` holds a masked description only.
  payments: {
    validator: v(['_id', 'kind', 'refId', 'payerId', 'payeeId', 'amount', 'platformFee', 'netAmount', 'status', 'createdAt'], {
      kind: oneOf('Order', 'Transport', 'Storage'), refId: str, orderId: { bsonType: ['string', 'null'] },
      payerId: str, payeeId: str, amount: num, platformFee: num, netAmount: num, method: str, instrument: str, gatewayRef: str,
      status: oneOf('Pending', 'In escrow', 'Paid', 'Disputed', 'Refunded', 'Failed'),
      attempts: num, lastFailure: str,
      history: { bsonType: 'array', items: { bsonType: 'object', properties: { status: str, note: str } } },
    }),
    indexes: [
      [{ kind: 1, refId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'In escrow', 'Paid', 'Disputed'] } } }],
      [{ payerId: 1, status: 1 }], [{ payeeId: 1, status: 1 }], [{ orderId: 1 }], [{ gatewayRef: 1 }, { sparse: true }],
    ],
  },
  disputes: {
    validator: v(['_id', 'paymentId', 'raisedBy', 'reason', 'status'], {
      paymentId: str, raisedBy: str, against: str, reason: str, status: oneOf('Open', 'Resolved'), resolution: { bsonType: ['string', 'null'] }, adminNote: str,
    }),
    indexes: [[{ paymentId: 1 }], [{ status: 1, createdAt: -1 }]],
  },
  payouts: {
    validator: v(['_id', 'userId', 'amount', 'destination', 'status'], {
      userId: str, amount: num, destination: str, status: oneOf('Processing', 'Paid', 'Failed'), reference: { bsonType: ['string', 'null'] }, note: str,
    }),
    indexes: [[{ userId: 1, requestedAt: -1 }], [{ status: 1 }]],
  },
  enquiries: {
    validator: v(['_id', 'customerId', 'listingId', 'farmerId', 'message', 'status'], {
      customerId: str, listingId: str, farmerId: str, message: str, reply: str, status: oneOf('Open', 'Replied'),
    }),
    indexes: [[{ farmerId: 1, status: 1 }], [{ customerId: 1 }], [{ listingId: 1 }]],
  },
  transportRequests: {
    validator: v(['_id', 'orderId', 'farmerId', 'pickup', 'destination', 'loadTonnes', 'offeredPrice', 'status'], {
      orderId: str, farmerId: str, pickup: str, destination: str, loadTonnes: num, offeredPrice: num, status: oneOf(...REQUEST_STATUS),
    }),
    indexes: [[{ farmerId: 1, status: 1 }], [{ orderId: 1 }], [{ status: 1, pickup: 1 }]],
  },
  transportBids: {
    validator: v(['_id', 'requestId', 'transporterId', 'price', 'status'], {
      requestId: str, transporterId: str, vehicleId: str, kind: oneOf('accept', 'counter'), price: num, status: oneOf(...BID_STATUS),
    }),
    indexes: [
      [{ requestId: 1, status: 1 }],
      [{ transporterId: 1 }],
      // one live response per provider per request
      [{ requestId: 1, transporterId: 1 }, { unique: true, partialFilterExpression: { status: { $in: LIVE_BID } } }],
    ],
  },
  shipments: {
    validator: v(['_id', 'requestId', 'orderId', 'transporterId', 'status', 'progress'], {
      requestId: str, orderId: str, transporterId: str, vehicleId: str, agreedPrice: num,
      status: oneOf('Assigned', 'Picked up', 'In transit', 'Delivered'), progress: num,
    }),
    indexes: [[{ orderId: 1 }], [{ transporterId: 1, status: 1 }], [{ requestId: 1 }]],
  },
  storageRequests: {
    validator: v(['_id', 'farmerId', 'quantity', 'days', 'city', 'offeredPrice', 'status'], {
      farmerId: str, quantity: num, days: num, city: str, offeredPrice: num, status: oneOf(...REQUEST_STATUS),
    }),
    indexes: [[{ farmerId: 1, status: 1 }], [{ status: 1, city: 1 }]],
  },
  storageBids: {
    validator: v(['_id', 'requestId', 'ownerId', 'price', 'status'], {
      requestId: str, ownerId: str, storageId: str, kind: oneOf('accept', 'counter'), price: num, status: oneOf(...BID_STATUS),
    }),
    indexes: [
      [{ requestId: 1, status: 1 }],
      [{ ownerId: 1 }],
      [{ requestId: 1, ownerId: 1 }, { unique: true, partialFilterExpression: { status: { $in: LIVE_BID } } }],
    ],
  },
  events: {
    validator: v(['_id', 'entityType', 'entityId', 'status', 'timestamp'], {
      entityType: str, entityId: str, status: str, note: str,
    }),
    indexes: [[{ entityType: 1, entityId: 1, timestamp: 1 }], [{ timestamp: -1 }]],
  },
};
