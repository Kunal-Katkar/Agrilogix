// Payment rules and read-only helpers (pure functions, no UI). Shared by the mock API (src/data/actions.js),
// the seed data, the pages and the dev checks.
//
// Three kinds of payment flow through the platform, all held in escrow until the service is delivered:
//   Order      customer -> farmer       released when the buyer confirms receipt (or automatically after 3 days)
//   Transport  farmer   -> transporter  released when the shipment is delivered
//   Storage    farmer   -> storage owner released when the storage booking is completed
//
// Payment status:  Pending -> In escrow -> Paid          (normal path)
//                  In escrow -> Disputed -> Paid | Refunded   (admin resolves)
//                  In escrow -> Refunded                   (order rejected or cancelled)
//                  Pending   -> Failed                     (order closed before it was paid)
// A platform fee is deducted from the payee's share. The payer always pays exactly the agreed amount.
// Payees collect their money in a wallet and withdraw it to a bank account or UPI id (a payout).

export const FEE_RATES = { Order: 0.02, Transport: 0.015, Storage: 0.015 };
export const KINDS = ['Order', 'Transport', 'Storage'];
export const KIND_LABEL = { Order: 'Produce order', Transport: 'Transport fare', Storage: 'Storage charges' };
export const PAYMENT_STATUSES = ['Pending', 'In escrow', 'Paid', 'Disputed', 'Refunded', 'Failed'];
export const ONLINE_METHODS = ['UPI', 'Card', 'Net banking'];
export const COD = 'Cash on delivery';
export const MIN_PAYOUT = 100;
export const AUTO_RELEASE_DAYS = 3;
export const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda', 'Kotak Mahindra Bank', 'Canara Bank'];
export const RECEIVER_ROLES = ['Farmer', 'Transporter', 'StorageOwner'];
export const PAYER_ROLES = ['Customer', 'Farmer'];

export const round2 = (n) => Math.round(Number(n) * 100) / 100;
export const feeFor = (kind, amount) => round2(Number(amount) * (FEE_RATES[kind] ?? 0));
export const splitAmount = (kind, amount) => {
  const platformFee = feeFor(kind, amount);
  return { platformFee, netAmount: round2(Number(amount) - platformFee) };
};
export const methodsFor = (kind) => (kind === 'Order' ? [...ONLINE_METHODS, COD] : [...ONLINE_METHODS]);
export const isCod = (p) => p.method === COD;
export const invoiceNo = (p) => `INV-${p.id}`;

// Money that is held by the platform on behalf of the payee.
export const isHeld = (p) => p.status === 'In escrow' || p.status === 'Disputed';

// What the payer still has to pay online (cash-on-delivery orders are settled at the door).
export const isDue = (p) => p.status === 'Pending' && !isCod(p);

export const paymentsOf = (db, userId) => db.payments.filter((p) => p.payerId === userId || p.payeeId === userId);
export const duesOf = (db, userId) => db.payments.filter((p) => p.payerId === userId && isDue(p));

export const paymentFor = (db, kind, refId) => db.payments.find((p) => p.kind === kind && p.refId === refId);

/* ---------- Wallet ----------
   Credits come from released payments (net of fee). A cash-on-delivery sale puts the cash straight in the
   seller's hand, so the only wallet effect is the commission the platform is owed (a debit). Payouts that are
   processing or paid are debits; a failed payout returns the money to the wallet. */
export function walletOf(db, userId) {
  const entries = [];
  db.payments.filter((p) => p.payeeId === userId && p.status === 'Paid').forEach((p) => {
    const at = p.releasedAt || p.paidAt || p.createdAt;
    if (isCod(p)) {
      entries.push({ id: `W-${p.id}`, at, type: 'Commission', amount: -p.platformFee, paymentId: p.id, note: `Commission on cash sale, ${KIND_LABEL[p.kind].toLowerCase()} ${p.refId}` });
    } else {
      entries.push({ id: `W-${p.id}`, at, type: 'Credit', amount: p.netAmount, paymentId: p.id, note: `${KIND_LABEL[p.kind]} ${p.refId}, after ${round2(p.platformFee)} platform fee` });
    }
  });
  (db.payouts || []).filter((x) => x.userId === userId && x.status !== 'Failed').forEach((x) => {
    entries.push({ id: `W-${x.id}`, at: x.processedAt || x.requestedAt, type: 'Payout', amount: -x.amount, payoutId: x.id, note: `Withdrawal to ${x.destination}${x.status === 'Processing' ? ' (processing)' : ''}` });
  });
  entries.sort((a, b) => a.at.localeCompare(b.at));
  let running = 0;
  const ledger = entries.map((e) => { running = round2(running + e.amount); return { ...e, balance: running }; });
  const sum = (rows, f) => round2(rows.reduce((n, r) => n + f(r), 0));
  const incoming = db.payments.filter((p) => p.payeeId === userId);
  const payouts = (db.payouts || []).filter((x) => x.userId === userId);
  return {
    ledger,
    balance: running,
    available: Math.max(0, running),
    inEscrow: sum(incoming.filter(isHeld), (p) => p.netAmount),
    awaitingPayer: sum(incoming.filter(isDue), (p) => p.netAmount),
    earned: sum(incoming.filter((p) => p.status === 'Paid' && !isCod(p)), (p) => p.netAmount),
    feesPaid: sum(incoming.filter((p) => p.status === 'Paid'), (p) => p.platformFee),
    withdrawn: sum(payouts.filter((x) => x.status === 'Paid'), (x) => x.amount),
    processing: sum(payouts.filter((x) => x.status === 'Processing'), (x) => x.amount),
  };
}

// Totals for the payer side (customer buying produce, farmer paying for transport and storage).
export function spendingOf(db, userId) {
  const mine = db.payments.filter((p) => p.payerId === userId);
  const sum = (rows) => round2(rows.reduce((n, p) => n + p.amount, 0));
  return {
    paid: sum(mine.filter((p) => p.status === 'Paid')),
    inEscrow: sum(mine.filter(isHeld)),
    due: sum(mine.filter(isDue)),
    refunded: sum(mine.filter((p) => p.status === 'Refunded')),
    count: mine.length,
  };
}

// Platform-wide figures for the admin console.
export function platformSummary(db) {
  const sum = (rows, f) => round2(rows.reduce((n, r) => n + f(r), 0));
  const paid = db.payments.filter((p) => p.status === 'Paid');
  const byKind = KINDS.map((kind) => {
    const rows = db.payments.filter((p) => p.kind === kind);
    const settled = rows.filter((p) => p.status === 'Paid');
    return {
      kind, label: KIND_LABEL[kind], count: rows.length,
      volume: sum(rows.filter((p) => p.status === 'Paid' || isHeld(p)), (p) => p.amount),
      fees: sum(settled, (p) => p.platformFee), rate: FEE_RATES[kind],
    };
  });
  return {
    feesEarned: sum(paid, (p) => p.platformFee),
    feesPending: sum(db.payments.filter(isHeld), (p) => p.platformFee),
    held: sum(db.payments.filter(isHeld), (p) => p.amount),
    volume: sum(db.payments.filter((p) => p.status === 'Paid' || isHeld(p)), (p) => p.amount),
    refunded: sum(db.payments.filter((p) => p.status === 'Refunded'), (p) => p.amount),
    outstanding: sum(db.payments.filter(isDue), (p) => p.amount),
    openDisputes: (db.disputes || []).filter((d) => d.status === 'Open').length,
    payoutsProcessing: (db.payouts || []).filter((x) => x.status === 'Processing').length,
    payoutsProcessingAmount: sum((db.payouts || []).filter((x) => x.status === 'Processing'), (x) => x.amount),
    byKind,
  };
}

/* ---------- Payout accounts ---------- */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function validatePayoutAccount(a) {
  if (!a || !a.type) return 'Choose how you want to be paid.';
  if (a.type === 'UPI') return UPI_RE.test(String(a.upiId || '').trim()) ? null : 'Enter a valid UPI id, like name@bank.';
  if (a.type === 'Bank') {
    if (!String(a.holder || '').trim()) return 'Enter the account holder name.';
    if (!/^\d{9,18}$/.test(String(a.accountNumber || '').replace(/\s/g, ''))) return 'Account number must be 9 to 18 digits.';
    if (!IFSC_RE.test(String(a.ifsc || '').trim().toUpperCase())) return 'Enter a valid IFSC code, like HDFC0001234.';
    return null;
  }
  return 'Choose how you want to be paid.';
}

export function normalizePayoutAccount(a) {
  if (a.type === 'UPI') return { type: 'UPI', upiId: a.upiId.trim() };
  return {
    type: 'Bank', holder: a.holder.trim(), accountNumber: String(a.accountNumber).replace(/\s/g, ''),
    ifsc: a.ifsc.trim().toUpperCase(), bankName: (a.bankName || '').trim(),
  };
}

// Never show a full account number: last four digits only.
export const describeAccount = (a) => {
  if (!a) return 'No account saved';
  if (a.type === 'UPI') return `UPI ${a.upiId}`;
  return `${a.bankName || 'Bank'} ••••${String(a.accountNumber).slice(-4)}`;
};

/* ---------- Checkout input checks (used by the checkout form and the gateway adapter) ---------- */
export const luhn = (digits) => {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return digits.length > 0 && sum % 10 === 0;
};

export function validateInstrument(method, d = {}, now = new Date()) {
  if (method === 'UPI') return UPI_RE.test(String(d.upiId || '').trim()) ? null : 'Enter a valid UPI id, like name@bank.';
  if (method === 'Net banking') return d.bank ? null : 'Choose your bank.';
  if (method === 'Card') {
    const num = String(d.number || '').replace(/\s/g, '');
    if (!String(d.holder || '').trim()) return 'Enter the name on the card.';
    if (!/^\d{13,19}$/.test(num) || !luhn(num)) return 'That card number is not valid.';
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(d.expiry || '').trim());
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'Enter the expiry as MM/YY.';
    const expires = new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59, 59);
    if (expires < now) return 'This card has expired.';
    if (!/^\d{3,4}$/.test(String(d.cvv || ''))) return 'Enter the 3 or 4 digit CVV.';
    return null;
  }
  return null;
}

// What is stored on the payment: a masked description, never the card number, CVV or full account details.
export function describeInstrument(method, d = {}) {
  if (method === 'UPI') return `UPI ${String(d.upiId || '').trim()}`;
  if (method === 'Net banking') return `Net banking, ${d.bank}`;
  if (method === 'Card') {
    const num = String(d.number || '').replace(/\s/g, '');
    return `Card ••••${num.slice(-4)}`;
  }
  return method;
}

/* ---------- Display helpers ---------- */
export const partyName = (db, userId) => {
  const u = db.users.find((x) => x.id === userId);
  return u ? (u.company || u.name) : userId;
};

// What a payment is for, in words: { title, sub }.
export function paymentSubject(db, p) {
  if (p.kind === 'Order') {
    const o = db.orders.find((x) => x.id === p.orderId);
    const l = db.listings.find((x) => x.id === o?.listingId);
    return { title: l && o ? `${l.name}, ${o.quantity} ${o.unit}` : `Order ${p.refId}`, sub: `Order ${p.refId}` };
  }
  if (p.kind === 'Transport') {
    const s = db.shipments.find((x) => x.trackingId === p.refId);
    return { title: s ? `Transport ${s.pickup.split(',')[0]} to ${s.destination.split(',')[0]}` : `Shipment ${p.refId}`, sub: `Shipment ${p.refId}` };
  }
  const r = db.storageRequests.find((x) => x.id === p.refId);
  const f = db.storages.find((x) => x.id === r?.storageId);
  return { title: r ? `${r.quantity} t stored for ${r.days} days${f ? ` at ${f.name}` : ''}` : `Storage ${p.refId}`, sub: `Storage booking ${p.refId}` };
}

// When held money is released, in words.
export const releaseCondition = (kind) => (kind === 'Order' ? 'the buyer confirms receipt' : kind === 'Transport' ? 'the shipment is delivered' : 'the storage booking is completed');
