// Payment gateway adapter.
//
// THIS IS A SIMULATOR. No money moves and no real gateway is contacted. Everything else in the payment system
// (escrow, fees, receipts, refunds, disputes, wallets, payouts) is built and works against this adapter, so going
// live means replacing only the bodies of `charge` and `payout` below:
//
//   charge:  server creates a gateway order (e.g. Razorpay / Cashfree / Stripe) for `amount` and `reference`,
//            the browser opens the gateway's hosted checkout, and the gateway's signed webhook (not the browser)
//            confirms the payment. On confirmation the server calls the same `makePayment` rules used here.
//   payout:  server calls the gateway's payout / bank-transfer API from the admin-approved payout.
//   refund:  server calls the gateway's refund API for the original payment id in `gatewayRef`.
//
// Card numbers, CVVs and account numbers must never reach this app's database: the hosted checkout collects them.
// The form here only exists so the flow can be demonstrated, and it keeps masked values only.

import { validateInstrument, describeInstrument } from './payments.js';

export const GATEWAY = { name: 'Simulated gateway', live: false };

export const TEST_INSTRUMENTS = {
  card: { success: '4242 4242 4242 4242', declined: '4000 0000 0000 0002', insufficient: '4000 0000 0000 9995' },
  upi: { success: 'any valid id, e.g. name@okaxis', declined: 'an id ending in @fail' },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ref = (prefix) => `${prefix}_${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/**
 * Attempts to collect `amount` rupees. Resolves (never rejects) with
 *   { ok: true, gatewayRef, instrument }  or  { ok: false, error }.
 */
export async function charge({ amount, method, details, reference, delay = 1200 }) {
  const invalid = validateInstrument(method, details);
  if (invalid) return { ok: false, error: invalid };
  if (!(Number(amount) > 0)) return { ok: false, error: 'Nothing to pay.' };
  await wait(delay);

  const instrument = describeInstrument(method, details);
  if (method === 'Card') {
    const num = String(details.number).replace(/\s/g, '');
    if (num === '4000000000000002') return { ok: false, error: 'The card was declined by the bank. Try another card or payment method.' };
    if (num === '4000000000009995') return { ok: false, error: 'Insufficient funds on this card. Try another card or payment method.' };
  }
  if (method === 'UPI' && /@fail$/i.test(String(details.upiId).trim())) {
    return { ok: false, error: 'The UPI request was declined or timed out. Try again or use another method.' };
  }
  return { ok: true, gatewayRef: ref('pay'), instrument, reference };
}

/** Sends a payout to a saved account. The simulator always accepts; an admin approves each payout in this app. */
export async function payout({ amount, account, delay = 400 }) {
  if (!(Number(amount) > 0) || !account) return { ok: false, error: 'Invalid payout.' };
  await wait(delay);
  return { ok: true, gatewayRef: ref('utr') };
}
