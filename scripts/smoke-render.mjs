// Dev check: node scripts/smoke-render.mjs
// Server-renders every route as the right role (and wrong roles) to catch crashes and broken guards.
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
globalThis.window = globalThis.window || { confirm: () => true, location: { pathname: '/' } };

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { ToastProvider } = await vite.ssrLoadModule('/src/context/ToastContext.jsx');
const { DataProvider } = await vite.ssrLoadModule('/src/context/DataContext.jsx');
const { AuthProvider } = await vite.ssrLoadModule('/src/context/AuthContext.jsx');
const { default: AppRoutes } = await vite.ssrLoadModule('/src/AppRoutes.jsx');
const { CheckoutModal, DisputeModal, ReceiptBody, PaymentStrip } = await vite.ssrLoadModule('/src/components/PaymentParts.jsx');
const { buildSeed } = await vite.ssrLoadModule('/src/data/seed.js');

const render = (userId, path) => {
  if (userId) store.agrilogix_session_v1 = userId; else delete store.agrilogix_session_v1;
  return renderToString(
    React.createElement(ToastProvider, null,
      React.createElement(DataProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(StaticRouter, { location: path }, React.createElement(AppRoutes))))));
};

// Renders a single component inside the providers, signed in as userId.
const renderEl = (userId, element) => {
  store.agrilogix_session_v1 = userId;
  return renderToString(
    React.createElement(ToastProvider, null,
      React.createElement(DataProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(StaticRouter, { location: '/' }, element)))));
};

let failed = 0;
const expectIn = (name, userId, path, needle) => {
  try {
    const html = render(userId, path);
    const ok = needle ? html.includes(needle) : html.length > 200;
    console.log(ok ? 'ok  ' : 'FAIL', name, `(${path})`);
    if (!ok) failed++;
  } catch (e) { failed++; console.log('FAIL', name, path, '->', e.message); }
};

// Public
expectIn('landing', null, '/', 'AgriLogiX');
expectIn('login', null, '/login', 'Welcome back');
expectIn('register', null, '/register', 'Join the AgriLogiX');
// Role pages (account, path, text that must appear)
const pages = [
  ['F1', ['/farmer', 'Welcome, Ramesh'], ['/farmer/listings', 'Onion (Nashik Red)'], ['/farmer/orders', 'Orders and enquiries'], ['/farmer/storage', 'Storage portal'],
    ['/farmer/transport', 'Transport portal'], ['/farmer/transport?order=O1003', 'Transport portal'], ['/farmer/profile', 'My profile'], ['/farmer/preview/F1', 'Patil Agro Farms'], ['/farmer/track/TRK-24002', 'TRK-24002']],
  ['C1', ['/customer', 'Fresh produce, straight from'], ['/customer/farmers', 'Gurpreet Singh'], ['/customer/farmers/F2', 'Sidhu Kheti'], ['/customer/listings/L103', 'Wheat (HD-2967)'],
    ['/customer/listings/L101', 'Stored with a storage provider'], ['/customer/listings/L101', 'Nashik Cold Chain Hub'], ['/customer/listings/L102', 'Cooled shed on the farm'], ['/customer/orders', 'My orders'], ['/customer/track/TRK-24001', 'TRK-24001']],
  ['T1', ['/transport', 'Shinde Logistics'], ['/transport/vehicles', 'MH15 AB 1234'], ['/transport/requests', 'Open requests'], ['/transport/shipments', 'TRK-24002'], ['/transport/track/TRK-24002', 'Placeholder map']],
  // farmers with live offers to compare, and providers answering open requests
  ['F5', ['/farmer/transport', 'MP Freight Services'], ['/farmer/transport', 'Accepts your price'], ['/farmer/transport', 'Counter offer'], ['/farmer/transport', 'Lowest price']],
  ['F6', ['/farmer/storage', 'Joshi Fresh Storage'], ['/farmer/transport', 'Punjab Roadways'], ['/farmer/orders', 'Orders and enquiries']],
  ['F1', ['/farmer/storage', 'Kulkarni Cold Chain'], ['/farmer/transport', 'Your transporter']],
  ['T4', ['/transport/requests', 'for the whole trip'], ['/transport/requests', 'Pickup in your service area']],
  ['T1', ['/transport/requests', 'Update response']],
  ['S2', ['/storage/requests', 'Needed in'], ['/storage', 'Open requests from farmers']],
  ['A1', ['/admin', 'Platform overview'], ['/admin', 'Needs attention'], ['/admin/analytics', 'Analytics'], ['/admin/users', 'Kavita Jadhav'], ['/admin/kyc', 'Review in detail'], ['/admin/activity', 'Activity log']],
  ['F9', ['/farmer', 'Complete your KYC to get a Verified mark']],
  ['F8', ['/farmer/profile', 'was rejected']],
  ['C5', ['/customer', 'Your KYC is with the platform admin']],
  ['S1', ['/storage', 'Kulkarni Cold Chain'], ['/storage/facilities', 'Nashik Cold Chain Hub'], ['/storage/requests', 'Storage requests']],
  // payments: every role has a payments page, and the payment panels show on the pages where money moves
  ['C2', ['/customer/payments', 'Held in escrow'], ['/customer/payments', 'Protected until you confirm receipt'], ['/customer/orders', 'Held safely by AgriLogiX'], ['/customer/orders', 'Receipt']],
  ['C4', ['/customer/payments', 'Payments due'], ['/customer/payments', 'Transactions'], ['/customer/orders', 'Pay'], ['/customer/orders', 'Payment due']],
  ['F3', ['/farmer/payments', 'Wallet balance'], ['/farmer/payments', 'Wallet &amp; payouts'], ['/farmer/payments', 'HDFC Bank'], ['/farmer/payments', 'Withdraw to my account']],
  ['F1', ['/farmer/payments', 'You still have to pay'], ['/farmer/storage', 'Payment due. Pay now'], ['/farmer/transport', 'Held safely by AgriLogiX'], ['/farmer/orders', 'you get']],
  ['T3', ['/transport/payments', 'Wallet balance'], ['/transport/payments', 'southline@okicici'], ['/transport/payments', 'Awaiting payment']],
  ['T1', ['/transport/shipments', 'held in escrow'], ['/transport/shipments', 'You receive']],
  ['S3', ['/storage/payments', 'Wallet balance'], ['/storage/payments', 'Storage charges']],
  ['A1', ['/admin/payments', 'Platform fees earned'], ['/admin/payments', 'Review and decide'], ['/admin/payments', 'Disputes (1)'], ['/admin/payments', 'Withdrawals (1)']],
];
for (const [uid, ...rows] of pages) rows.forEach(([path, needle]) => expectIn(`${uid}`, uid, path, needle));

// Guards: no session -> redirect (page body absent); wrong role -> own dashboard, not the requested page
const absent = (name, uid, path, needle) => {
  try {
    const html = render(uid, path);
    const ok = !html.includes(needle);
    console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) failed++;
  } catch (e) { failed++; console.log('FAIL', name, e.message); }
};
absent('customer cannot open the admin portal', 'C1', '/admin', 'Platform overview');
absent('farmer cannot open admin users', 'F1', '/admin/users', 'registered accounts');
absent('admin cannot open farmer dashboard', 'A1', '/farmer', 'Welcome, Ramesh');
absent('suspended account is signed out', 'C6', '/customer', 'Fresh produce');
absent('suspended farmer hidden from buyers', 'C1', '/customer/farmers', 'Kavita Jadhav-never');
absent('verified account sees no KYC banner', 'F1', '/farmer', 'Complete your KYC');
absent('anonymous cannot see farmer dashboard', null, '/farmer', 'Welcome, Ramesh');
absent('customer cannot see farmer listings', 'C1', '/farmer/listings', 'My listings');
absent('farmer cannot see transport page', 'F1', '/transport', 'Shinde Logistics');
absent('storage owner cannot see customer marketplace', 'S1', '/customer', 'Fresh produce');
absent('customer cannot open other customer shipment', 'C3', '/customer/track/TRK-24001', 'Placeholder map');
absent('other farmer cannot open shipment', 'F2', '/farmer/track/TRK-24002', 'Placeholder map');
absent('customer cannot open the farmer payments page', 'C1', '/farmer/payments', 'Wallet balance');
absent('farmer cannot open the admin payments console', 'F1', '/admin/payments', 'Platform fees earned');
absent('transporter cannot open customer payments', 'T1', '/customer/payments', 'Payments due');
absent('customers have no wallet or withdrawals', 'C1', '/customer/payments', 'Withdraw to my account');
absent('anonymous cannot see payments', null, '/customer/payments', 'Transactions');

// Payment modals and receipts render with the right content for the right side of the payment.
const seed = buildSeed();
const P = (id) => seed.payments.find((p) => p.id === id);
const expectEl = (name, userId, element, needles, notNeedles = []) => {
  try {
    const html = renderEl(userId, element).replace(/<!-- -->/g, '');
    const ok = needles.every((n) => html.includes(n)) && notNeedles.every((n) => !html.includes(n));
    console.log(ok ? 'ok  ' : 'FAIL', name); if (!ok) failed++;
  } catch (e) { failed++; console.log('FAIL', name, '->', e.message); }
};
expectEl('checkout: order offers UPI, Card, Net banking and cash on delivery', 'C4', React.createElement(CheckoutModal, { payment: P('P2004'), onClose() {} }), ['UPI id', 'Cash on delivery', 'Net banking', 'Card', '₹1,20,000', 'escrow']);
expectEl('checkout: a transport fare has no cash on delivery', 'F1', React.createElement(CheckoutModal, { payment: P('P2011'), onClose() {} }), ['Pay ₹25,200', 'Net banking'], ['Cash on delivery']);
expectEl('checkout: shows the last failed attempt', 'C1', React.createElement(CheckoutModal, { payment: { ...P('P2005'), status: 'Pending' }, onClose() {} }), ['Your last attempt failed']);
expectEl('dispute form renders', 'C2', React.createElement(DisputeModal, { payment: P('P2002'), onClose() {} }), ['What went wrong?', 'Report problem']);
expectEl('receipt: payer sees the amount paid, no fee line', 'C1', React.createElement(ReceiptBody, { payment: P('P2001'), viewerId: 'C1' }), ['INV-P2001', 'Total paid by the payer', '₹1,42,000', 'pay_SEED2001'], ['Platform fee']);
expectEl('receipt: payee sees fee and wallet credit', 'F3', React.createElement(ReceiptBody, { payment: P('P2001'), viewerId: 'F3' }), ['Platform fee', 'Credited to your wallet', '₹1,39,160', '₹2,840']);
expectEl('payment panel: payer sees a pay button when payment is due', 'C4', React.createElement(PaymentStrip, { payment: P('P2004') }), ['You pay', 'Payment due', 'Pay ₹1,20,000']);
expectEl('payment panel: payee sees what they will get and no pay button', 'F3', React.createElement(PaymentStrip, { payment: P('P2004') }), ['You receive', 'Waiting for'], ['Pay ₹']);
expectEl('payment panel: buyer with money in escrow can report a problem, but cannot confirm before delivery', 'C2', React.createElement(PaymentStrip, { payment: P('P2002') }), ['Held safely', 'Report problem', 'Receipt'], ['Confirm receipt']);

await vite.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
