# AgriLogiX payments

Three kinds of money move through the platform. All of it is held in escrow by the platform until the service is delivered.

| Kind | Who pays | Who is paid | Created when | Released when |
| --- | --- | --- | --- | --- |
| **Order** | Customer | Farmer | The order is placed | The buyer confirms receipt, or automatically 3 days after delivery |
| **Transport** | Farmer | Transporter | The farmer selects a transporter | The shipment is marked Delivered |
| **Storage** | Farmer | Storage owner | The farmer selects a storage offer (quantity x days x agreed rate) | The storage owner marks the booking Completed |

The payer always pays exactly the agreed amount. A **platform fee** is deducted from the payee's share: 2% on orders, 1.5% on transport and storage (`FEE_RATES` in `src/lib/payments.js`).

## Payment states

```
Pending ──pay──▶ In escrow ──release──▶ Paid          (money reaches the payee's wallet)
   │                 │
   │                 ├──report problem──▶ Disputed ──admin──▶ Paid (release) | Refunded
   │                 └──order rejected / cancelled──▶ Refunded
   └──order closed before payment──▶ Failed
```

- A declined attempt leaves the payment `Pending` and counts the attempt, so the payer can retry.
- **Cash on delivery** (orders only): no escrow. The driver collects cash, the payment becomes `Paid` on delivery, and the farmer's wallet is debited the platform commission.
- If something is paid after the service was already delivered, it skips escrow (transport, storage) or waits for the buyer's confirmation (orders).
- Every payment keeps a `history` (audit trail) and key steps are written to the admin activity log.

## Wallet and withdrawals

Farmers, transporters and storage owners have a wallet: released payments (after fee) minus withdrawals. They save a bank account or UPI id, then request a withdrawal (minimum 100 rupees). An admin approves it (money sent, reference recorded) or rejects it with a reason (money returns to the wallet). Only the last four digits of an account number are shown after saving.

## Disputes

A payer can **Report a problem** while money is in escrow. The payment freezes and an admin decides on `Admin > Payments > Disputes`: refund the payer or release to the payee, with a note both sides can read. Resolving a dispute does not change the order or booking itself.

## Where things live

| Concern | File |
| --- | --- |
| Fee rates, statuses, wallet maths, validation, display helpers | `src/lib/payments.js` |
| Gateway adapter (simulator) | `src/lib/gateway.js` |
| State changes: `makePayment`, `recordPaymentFailure`, `confirmReceipt`, `autoRelease`, `raiseDispute`, `resolveDispute`, `savePayoutAccount`, `requestPayout`, `processPayout` | `src/data/actions.js` |
| Checkout, receipt, dispute form, payment panels | `src/components/PaymentParts.jsx` |
| Payments page for customer, farmer, transporter, storage owner | `src/pages/payments/PaymentsPage.jsx` |
| Admin console: transactions, disputes, withdrawals, fees | `src/pages/admin/AdminPayments.jsx` |
| Seed payments, disputes, payouts | `src/data/seed.js` (`SEED_VERSION` 4) |
| MongoDB validators and indexes | `scripts/mongo/schema.mjs` |

## What is simulated, and how to make it real

Only the gateway is simulated. `charge()` and `payout()` in `src/lib/gateway.js` pretend to talk to a payment provider; everything around them is the real logic. To go live:

1. **Server.** Add a backend (the OTP mail server in `server/` is a starting point) and move the rules in `src/data/actions.js` and `src/lib/payments.js` there, backed by MongoDB. The browser must not be trusted to mark a payment paid.
2. **Charge.** The server creates a gateway order (Razorpay, Cashfree, Stripe or similar) for the payment's amount and id. The browser opens the gateway's hosted checkout, which collects the card, UPI or net-banking details. Replace the card/UPI form in `CheckoutModal`, because card numbers and CVVs must never touch this app.
3. **Confirm.** Mark a payment `In escrow` only from the gateway's signed webhook, using the same `makePayment` rules. Store the gateway payment id in `gatewayRef` (the field already exists).
4. **Refunds and payouts.** Call the gateway's refund API when a payment becomes `Refunded`, and its payout API from `processPayout`. Real escrow-style holds and payouts usually need a marketplace product from the gateway (for example Razorpay Route) and the platform's own KYC and licensing check.
5. **Release timer.** `autoRelease` runs when the app loads. Run it on a schedule on the server instead.
6. **Invoices.** The receipt is a prototype document. Real tax invoices need GST details and numbering rules.

## Known limits of the prototype

- Resolving a dispute in favour of a refund does not cancel the order or shipment. The admin handles that separately.
- A payer cannot change or withdraw a dispute once raised.
- Everything is stored in the browser, so two browsers do not share payments.
- Fees and the 3-day window are constants, not admin settings.
