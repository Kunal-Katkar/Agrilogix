// Central seed data for the AgriLogiX prototype (SRS Section 5).
// Every foreign key below points to an existing record. All demo accounts use DEMO_PASSWORD.
import { splitAmount } from '../lib/payments.js';

export const DEMO_PASSWORD = 'demo123';

// Bump this whenever the seed data or its shape changes. Browsers holding data from an older version
// then start again from the new seed instead of showing stale or missing records.
export const SEED_VERSION = 4;

const u = (id, role, name, email, phone, location, extra = {}) => ({
  id, role, name, email, phone, location, password: DEMO_PASSWORD, verified: true, ...extra,
});

export const users = [
  // Farmers (profile + farm information)
  u('F1', 'Farmer', 'Ramesh Patil', 'ramesh@agrilogix.demo', '+91 98220 11001', 'Nashik, Maharashtra', {
    farmName: 'Patil Agro Farms', farmSize: '12 acres', mainCrops: ['Onion', 'Tomato'],
    bio: 'Third-generation onion grower supplying the Nashik mandi belt. Drip irrigation on all plots.',
  }),
  u('F2', 'Farmer', 'Gurpreet Singh', 'gurpreet@agrilogix.demo', '+91 98140 22002', 'Ludhiana, Punjab', {
    farmName: 'Sidhu Kheti', farmSize: '30 acres', mainCrops: ['Wheat', 'Rice', 'Maize'],
    bio: 'Grows HD-2967 wheat and Pusa basmati. Own grain cleaning and bagging unit.',
  }),
  u('F3', 'Farmer', 'Lakshmi Reddy', 'lakshmi@agrilogix.demo', '+91 98480 33003', 'Guntur, Andhra Pradesh', {
    farmName: 'Reddy Cotton & Rice Farm', farmSize: '22 acres', mainCrops: ['Cotton', 'Rice', 'Maize'],
    bio: 'Long-staple cotton and sona masuri rice. Member of a local farmer producer organisation.',
    payoutAccount: { type: 'Bank', holder: 'Lakshmi Reddy', accountNumber: '50100234561234', ifsc: 'HDFC0001234', bankName: 'HDFC Bank' },
  }),
  u('F4', 'Farmer', 'Suresh Yadav', 'suresh@agrilogix.demo', '+91 98270 44004', 'Indore, Madhya Pradesh', {
    farmName: 'Yadav Soya Kendra', farmSize: '40 acres', mainCrops: ['Soybean', 'Wheat', 'Maize'],
    bio: 'Soybean specialist with graded, moisture-tested lots ready for oil mills.',
  }),
  u('F5', 'Farmer', 'Anita Deshmukh', 'anita@agrilogix.demo', '+91 98900 55005', 'Pune, Maharashtra', {
    farmName: 'Deshmukh Fresh Produce', farmSize: '8 acres', mainCrops: ['Tomato', 'Potato', 'Onion'],
    bio: 'Fresh vegetables harvested to order for restaurants and retail chains around Pune.',
  }),
  u('F6', 'Farmer', 'Mohan Das', 'mohan@agrilogix.demo', '+91 94120 66006', 'Agra, Uttar Pradesh', {
    farmName: 'Das Potato Farms', farmSize: '18 acres', mainCrops: ['Potato', 'Wheat'],
    bio: 'Agra-belt potato grower with cold-store linkages for year-round supply.',
  }),
  // Customers
  u('C1', 'Customer', 'Priya Menon', 'priya@agrilogix.demo', '+91 98450 71001', 'Bengaluru, Karnataka', {
    gstNumber: '29ABCDE1234F1Z5', deliveryAddress: 'Fresh Basket Retail, Yeshwanthpur, Bengaluru 560022',
  }),
  u('C2', 'Customer', 'FreshKart Retail', 'procurement@agrilogix.demo', '+91 98200 72002', 'Mumbai, Maharashtra', {
    gstNumber: '27FRESH5678K1Z2', deliveryAddress: 'APMC Market, Vashi, Navi Mumbai 400703',
  }),
  u('C3', 'Customer', 'Arjun Mehta', 'arjun@agrilogix.demo', '+91 98230 73003', 'Pune, Maharashtra', {
    gstNumber: '', deliveryAddress: 'Spice Route Restaurant, Koregaon Park, Pune 411001',
  }),
  u('C4', 'Customer', 'Hotel Sagar Group', 'sagar@agrilogix.demo', '+91 98490 74004', 'Hyderabad, Telangana', {
    gstNumber: '36HOTEL9012M1Z8', deliveryAddress: 'Central Kitchen, Banjara Hills, Hyderabad 500034',
  }),
  // Transporters
  u('T1', 'Transporter', 'Vikram Shinde', 'vikram@agrilogix.demo', '+91 98220 81001', 'Nashik, Maharashtra', {
    company: 'Shinde Logistics', licenseNumber: 'MH15-2019-0045122',
  }),
  u('T2', 'Transporter', 'Harjit Kaur', 'harjit@agrilogix.demo', '+91 98150 82002', 'Ludhiana, Punjab', {
    company: 'Punjab Roadways', licenseNumber: 'PB10-2017-0098231',
  }),
  u('T3', 'Transporter', 'Karthik Raj', 'karthik@agrilogix.demo', '+91 98860 83003', 'Bengaluru, Karnataka', {
    company: 'SouthLine Carriers', licenseNumber: 'KA01-2020-0067710',
    payoutAccount: { type: 'UPI', upiId: 'southline@okicici' },
  }),
  u('T4', 'Transporter', 'Rahul Verma', 'rahul@agrilogix.demo', '+91 98260 84004', 'Indore, Madhya Pradesh', {
    company: 'MP Freight Services', licenseNumber: 'MP09-2018-0031456',
  }),
  // Storage owners
  u('S1', 'StorageOwner', 'Dinesh Kulkarni', 'dinesh@agrilogix.demo', '+91 98220 91001', 'Nashik, Maharashtra', {
    company: 'Kulkarni Cold Chain',
  }),
  u('S2', 'StorageOwner', 'Baljit Sandhu', 'baljit@agrilogix.demo', '+91 98760 92002', 'Ludhiana, Punjab', {
    company: 'Sandhu Agro Storage',
  }),
  u('S3', 'StorageOwner', 'Neha Joshi', 'neha@agrilogix.demo', '+91 98500 93003', 'Pune, Maharashtra', {
    company: 'Joshi Fresh Storage',
  }),
  // Platform administrator
  u('A1', 'Admin', 'Platform Admin', 'admin@agrilogix.demo', '+91 80000 00001', 'NITK Surathkal, Karnataka'),
  // Accounts used to demonstrate KYC review (submitted, rejected, not submitted) and suspension
  u('F7', 'Farmer', 'Kavita Jadhav', 'kavita@agrilogix.demo', '+91 98810 12007', 'Satara, Maharashtra', {
    verified: false, kycStatus: 'Under review', farmName: 'Jadhav Soya Farm', farmSize: '6 acres', mainCrops: ['Soybean'],
    bio: 'Newly registered soybean grower in the Satara belt.',
    kyc: { landProof: { name: '7-12-extract-satara.pdf', size: 482113, uploadedAt: '2026-11-04T09:15:00.000Z' }, organicCert: null },
  }),
  u('F8', 'Farmer', 'Rajesh Kumar', 'rajesh@agrilogix.demo', '+91 98310 12008', 'Patna, Bihar', {
    verified: false, kycStatus: 'Rejected', kycNote: 'The land document is not readable. Please upload a clear scan of the full 7/12 or khatauni extract.',
    farmName: 'Kumar Maize Farm', farmSize: '10 acres', mainCrops: ['Maize'], bio: 'Maize grower supplying feed mills in Bihar.',
    kyc: { landProof: { name: 'land-doc-blurry.jpg', size: 91234, uploadedAt: '2026-10-30T14:00:00.000Z' }, organicCert: null },
  }),
  u('F9', 'Farmer', 'Deepak Chavan', 'deepak@agrilogix.demo', '+91 98220 12009', 'Kolhapur, Maharashtra', {
    verified: false, kycStatus: 'Not submitted', farmName: 'Chavan Agro', farmSize: '-', mainCrops: [], bio: 'New farmer on AgriLogiX.',
  }),
  u('C5', 'Customer', 'GreenLeaf Foods', 'greenleaf@agrilogix.demo', '+91 98400 75005', 'Chennai, Tamil Nadu', {
    verified: false, kycStatus: 'Under review', gstNumber: '33GREEN4567L1Z9', deliveryAddress: 'Ambattur Industrial Estate, Chennai 600058',
    kyc: { summary: 'GSTIN 33GREEN4567L1Z9. Delivery dock: Ambattur Industrial Estate, Chennai 600058.', submittedAt: '2026-11-05T10:30:00.000Z' },
  }),
  u('C6', 'Customer', 'QuickMart Traders', 'quickmart@agrilogix.demo', '+91 98110 75006', 'Delhi', {
    gstNumber: '07QUICK1234M1Z4', deliveryAddress: 'Azadpur Mandi, Delhi 110033', status: 'Suspended',
    statusNote: 'Repeated order cancellations after farmer acceptance.',
  }),
  u('T5', 'Transporter', 'Imran Sheikh', 'imran@agrilogix.demo', '+91 98490 85005', 'Hyderabad, Telangana', {
    verified: false, kycStatus: 'Under review', company: 'Deccan Carriers', licenseNumber: 'TS09-2021-0044110',
    kyc: { summary: 'Driving licence TS09-2021-0044110. Fleet of 2 covered trucks, RC copies available.', submittedAt: '2026-11-05T16:00:00.000Z' },
  }),
  u('S4', 'StorageOwner', 'Meera Nair', 'meera@agrilogix.demo', '+91 98470 93004', 'Kochi, Kerala', {
    verified: false, kycStatus: 'Under review', company: 'Malabar Cold Stores',
    kyc: { summary: 'Trade licence KL-CS-2024-118. Cold store of 400 t capacity at Kalamassery, Kochi.', submittedAt: '2026-11-06T08:45:00.000Z' },
  }),
];

// quantity is in the listing's unit (quintal = 100 kg); price is INR per unit
// Storage choice per listing: provider facility ids match accepted or pending seed storage requests; the rest use own storage.
const PROVIDER_STORAGE = { L101: 'ST1', L103: 'ST3', L115: 'ST6' };
const OWN_STORAGE_NOTE = {
  L102: 'Cooled shed on the farm', L104: 'Own bagging and godown unit', L105: 'Own grain silo', L106: 'Own ginning shed',
  L110: 'On-farm warehouse', L113: 'Ventilated potato shed', L114: 'Onion curing shed',
};
const storageFor = (id) => (PROVIDER_STORAGE[id]
  ? { mode: 'provider', storageId: PROVIDER_STORAGE[id] }
  : { mode: 'own', note: OWN_STORAGE_NOTE[id] || '' });

const l = (id, farmerId, name, category, price, quantity, location, description, availability = 'Available') => ({
  id, farmerId, name, category, price, unit: 'quintal', quantity, location, description, image: '', availability, storage: storageFor(id),
});

export const listings = [
  l('L101', 'F1', 'Onion (Nashik Red)', 'Vegetables', 1850, 120, 'Nashik, Maharashtra', 'Nashik red onion, 55-65 mm grade, cured and sorted. Good shelf life of 3-4 months.'),
  l('L102', 'F1', 'Tomato (Hybrid)', 'Vegetables', 2200, 35, 'Nashik, Maharashtra', 'Firm hybrid tomatoes picked at the breaker stage, suitable for long-haul transport.', 'Limited'),
  l('L103', 'F2', 'Wheat (HD-2967)', 'Grains', 2275, 400, 'Ludhiana, Punjab', 'Clean, sun-dried HD-2967 wheat. Moisture under 12%, no admixture.'),
  l('L104', 'F2', 'Basmati Rice (Pusa 1121)', 'Grains', 6200, 90, 'Ludhiana, Punjab', 'Aged Pusa 1121 basmati, long grain, machine-sorted and bagged in 25 kg HDPE bags.'),
  l('L105', 'F2', 'Maize (Yellow)', 'Grains', 2090, 150, 'Ludhiana, Punjab', 'Dry yellow maize for feed and starch use, moisture below 14%.'),
  l('L106', 'F3', 'Cotton (Long Staple)', 'Fibre', 7100, 80, 'Guntur, Andhra Pradesh', 'Hand-picked long staple cotton, staple length 29-30 mm, low trash content.'),
  l('L107', 'F3', 'Sona Masuri Rice', 'Grains', 4800, 110, 'Guntur, Andhra Pradesh', 'Polished sona masuri rice, ideal for retail and catering.'),
  l('L108', 'F3', 'Maize (Hybrid)', 'Grains', 2120, 0, 'Guntur, Andhra Pradesh', 'Hybrid maize, current lot fully booked. Next harvest expected in six weeks.', 'Out of stock'),
  l('L109', 'F4', 'Soybean (JS-335)', 'Oilseeds', 4650, 250, 'Indore, Madhya Pradesh', 'JS-335 soybean, oil content 18-19%, graded and moisture tested.'),
  l('L110', 'F4', 'Wheat (Sharbati)', 'Grains', 3150, 140, 'Indore, Madhya Pradesh', 'Premium Sharbati wheat from the Malwa region, bold golden grain.'),
  l('L111', 'F4', 'Maize (Dent)', 'Grains', 2060, 180, 'Indore, Madhya Pradesh', 'Dent maize, good for poultry feed units. Bulk lots available.'),
  l('L112', 'F5', 'Tomato (Fresh Salad)', 'Vegetables', 2600, 25, 'Pune, Maharashtra', 'Ripe red tomatoes harvested to order for restaurants. Quick delivery recommended.', 'Limited'),
  l('L113', 'F5', 'Potato (Jyoti)', 'Vegetables', 1450, 100, 'Pune, Maharashtra', 'Jyoti variety potato, medium size, suitable for chips and table use.'),
  l('L114', 'F5', 'Onion (Pune Red)', 'Vegetables', 1900, 70, 'Pune, Maharashtra', 'Pune red onion, uniform size, sorted for retail.'),
  l('L115', 'F6', 'Potato (Kufri Bahar)', 'Vegetables', 1380, 300, 'Agra, Uttar Pradesh', 'Kufri Bahar potatoes from the Agra belt, available straight from cold store.'),
  l('L116', 'F6', 'Potato (Chipsona)', 'Vegetables', 1620, 160, 'Agra, Uttar Pradesh', 'Chipsona processing-grade potatoes, low reducing sugar.'),
  l('L117', 'F6', 'Wheat (Lok-1)', 'Grains', 2310, 220, 'Agra, Uttar Pradesh', 'Lok-1 wheat, sound grain, mandi-tested.'),
  l('L118', 'F3', 'Cotton (Medium Staple)', 'Fibre', 6650, 140, 'Guntur, Andhra Pradesh', 'Machine-picked medium staple cotton for spinning mills.'),
];

const s = (id, ownerId, name, type, location, totalCapacity, availableCapacity, pricePerTonneDay, facilities, availability = 'Available') => ({
  id, ownerId, name, type, location, totalCapacity, availableCapacity, pricePerTonneDay, facilities, availability,
});

// capacity is in tonnes; price is INR per tonne per day
export const storages = [
  s('ST1', 'S1', 'Nashik Cold Chain Hub', 'Cold storage', 'Nashik, Maharashtra', 500, 305, 45, ['Temperature control', 'Power backup', 'CCTV', 'Loading dock']),
  s('ST2', 'S1', 'Sinnar Dry Warehouse', 'Warehouse', 'Sinnar, Maharashtra', 800, 640, 12, ['Ventilated sheds', 'Fumigation', 'Weighbridge']),
  s('ST3', 'S2', 'Ludhiana Grain Silo', 'Silo', 'Ludhiana, Punjab', 2000, 1210, 8, ['Moisture control', 'Weighbridge', 'Fumigation', 'Insurance cover']),
  s('ST4', 'S2', 'Khanna Agro Warehouse', 'Warehouse', 'Khanna, Punjab', 1200, 0, 10, ['Ventilated sheds', 'CCTV'], 'Full'),
  s('ST5', 'S3', 'Pune Fresh Cold Store', 'Cold storage', 'Pune, Maharashtra', 350, 180, 52, ['Temperature control', 'Humidity control', 'Power backup', 'Pre-cooling']),
  s('ST6', 'S3', 'Agra Potato Cold Storage', 'Cold storage', 'Agra, Uttar Pradesh', 1500, 920, 18, ['Temperature control', 'Power backup', 'Loading dock']),
];

const v = (id, ownerId, vehicleType, regNo, loadCapacity, serviceArea, pricePerKm, availability = 'Available') => ({
  id, ownerId, vehicleType, regNo, loadCapacity, serviceArea, pricePerKm, availability,
});

// load capacity in tonnes; price in INR per km
export const vehicles = [
  v('V1', 'T1', 'Mini Truck', 'MH15 AB 1234', 1.5, ['Nashik', 'Pune', 'Mumbai'], 18),
  v('V2', 'T1', 'Refrigerated Truck', 'MH15 CD 5678', 8, ['Nashik', 'Pune', 'Mumbai', 'Bengaluru'], 42, 'On trip'),
  v('V3', 'T2', 'Heavy Covered Truck', 'PB10 EF 9012', 16, ['Ludhiana', 'Delhi', 'Agra', 'Mumbai'], 38),
  v('V4', 'T2', 'Open Flatbed', 'PB10 GH 3321', 10, ['Ludhiana', 'Delhi', 'Chandigarh'], 30),
  v('V5', 'T3', 'Refrigerated Truck', 'KA01 JK 3456', 5, ['Bengaluru', 'Hyderabad', 'Chennai'], 40),
  v('V6', 'T4', 'Mini Truck', 'MP09 LM 7890', 2, ['Indore', 'Bhopal', 'Mumbai', 'Pune'], 20),
];

const o = (id, customerId, listingId, quantity, status, createdAt) => {
  const lst = listings.find((x) => x.id === listingId);
  return { id, customerId, listingId, farmerId: lst.farmerId, quantity, unit: lst.unit, totalAmount: quantity * lst.price, status, createdAt };
};

export const orders = [
  o('O1001', 'C1', 'L106', 20, 'Delivered', '2026-10-12T09:30:00.000Z'),
  o('O1002', 'C2', 'L101', 40, 'In transit', '2026-10-28T11:00:00.000Z'),
  o('O1003', 'C3', 'L112', 5, 'Accepted', '2026-11-02T08:15:00.000Z'),
  o('O1004', 'C4', 'L107', 25, 'Placed', '2026-11-04T14:20:00.000Z'),
  o('O1005', 'C1', 'L109', 60, 'Rejected', '2026-10-20T10:45:00.000Z'),
  o('O1006', 'C2', 'L103', 100, 'Cancelled', '2026-10-25T16:05:00.000Z'),
  o('O1007', 'C4', 'L117', 30, 'Accepted', '2026-11-03T12:40:00.000Z'),
  o('O1008', 'C3', 'L113', 15, 'Placed', '2026-11-05T09:10:00.000Z'),
];

// ---------- Payments, disputes and payouts ----------
// kind: Order (customer -> farmer), Transport (farmer -> transporter), Storage (farmer -> storage owner).
// status: Pending | In escrow | Paid | Disputed | Refunded | Failed. Fees come from src/lib/payments.js.
const pay = (id, kind, refId, payerId, payeeId, amount, method, status, extra = {}) => {
  const { createdAt = '2026-10-12T09:30:00.000Z', history = [], ...rest } = extra;
  return {
    id, kind, refId, orderId: kind === 'Order' ? refId : null, payerId, payeeId, amount, ...splitAmount(kind, amount),
    method, status, attempts: 0, createdAt,
    history: [{ at: createdAt, status: 'Pending', note: 'Payment requested' }, ...history], ...rest,
  };
};
const held = (at, via) => ({ at, status: 'In escrow', note: `Payment received via ${via}. Held in escrow` });

export const payments = [
  pay('P2001', 'Order', 'O1001', 'C1', 'F3', 142000, 'Net banking', 'Paid', {
    createdAt: '2026-10-12T09:30:00.000Z', instrument: 'Net banking, HDFC Bank', gatewayRef: 'pay_SEED2001', paidAt: '2026-10-12T09:41:00.000Z', releasedAt: '2026-10-17T10:00:00.000Z',
    history: [held('2026-10-12T09:41:00.000Z', 'Net banking, HDFC Bank'), { at: '2026-10-17T10:00:00.000Z', status: 'Paid', note: 'Buyer confirmed receipt: released to the farmer' }],
  }),
  pay('P2002', 'Order', 'O1002', 'C2', 'F1', 74000, 'UPI', 'In escrow', {
    createdAt: '2026-10-28T11:00:00.000Z', instrument: 'UPI freshkart@okaxis', gatewayRef: 'pay_SEED2002', paidAt: '2026-10-28T11:06:00.000Z',
    history: [held('2026-10-28T11:06:00.000Z', 'UPI freshkart@okaxis')],
  }),
  pay('P2003', 'Order', 'O1003', 'C3', 'F5', 13000, 'Cash on delivery', 'Pending', {
    createdAt: '2026-11-02T08:15:00.000Z',
    history: [{ at: '2026-11-02T08:20:00.000Z', status: 'Pending', note: 'Cash on delivery chosen: the buyer pays the driver on arrival' }],
  }),
  pay('P2004', 'Order', 'O1004', 'C4', 'F3', 120000, 'UPI', 'Pending', { createdAt: '2026-11-04T14:20:00.000Z' }),
  pay('P2005', 'Order', 'O1005', 'C1', 'F4', 279000, 'UPI', 'Failed', {
    createdAt: '2026-10-20T10:45:00.000Z', attempts: 1, lastFailure: 'The UPI request was declined or timed out.',
    history: [{ at: '2026-10-20T10:50:00.000Z', status: 'Pending', note: 'Attempt failed (UPI): The UPI request was declined or timed out.' }, { at: '2026-10-21T09:00:00.000Z', status: 'Failed', note: 'Closed without payment: order rejected by the farmer' }],
  }),
  pay('P2006', 'Order', 'O1006', 'C2', 'F2', 227500, 'Net banking', 'Refunded', {
    createdAt: '2026-10-25T16:05:00.000Z', instrument: 'Net banking, State Bank of India', gatewayRef: 'pay_SEED2006', paidAt: '2026-10-25T16:12:00.000Z', refundedAt: '2026-10-26T08:00:00.000Z',
    history: [held('2026-10-25T16:12:00.000Z', 'Net banking, State Bank of India'), { at: '2026-10-26T08:00:00.000Z', status: 'Refunded', note: 'Refunded to the buyer: order cancelled by the buyer' }],
  }),
  pay('P2007', 'Order', 'O1007', 'C4', 'F6', 69300, 'UPI', 'Disputed', {
    createdAt: '2026-11-03T12:40:00.000Z', instrument: 'UPI hotelsagar@okhdfc', gatewayRef: 'pay_SEED2007', paidAt: '2026-11-03T12:48:00.000Z',
    history: [held('2026-11-03T12:48:00.000Z', 'UPI hotelsagar@okhdfc'), { at: '2026-11-05T18:30:00.000Z', status: 'Disputed', note: 'Dispute D6001 raised: The listing description does not match what the farmer confirmed on the phone.' }],
  }),
  pay('P2008', 'Order', 'O1008', 'C3', 'F5', 21750, 'UPI', 'Pending', { createdAt: '2026-11-05T09:10:00.000Z' }),
  pay('P2009', 'Transport', 'TRK-24001', 'F3', 'T3', 30000, 'UPI', 'Paid', {
    createdAt: '2026-10-14T07:00:00.000Z', instrument: 'UPI lakshmi@okhdfc', gatewayRef: 'pay_SEED2009', paidAt: '2026-10-14T07:10:00.000Z', releasedAt: '2026-10-16T09:15:00.000Z',
    history: [held('2026-10-14T07:10:00.000Z', 'UPI lakshmi@okhdfc'), { at: '2026-10-16T09:15:00.000Z', status: 'Paid', note: 'Shipment delivered: fare released to the transporter' }],
  }),
  pay('P2010', 'Transport', 'TRK-24002', 'F1', 'T1', 14000, 'UPI', 'In escrow', {
    createdAt: '2026-10-31T07:00:00.000Z', instrument: 'UPI ramesh@oksbi', gatewayRef: 'pay_SEED2010', paidAt: '2026-10-31T07:20:00.000Z',
    history: [held('2026-10-31T07:20:00.000Z', 'UPI ramesh@oksbi')],
  }),
  pay('P2011', 'Storage', 'SQ5001', 'F1', 'S1', 25200, 'UPI', 'Pending', { createdAt: '2026-10-23T09:00:00.000Z' }),
  pay('P2012', 'Storage', 'SQ5004', 'F5', 'S3', 1750, 'Card', 'Paid', {
    createdAt: '2026-10-10T10:30:00.000Z', instrument: 'Card ••••4242', gatewayRef: 'pay_SEED2012', paidAt: '2026-10-10T10:40:00.000Z', releasedAt: '2026-10-17T08:00:00.000Z',
    history: [held('2026-10-10T10:40:00.000Z', 'Card ••••4242'), { at: '2026-10-17T08:00:00.000Z', status: 'Paid', note: 'Storage completed: charges released to the storage owner' }],
  }),
];

export const disputes = [
  {
    id: 'D6001', paymentId: 'P2007', raisedBy: 'C4', against: 'F6',
    reason: 'The listing description does not match what the farmer confirmed on the phone.',
    status: 'Open', createdAt: '2026-11-05T18:30:00.000Z', resolution: null, adminNote: '', resolvedAt: null,
  },
];

export const payouts = [
  { id: 'PO7001', userId: 'F3', amount: 100000, destination: 'HDFC Bank ••••1234', status: 'Paid', requestedAt: '2026-10-18T09:00:00.000Z', processedAt: '2026-10-19T11:00:00.000Z', reference: 'UTR426100123456', note: '' },
  { id: 'PO7002', userId: 'T3', amount: 20000, destination: 'UPI southline@okicici', status: 'Processing', requestedAt: '2026-11-06T10:15:00.000Z', processedAt: null, reference: null, note: '' },
];

export const enquiries = [
  { id: 'E3001', customerId: 'C1', listingId: 'L104', farmerId: 'F2', message: 'Can you supply 200 quintal of basmati monthly through the year? What is the best price for a standing order?', reply: 'Yes, monthly supply is possible from the next harvest. Quote for 200 quintal: Rs 6,050 per quintal.', status: 'Replied', createdAt: '2026-10-30T10:00:00.000Z' },
  { id: 'E3002', customerId: 'C3', listingId: 'L102', farmerId: 'F1', message: 'Are these tomatoes suitable for sauce making? Need delivery to Pune within 2 days.', reply: '', status: 'Open', createdAt: '2026-11-04T17:30:00.000Z' },
  { id: 'E3003', customerId: 'C2', listingId: 'L115', farmerId: 'F6', message: 'Can you provide cold-storage graded lots of 500 quintal?', reply: '', status: 'Open', createdAt: '2026-11-05T11:25:00.000Z' },
];

// ---------- Transport: open requests, provider bids, shipments ----------
// A farmer posts a request with an offered price (INR, whole trip). Transporters bid: they either accept
// that price (kind 'accept') or counter with their own (kind 'counter'). The farmer selects one bid.
const tr = (id, orderId, farmerId, pickup, destination, quantity, loadTonnes, date, offeredPrice, status, selectedBidId = null, agreedPrice = null, vehicleType = '', notes = '') => ({
  id, orderId, farmerId, pickup, destination, quantity, unit: 'quintal', loadTonnes, date, vehicleType, notes,
  offeredPrice, status, selectedBidId, agreedPrice, createdAt: `${date}T06:00:00.000Z`,
});

export const transportRequests = [
  tr('TQ4001', 'O1001', 'F3', 'Guntur, Andhra Pradesh', 'Bengaluru, Karnataka', 20, 2, '2026-10-14', 28000, 'Completed', 'TB4001', 30000, '', 'Cotton bales, keep dry.'),
  tr('TQ4002', 'O1002', 'F1', 'Nashik, Maharashtra', 'Mumbai, Maharashtra', 40, 4, '2026-10-30', 14000, 'Confirmed', 'TB4003', 14000, 'Refrigerated Truck', 'Onions need ventilation.'),
  tr('TQ4003', 'O1003', 'F5', 'Pune, Maharashtra', 'Pune, Maharashtra', 5, 0.5, '2026-11-06', 1500, 'Open', null, null, '', 'Fresh tomatoes, deliver before noon.'),
  tr('TQ4004', 'O1007', 'F6', 'Agra, Uttar Pradesh', 'Hyderabad, Telangana', 30, 3, '2026-11-07', 20000, 'Open', null, null, '', 'Long haul. Loading at Agra cold store gate.'),
];

const tb = (id, requestId, transporterId, vehicleId, kind, price, status, etaDays, note, createdAt) => ({
  id, requestId, transporterId, vehicleId, kind, price, status, etaDays, note, createdAt,
});

export const transportBids = [
  tb('TB4001', 'TQ4001', 'T3', 'V5', 'counter', 30000, 'Selected', 2, 'Reefer available, return load from Bengaluru.', '2026-10-13T08:00:00.000Z'),
  tb('TB4002', 'TQ4001', 'T2', 'V3', 'counter', 34000, 'Rejected', 3, '', '2026-10-13T09:30:00.000Z'),
  tb('TB4003', 'TQ4002', 'T1', 'V2', 'accept', 14000, 'Selected', 1, 'Can pick up at 6 am.', '2026-10-29T17:00:00.000Z'),
  tb('TB4004', 'TQ4002', 'T2', 'V3', 'counter', 16500, 'Rejected', 2, '', '2026-10-29T18:10:00.000Z'),
  tb('TB4005', 'TQ4003', 'T4', 'V6', 'counter', 1800, 'Pending', 1, 'Mini truck is free today. Fuel cost is higher than your price.', '2026-11-05T10:00:00.000Z'),
  tb('TB4006', 'TQ4003', 'T1', 'V1', 'accept', 1500, 'Pending', 1, '', '2026-11-05T11:20:00.000Z'),
  tb('TB4007', 'TQ4004', 'T2', 'V3', 'counter', 26000, 'Pending', 3, 'Covered truck, 16 t capacity, return to Ludhiana.', '2026-11-05T15:45:00.000Z'),
];

export const shipments = [
  { trackingId: 'TRK-24001', requestId: 'TQ4001', bidId: 'TB4001', orderId: 'O1001', transporterId: 'T3', vehicleId: 'V5', agreedPrice: 30000, status: 'Delivered', pickup: 'Guntur, Andhra Pradesh', destination: 'Bengaluru, Karnataka', eta: '2026-10-16', progress: 100 },
  { trackingId: 'TRK-24002', requestId: 'TQ4002', bidId: 'TB4003', orderId: 'O1002', transporterId: 'T1', vehicleId: 'V2', agreedPrice: 14000, status: 'In transit', pickup: 'Nashik, Maharashtra', destination: 'Mumbai, Maharashtra', eta: '2026-11-07', progress: 70 },
];

// ---------- Storage: open requests and provider bids ----------
// offeredPrice is INR per tonne per day. Once a bid is selected the request records storageId and agreedPrice.
const sr = (id, farmerId, listingId, quantity, days, startDate, city, offeredPrice, status, extra = {}) => ({
  id, farmerId, listingId, quantity, days, startDate, city, storageType: '', notes: '', offeredPrice, status,
  storageId: null, selectedBidId: null, agreedPrice: null, createdAt: `${startDate}T06:00:00.000Z`, ...extra,
});

export const storageRequests = [
  sr('SQ5001', 'F1', 'L101', 20, 30, '2026-10-22', 'Nashik', 40, 'Confirmed', { storageType: 'Cold storage', storageId: 'ST1', selectedBidId: 'SB5001', agreedPrice: 42, notes: 'Onions, need ventilation and curing space.' }),
  sr('SQ5002', 'F2', 'L103', 60, 45, '2026-11-10', 'Ludhiana', 7, 'Open', { storageType: 'Silo', notes: 'Wheat, moisture below 12%.' }),
  sr('SQ5003', 'F4', 'L111', 40, 20, '2026-10-29', 'Indore', 9, 'Cancelled', { notes: 'Plans changed, sold directly.' }),
  sr('SQ5004', 'F5', 'L112', 5, 7, '2026-10-10', 'Pune', 50, 'Completed', { storageType: 'Cold storage', storageId: 'ST5', selectedBidId: 'SB5004', agreedPrice: 50 }),
  sr('SQ5005', 'F6', 'L115', 80, 90, '2026-11-12', 'Agra', 15, 'Open', { storageType: 'Cold storage', notes: 'Potatoes, long storage for off-season sale.' }),
];

const sb = (id, requestId, ownerId, storageId, kind, price, status, note, createdAt) => ({
  id, requestId, ownerId, storageId, kind, price, status, note, createdAt,
});

export const storageBids = [
  sb('SB5001', 'SQ5001', 'S1', 'ST1', 'counter', 42, 'Selected', 'Includes loading dock use.', '2026-10-22T12:00:00.000Z'),
  sb('SB5002', 'SQ5001', 'S3', 'ST5', 'counter', 50, 'Rejected', '', '2026-10-22T14:30:00.000Z'),
  sb('SB5003', 'SQ5003', 'S2', 'ST3', 'accept', 9, 'Rejected', '', '2026-10-30T09:00:00.000Z'),
  sb('SB5004', 'SQ5004', 'S3', 'ST5', 'accept', 50, 'Selected', 'Pre-cooling included.', '2026-10-10T10:00:00.000Z'),
  sb('SB5005', 'SQ5002', 'S2', 'ST3', 'counter', 8, 'Pending', 'Standard silo rate. Weighbridge and fumigation included.', '2026-11-04T11:00:00.000Z'),
  sb('SB5006', 'SQ5005', 'S3', 'ST6', 'counter', 18, 'Pending', 'Cold store rate for 90 days. Discount possible above 100 t.', '2026-11-06T08:30:00.000Z'),
];

const e = (id, entityType, entityId, status, timestamp, note) => ({ id, entityType, entityId, status, timestamp, note });

export const events = [
  e('EV1', 'Order', 'O1001', 'Placed', '2026-10-12T09:30:00.000Z', 'Order placed by customer'),
  e('EV2', 'Order', 'O1001', 'Accepted', '2026-10-12T12:00:00.000Z', 'Accepted by farmer'),
  e('EV3', 'Shipment', 'TRK-24001', 'Assigned', '2026-10-14T07:00:00.000Z', 'Vehicle assigned'),
  e('EV4', 'Shipment', 'TRK-24001', 'Picked up', '2026-10-14T10:30:00.000Z', 'Picked up from Guntur'),
  e('EV5', 'Shipment', 'TRK-24001', 'In transit', '2026-10-15T06:00:00.000Z', 'En route to Bengaluru'),
  e('EV6', 'Shipment', 'TRK-24001', 'Delivered', '2026-10-16T09:15:00.000Z', 'Delivered to buyer'),
  e('EV7', 'Order', 'O1001', 'Delivered', '2026-10-16T09:15:00.000Z', 'Order delivered'),
  e('EV8', 'Order', 'O1002', 'Placed', '2026-10-28T11:00:00.000Z', 'Order placed by customer'),
  e('EV9', 'Order', 'O1002', 'Accepted', '2026-10-29T08:00:00.000Z', 'Accepted by farmer'),
  e('EV10', 'Shipment', 'TRK-24002', 'Assigned', '2026-10-31T07:00:00.000Z', 'Vehicle assigned'),
  e('EV11', 'Shipment', 'TRK-24002', 'Picked up', '2026-11-05T09:00:00.000Z', 'Picked up from Nashik'),
  e('EV12', 'Shipment', 'TRK-24002', 'In transit', '2026-11-05T15:30:00.000Z', 'En route to Mumbai'),
  e('EV13', 'Order', 'O1003', 'Placed', '2026-11-02T08:15:00.000Z', 'Order placed by customer'),
  e('EV14', 'Order', 'O1003', 'Accepted', '2026-11-02T10:00:00.000Z', 'Accepted by farmer'),
  e('EV15', 'Order', 'O1004', 'Placed', '2026-11-04T14:20:00.000Z', 'Order placed by customer'),
  e('EV16', 'Order', 'O1005', 'Rejected', '2026-10-21T09:00:00.000Z', 'Rejected by farmer: stock reserved'),
  e('EV17', 'Order', 'O1006', 'Cancelled', '2026-10-26T08:00:00.000Z', 'Cancelled by customer'),
  e('EV18', 'Order', 'O1007', 'Accepted', '2026-11-03T15:00:00.000Z', 'Accepted by farmer'),
  e('EV19', 'Order', 'O1008', 'Placed', '2026-11-05T09:10:00.000Z', 'Order placed by customer'),
  e('EV20', 'StorageRequest', 'SQ5001', 'Confirmed', '2026-10-23T09:00:00.000Z', 'Farmer selected Kulkarni Cold Chain at 42 per tonne per day'),
  e('EV21', 'StorageRequest', 'SQ5004', 'Completed', '2026-10-17T08:00:00.000Z', 'Storage period completed'),
];

export const buildSeed = () => JSON.parse(JSON.stringify({
  users, listings, storages, vehicles, orders, payments, disputes, payouts, enquiries,
  transportRequests, transportBids, shipments, storageRequests, storageBids, events,
}));
