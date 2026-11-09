// Aggregations for the admin portal. Pure function over the db, so it can be tested without the UI.
import { kycStatus, KYC_STATES } from './kyc.js';

const sum = (rows, f) => rows.reduce((n, r) => n + f(r), 0);
const count = (rows, f) => rows.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const asRows = (obj, order = Object.keys(obj)) => order.filter((k) => obj[k] !== undefined).map((label) => ({ label, value: obj[label] }));
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n) => Math.round(n * 10) / 10;

const ORDER_STATUSES = ['Placed', 'Accepted', 'In transit', 'Delivered', 'Rejected', 'Cancelled'];
const PAYMENT_STATUSES = ['Paid', 'In escrow', 'Disputed', 'Pending', 'Failed', 'Refunded'];
const REQUEST_STATUSES = ['Open', 'Confirmed', 'Completed', 'Cancelled'];
const SHIPMENT_STATUSES = ['Assigned', 'Picked up', 'In transit', 'Delivered'];
const monthLabel = (iso) => new Date(`${iso.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export function computeAnalytics(db) {
  const people = db.users.filter((u) => u.role !== 'Admin');
  const name = (id) => db.users.find((u) => u.id === id)?.name || id;

  // ---- users ----
  const byRole = count(people, (u) => u.role);
  const kyc = count(people, kycStatus);
  const users = {
    total: people.length,
    byRole: asRows(byRole, ['Farmer', 'Customer', 'Transporter', 'StorageOwner']),
    kyc: asRows(Object.fromEntries(KYC_STATES.map((s) => [s, kyc[s] || 0])), KYC_STATES),
    kycPending: kyc['Under review'] || 0,
    suspended: people.filter((u) => u.status === 'Suspended').length,
  };

  // ---- marketplace ----
  const live = db.orders.filter((o) => !['Rejected', 'Cancelled'].includes(o.status));
  const gmv = sum(live, (o) => o.totalAmount);
  // Order payments only: money received from buyers (settled or still in escrow) against money still owed.
  const orderPayments = db.payments.filter((p) => p.kind === 'Order');
  const paid = sum(orderPayments.filter((p) => ['Paid', 'In escrow', 'Disputed'].includes(p.status)), (p) => p.amount);
  const pending = sum(orderPayments.filter((p) => p.status === 'Pending'), (p) => p.amount);
  const monthly = {};
  live.forEach((o) => {
    const key = o.createdAt.slice(0, 7);
    monthly[key] = monthly[key] || { orders: 0, value: 0 };
    monthly[key].orders += 1;
    monthly[key].value += o.totalAmount;
  });
  const listingName = (id) => db.listings.find((l) => l.id === id)?.name || id;
  const byFarmer = {};
  const byCustomer = {};
  const byProduce = {};
  live.forEach((o) => {
    byFarmer[name(o.farmerId)] = (byFarmer[name(o.farmerId)] || 0) + o.totalAmount;
    byCustomer[name(o.customerId)] = (byCustomer[name(o.customerId)] || 0) + o.totalAmount;
    byProduce[listingName(o.listingId)] = (byProduce[listingName(o.listingId)] || 0) + o.totalAmount;
  });
  const top = (obj, n = 5) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));
  const market = {
    listings: db.listings.length,
    activeListings: db.listings.filter((l) => l.availability !== 'Out of stock').length,
    outOfStock: db.listings.filter((l) => l.availability === 'Out of stock').length,
    stockValue: sum(db.listings, (l) => l.quantity * l.price),
    byCategory: asRows(count(db.listings, (l) => l.category)),
    ordersByStatus: asRows(count(db.orders, (o) => o.status), ORDER_STATUSES),
    totalOrders: db.orders.length,
    gmv,
    deliveredValue: sum(db.orders.filter((o) => o.status === 'Delivered'), (o) => o.totalAmount),
    avgOrderValue: live.length ? Math.round(gmv / live.length) : 0,
    paid, pending,
    collectionRate: pct(paid, paid + pending),
    paymentsByStatus: asRows(count(orderPayments, (p) => p.status), PAYMENT_STATUSES),
    byMonth: Object.keys(monthly).sort().map((k) => ({ label: monthLabel(k), orders: monthly[k].orders, value: monthly[k].value })),
    topFarmers: top(byFarmer), topCustomers: top(byCustomer), topProduce: top(byProduce),
    openEnquiries: db.enquiries.filter((e) => e.status === 'Open').length,
    ownStorageListings: db.listings.filter((l) => (l.storage?.mode || 'own') === 'own').length,
    providerStorageListings: db.listings.filter((l) => l.storage?.mode === 'provider').length,
  };

  // ---- negotiation (shared by transport and storage) ----
  const negotiation = (requests, bids, key) => {
    const withBids = requests.filter((r) => bids.some((b) => b[key] === r.id && b.status !== 'Withdrawn'));
    const confirmed = requests.filter((r) => ['Confirmed', 'Completed'].includes(r.status));
    const counters = bids.filter((b) => b.kind === 'counter');
    const premiums = counters.map((b) => { const r = requests.find((x) => x.id === b[key]); return r ? ((b.price - r.offeredPrice) / r.offeredPrice) * 100 : 0; });
    const deals = confirmed.filter((r) => r.agreedPrice != null);
    const gaps = deals.map((r) => ((r.agreedPrice - r.offeredPrice) / r.offeredPrice) * 100);
    return {
      posted: requests.length,
      withBids: withBids.length,
      confirmed: confirmed.length,
      bids: bids.length,
      bidsPerRequest: requests.length ? round1(bids.length / requests.length) : 0,
      acceptShare: pct(bids.filter((b) => b.kind === 'accept').length, bids.length),
      avgCounterPremium: round1(avg(premiums)),
      avgAgreedVsOffer: round1(avg(gaps)),
      conversion: pct(confirmed.length, requests.length),
      byStatus: asRows(count(requests, (r) => r.status), REQUEST_STATUSES),
    };
  };

  // ---- transport ----
  const fleet = count(db.vehicles, (v) => v.availability);
  const transport = {
    ...negotiation(db.transportRequests, db.transportBids, 'requestId'),
    vehicles: db.vehicles.length,
    fleet: asRows({ Available: fleet.Available || 0, 'On trip': fleet['On trip'] || 0, Unavailable: fleet.Unavailable || 0 }),
    fleetByType: asRows(count(db.vehicles, (v) => v.vehicleType)),
    shipmentsByStatus: asRows(count(db.shipments, (s) => s.status), SHIPMENT_STATUSES),
    freightValue: sum(db.shipments, (s) => s.agreedPrice || 0),
    activeShipments: db.shipments.filter((s) => s.status !== 'Delivered').length,
    capacityTonnes: round1(sum(db.vehicles, (v) => v.loadCapacity)),
  };

  // ---- storage ----
  const total = sum(db.storages, (s) => s.totalCapacity);
  const free = sum(db.storages, (s) => s.availableCapacity);
  const deals = db.storageRequests.filter((r) => ['Confirmed', 'Completed'].includes(r.status) && r.agreedPrice != null);
  const storage = {
    ...negotiation(db.storageRequests, db.storageBids, 'requestId'),
    facilities: db.storages.length,
    totalCapacity: total, freeCapacity: free, usedCapacity: total - free,
    utilisation: pct(total - free, total),
    perFacility: db.storages.map((s) => ({ label: s.name, used: s.totalCapacity - s.availableCapacity, total: s.totalCapacity, pct: pct(s.totalCapacity - s.availableCapacity, s.totalCapacity) })),
    byType: asRows(count(db.storages, (s) => s.type)),
    bookedValue: sum(deals, (r) => r.quantity * r.days * r.agreedPrice),
  };

  // ---- activity ----
  const labelFor = (e) => {
    if (e.entityType === 'Order') return `Order ${e.entityId}`;
    if (e.entityType === 'Shipment') return `Shipment ${e.entityId}`;
    if (e.entityType === 'TransportRequest') return `Transport request ${e.entityId}`;
    if (e.entityType === 'StorageRequest') return `Storage request ${e.entityId}`;
    if (e.entityType === 'User') return `Account ${name(e.entityId)}`;
    return `${e.entityType} ${e.entityId}`;
  };
  const activity = [...db.events].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((e) => ({ ...e, title: labelFor(e) }));

  return { users, market, transport, storage, activity };
}

// Short role-specific activity facts for the admin's user views.
export function userActivity(db, user) {
  if (user.role === 'Farmer') {
    const orders = db.orders.filter((o) => o.farmerId === user.id && !['Rejected', 'Cancelled'].includes(o.status));
    return [
      ['Listings', db.listings.filter((l) => l.farmerId === user.id).length],
      ['Orders received', db.orders.filter((o) => o.farmerId === user.id).length],
      ['Order value', orders.reduce((n, o) => n + o.totalAmount, 0)],
      ['Transport requests', db.transportRequests.filter((r) => r.farmerId === user.id).length],
      ['Storage requests', db.storageRequests.filter((r) => r.farmerId === user.id).length],
    ];
  }
  if (user.role === 'Customer') {
    const orders = db.orders.filter((o) => o.customerId === user.id);
    return [
      ['Orders placed', orders.length],
      ['Delivered', orders.filter((o) => o.status === 'Delivered').length],
      ['Cancelled', orders.filter((o) => o.status === 'Cancelled').length],
      ['Spend (excl. rejected)', orders.filter((o) => !['Rejected', 'Cancelled'].includes(o.status)).reduce((n, o) => n + o.totalAmount, 0)],
      ['Enquiries', db.enquiries.filter((e) => e.customerId === user.id).length],
    ];
  }
  if (user.role === 'Transporter') {
    const bids = db.transportBids.filter((b) => b.transporterId === user.id);
    return [
      ['Vehicles', db.vehicles.filter((v) => v.ownerId === user.id).length],
      ['Responses sent', bids.length],
      ['Jobs won', bids.filter((b) => b.status === 'Selected').length],
      ['Shipments delivered', db.shipments.filter((s) => s.transporterId === user.id && s.status === 'Delivered').length],
      ['Freight earned', db.shipments.filter((s) => s.transporterId === user.id).reduce((n, s) => n + (s.agreedPrice || 0), 0)],
    ];
  }
  if (user.role === 'StorageOwner') {
    const ids = db.storages.filter((s) => s.ownerId === user.id);
    const bids = db.storageBids.filter((b) => b.ownerId === user.id);
    return [
      ['Facilities', ids.length],
      ['Capacity (t)', ids.reduce((n, s) => n + s.totalCapacity, 0)],
      ['Responses sent', bids.length],
      ['Bookings won', bids.filter((b) => b.status === 'Selected').length],
    ];
  }
  return [];
}
