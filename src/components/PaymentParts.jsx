import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Smartphone, Landmark, Banknote, Lock, Receipt, Printer, CheckCircle2, ShieldCheck, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Modal, Button, Field, inputCls, Notice, StatusBadge, cx } from './common';
import { inr, fmtDate, fmtDateTime } from '../lib/format';
import { charge, GATEWAY, TEST_INSTRUMENTS } from '../lib/gateway';
import {
  methodsFor, validateInstrument, BANKS, COD, KIND_LABEL, invoiceNo, isCod, partyName, paymentSubject, releaseCondition, AUTO_RELEASE_DAYS,
} from '../lib/payments';

const METHOD_ICON = { UPI: Smartphone, Card: CreditCard, 'Net banking': Landmark, [COD]: Banknote };

/* ---------- One-line explanation of a payment's state, from the viewer's side ---------- */
export function statusHelp(db, p, viewerId) {
  const payer = viewerId === p.payerId;
  const other = partyName(db, payer ? p.payeeId : p.payerId);
  switch (p.status) {
    case 'Pending':
      if (isCod(p)) return payer ? 'You chose cash on delivery. Pay the driver when the goods arrive.' : `${other} will pay in cash to the driver on delivery.`;
      return payer ? 'Payment due. Pay now so the money is secured in escrow.' : `Waiting for ${other} to pay.`;
    case 'In escrow': {
      const auto = p.autoReleaseAt ? ` Releases automatically on ${fmtDate(p.autoReleaseAt)} unless an issue is reported.` : '';
      return payer
        ? `Held safely by AgriLogiX. Released to ${other} when ${releaseCondition(p.kind)}.${auto}`
        : `Paid by ${other} and held in escrow. It reaches your wallet when ${releaseCondition(p.kind)}.${auto}`;
    }
    case 'Paid':
      return payer ? `Settled ${fmtDate(p.releasedAt || p.paidAt)}.` : (isCod(p) ? `Cash received on delivery. Commission of ${inr(p.platformFee)} is deducted from your wallet.` : `${inr(p.netAmount)} added to your wallet after a ${inr(p.platformFee)} platform fee.`);
    case 'Disputed': return 'An issue was reported. The platform admin is reviewing it and the money stays frozen until then.';
    case 'Refunded': return payer ? 'Refunded to your original payment method.' : `Refunded to ${other}.`;
    case 'Failed': return 'Closed without payment.';
    default: return '';
  }
}

/* ---------- Checkout ---------- */
export function CheckoutModal({ payment, onClose }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const live = db.payments.find((x) => x.id === payment.id) || payment;
  const methods = methodsFor(live.kind);
  const [method, setMethod] = useState(methods.includes(live.method) ? live.method : 'UPI');
  const [d, setD] = useState({ upiId: '', holder: '', number: '', expiry: '', cvv: '', bank: '' });
  const [phase, setPhase] = useState('form'); // form | processing | done
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const subject = paymentSubject(db, live);
  const set = (k, v) => setD((prev) => ({ ...prev, [k]: v }));
  const cardNumber = (v) => set('number', v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim());
  const expiry = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    set('expiry', digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (method === COD) {
      const res = run('makePayment', { paymentId: live.id, payerId: user.id, method });
      if (!res.ok) return setError(res.error);
      showToast('Cash on delivery confirmed.', 'success');
      setResult({ cod: true });
      return setPhase('done');
    }
    const invalid = validateInstrument(method, d);
    if (invalid) return setError(invalid);
    setPhase('processing');
    const g = await charge({ amount: live.amount, method, details: d, reference: live.id });
    if (!alive.current) return null;
    if (!g.ok) {
      run('recordPaymentFailure', { paymentId: live.id, payerId: user.id, method, reason: g.error });
      setError(g.error);
      return setPhase('form');
    }
    const res = run('makePayment', { paymentId: live.id, payerId: user.id, method, gatewayRef: g.gatewayRef, instrument: g.instrument });
    if (!res.ok) { setError(res.error); return setPhase('form'); }
    showToast(`Payment of ${inr(live.amount)} received.`, 'success');
    setResult({ gatewayRef: g.gatewayRef, instrument: g.instrument, status: res.status });
    return setPhase('done');
  };

  const busy = phase === 'processing';

  if (phase === 'done') {
    const current = db.payments.find((x) => x.id === live.id) || live;
    return (
      <Modal title="Payment" onClose={onClose}>
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8" /></div>
          <div className="text-2xl font-black text-zinc-900">{result.cod ? 'Cash on delivery confirmed' : `${inr(live.amount)} paid`}</div>
          <p className="text-sm text-zinc-600">{statusHelp(db, current, user.id)}</p>
          {result.gatewayRef && <div className="text-xs text-zinc-400">Reference {result.gatewayRef} · {result.instrument}</div>}
          <div className="flex justify-center gap-2 pt-2"><Button onClick={onClose}>Done</Button></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Pay for ${KIND_LABEL[live.kind].toLowerCase()}`} onClose={busy ? () => {} : onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{subject.sub}</div>
          <div className="font-bold text-zinc-900">{subject.title}</div>
          <div className="text-xs text-zinc-500">To {partyName(db, live.payeeId)}</div>
          <div className="text-3xl font-black text-emerald-800 mt-2">{inr(live.amount)}</div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />Held in escrow and released when {releaseCondition(live.kind)}. You pay exactly this amount; the platform fee comes out of the payee's share.</div>
        </div>

        {live.attempts > 0 && live.lastFailure && <Notice>Your last attempt failed: {live.lastFailure}</Notice>}

        <div>
          <span className="block text-xs font-bold text-zinc-700 mb-1.5">Payment method</span>
          <div className={cx('grid gap-2', methods.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3')}>
            {methods.map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <button key={m} type="button" disabled={busy} onClick={() => { setMethod(m); setError(''); }}
                  className={cx('rounded-xl border px-2 py-3 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer disabled:cursor-not-allowed', method === m ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50')}>
                  <Icon className="w-5 h-5" />{m}
                </button>
              );
            })}
          </div>
        </div>

        {method === 'UPI' && (
          <Field label="UPI id" hint={`Test: ${TEST_INSTRUMENTS.upi.success}. ${TEST_INSTRUMENTS.upi.declined} is declined.`}>
            <input disabled={busy} value={d.upiId} onChange={(e) => set('upiId', e.target.value)} placeholder="name@okaxis" autoComplete="off" className={inputCls} />
          </Field>
        )}
        {method === 'Card' && (
          <div className="space-y-3">
            <Field label="Name on card"><input disabled={busy} value={d.holder} onChange={(e) => set('holder', e.target.value)} autoComplete="cc-name" className={inputCls} /></Field>
            <Field label="Card number" hint={`Test cards: ${TEST_INSTRUMENTS.card.success} succeeds, ${TEST_INSTRUMENTS.card.declined} is declined.`}>
              <input disabled={busy} inputMode="numeric" value={d.number} onChange={(e) => cardNumber(e.target.value)} placeholder="4242 4242 4242 4242" autoComplete="cc-number" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiry"><input disabled={busy} inputMode="numeric" value={d.expiry} onChange={(e) => expiry(e.target.value)} placeholder="MM/YY" autoComplete="cc-exp" className={inputCls} /></Field>
              <Field label="CVV"><input disabled={busy} inputMode="numeric" type="password" maxLength={4} value={d.cvv} onChange={(e) => set('cvv', e.target.value.replace(/\D/g, ''))} placeholder="123" autoComplete="cc-csc" className={inputCls} /></Field>
            </div>
          </div>
        )}
        {method === 'Net banking' && (
          <Field label="Your bank">
            <select disabled={busy} value={d.bank} onChange={(e) => set('bank', e.target.value)} className={inputCls}>
              <option value="">Choose a bank</option>
              {BANKS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
        )}
        {method === COD && <Notice tone="blue">You will pay the driver in cash when the goods arrive. The order is not protected by escrow, and the farmer's commission is settled from their wallet.</Notice>}

        {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Lock className="w-3 h-3" />{GATEWAY.live ? GATEWAY.name : 'Simulated checkout: no money moves'}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Processing…' : method === COD ? 'Confirm cash on delivery' : `Pay ${inr(live.amount)}`}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Receipt ---------- */
export function ReceiptBody({ payment, viewerId }) {
  const { db } = useData();
  const p = payment;
  const subject = paymentSubject(db, p);
  const asPayee = viewerId === p.payeeId;
  const issued = p.releasedAt || p.paidAt || p.refundedAt || p.createdAt;
  const isReceipt = ['In escrow', 'Paid', 'Disputed', 'Refunded'].includes(p.status) || isCod(p);
  return (
    <div className="text-sm text-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-emerald-800">AgriLogiX</div>
          <div className="text-xs text-zinc-500">{isReceipt ? 'Payment receipt' : 'Payment request'} · {invoiceNo(p)}</div>
        </div>
        <div className="text-right text-xs text-zinc-500"><div>Issued {fmtDate(issued)}</div><StatusBadge status={p.status} /></div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-5 text-xs">
        <div><div className="font-bold uppercase tracking-wider text-zinc-400">Paid by</div><div className="text-sm font-semibold">{partyName(db, p.payerId)}</div><div className="text-zinc-500">{db.users.find((u) => u.id === p.payerId)?.location}</div></div>
        <div><div className="font-bold uppercase tracking-wider text-zinc-400">Paid to</div><div className="text-sm font-semibold">{partyName(db, p.payeeId)}</div><div className="text-zinc-500">{db.users.find((u) => u.id === p.payeeId)?.location}</div></div>
      </div>

      <table className="w-full mt-5 text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-200"><th className="py-2 font-bold">Description</th><th className="py-2 font-bold text-right">Amount</th></tr></thead>
        <tbody>
          <tr className="border-b border-zinc-100"><td className="py-2"><div className="font-semibold">{subject.title}</div><div className="text-xs text-zinc-500">{KIND_LABEL[p.kind]} · {subject.sub}</div></td><td className="py-2 text-right font-semibold">{inr(p.amount)}</td></tr>
          <tr className="font-black"><td className="py-2">Total paid by the payer</td><td className="py-2 text-right">{inr(p.amount)}</td></tr>
          {asPayee && (
            <>
              <tr className="text-zinc-600"><td className="py-1">Platform fee (deducted from your share)</td><td className="py-1 text-right">- {inr(p.platformFee)}</td></tr>
              <tr className="font-black text-emerald-800"><td className="py-1">{isCod(p) ? 'Cash collected by you' : 'Credited to your wallet'}</td><td className="py-1 text-right">{inr(isCod(p) ? p.amount : p.netAmount)}</td></tr>
            </>
          )}
        </tbody>
      </table>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-5 text-xs">
        <div><span className="text-zinc-400">Method </span><span className="font-semibold">{p.instrument || p.method}</span></div>
        <div><span className="text-zinc-400">Gateway reference </span><span className="font-semibold">{p.gatewayRef || '-'}</span></div>
        <div><span className="text-zinc-400">Paid on </span><span className="font-semibold">{p.paidAt ? fmtDateTime(p.paidAt) : '-'}</span></div>
        <div><span className="text-zinc-400">Released on </span><span className="font-semibold">{p.releasedAt ? fmtDateTime(p.releasedAt) : '-'}</span></div>
      </div>

      {(p.history || []).length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">History</div>
          <ol className="border-l-2 border-emerald-100 ml-1.5 space-y-1.5">
            {p.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="pl-4 relative text-xs">
                <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold">{h.status}</span> <span className="text-zinc-500">· {h.note} · {fmtDateTime(h.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="text-[11px] text-zinc-400 mt-5">Prototype document. Payments are simulated, so this is not a tax invoice.</p>
    </div>
  );
}

export function ReceiptModal({ payment, onClose }) {
  const { db } = useData();
  const { user } = useAuth();
  const live = db.payments.find((x) => x.id === payment.id) || payment;

  const print = () => {
    document.body.classList.add('printing');
    const cleanup = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    window.print();
    cleanup();
  };

  return (
    <>
      <Modal title="Receipt" onClose={onClose} wide>
        <ReceiptBody payment={live} viewerId={user.id} />
        <div className="flex justify-end gap-2 mt-6"><Button variant="secondary" onClick={onClose}>Close</Button><Button onClick={print}><Printer className="w-4 h-4" />Print or save as PDF</Button></div>
      </Modal>
      {createPortal(<div className="print-only"><ReceiptBody payment={live} viewerId={user.id} /></div>, document.body)}
    </>
  );
}

/* ---------- Dispute ---------- */
export function DisputeModal({ payment, onClose }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const subject = paymentSubject(db, payment);

  const submit = (e) => {
    e.preventDefault();
    const res = run('raiseDispute', { paymentId: payment.id, userId: user.id, reason });
    if (!res.ok) return setError(res.error);
    showToast('Issue reported. The money is frozen until the admin decides.', 'success');
    return onClose();
  };

  return (
    <Modal title="Report a problem" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-zinc-50 p-3 text-sm"><div className="font-bold">{subject.title}</div><div className="text-xs text-zinc-500">{inr(payment.amount)} to {partyName(db, payment.payeeId)}</div></div>
        <Notice>While the issue is open, {partyName(db, payment.payeeId)} cannot receive this money. The admin will either refund you or release it. Orders also release automatically {AUTO_RELEASE_DAYS} days after delivery, so report problems before then.</Notice>
        <Field label="What went wrong?"><textarea required rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} placeholder="Describe the problem: quality, quantity, damage, delay…" className={inputCls} /></Field>
        {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" variant="danger"><Flag className="w-4 h-4" />Report problem</Button></div>
      </form>
    </Modal>
  );
}

/* ---------- Buttons for one payment, from the signed-in user's side. Owns its modals. ---------- */
export function PaymentActions({ payment, size = 'sm' }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [modal, setModal] = useState(null);
  const p = db.payments.find((x) => x.id === payment.id) || payment;
  const isPayer = p.payerId === user.id;
  const order = p.kind === 'Order' ? db.orders.find((o) => o.id === p.orderId) : null;

  const canPay = isPayer && p.status === 'Pending' && !isCod(p);
  const canChangeMethod = isPayer && p.status === 'Pending' && isCod(p);
  const canConfirm = isPayer && p.kind === 'Order' && p.status === 'In escrow' && order?.status === 'Delivered';
  const canDispute = isPayer && p.status === 'In escrow';
  const hasReceipt = ['In escrow', 'Paid', 'Disputed', 'Refunded'].includes(p.status);

  const confirm = () => {
    if (!window.confirm('Confirm that you received the goods in good condition? The money will be released to the farmer.')) return;
    const res = run('confirmReceipt', { paymentId: p.id, userId: user.id });
    showToast(res.ok ? 'Thanks. Payment released to the farmer.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canPay && <Button size={size} onClick={() => setModal('pay')}><CreditCard className="w-3.5 h-3.5" />Pay {inr(p.amount)}</Button>}
        {canChangeMethod && <Button size={size} variant="secondary" onClick={() => setModal('pay')}>Pay online instead</Button>}
        {canConfirm && <Button size={size} onClick={confirm}><CheckCircle2 className="w-3.5 h-3.5" />Confirm receipt</Button>}
        {canDispute && <Button size={size} variant="danger" onClick={() => setModal('dispute')}><Flag className="w-3.5 h-3.5" />Report problem</Button>}
        {hasReceipt && <Button size={size} variant="secondary" onClick={() => setModal('receipt')}><Receipt className="w-3.5 h-3.5" />Receipt</Button>}
      </div>
      {modal === 'pay' && <CheckoutModal payment={p} onClose={() => setModal(null)} />}
      {modal === 'receipt' && <ReceiptModal payment={p} onClose={() => setModal(null)} />}
      {modal === 'dispute' && <DisputeModal payment={p} onClose={() => setModal(null)} />}
    </>
  );
}

/* ---------- Compact payment panel for order, shipment and booking cards ---------- */
export function PaymentStrip({ payment, className }) {
  const { db } = useData();
  const { user } = useAuth();
  if (!payment) return null;
  const p = db.payments.find((x) => x.id === payment.id) || payment;
  const payer = p.payerId === user.id;
  return (
    <div className={cx('rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="min-w-0 flex-1 basis-64">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{payer ? `You pay · ${KIND_LABEL[p.kind]}` : `You receive · ${KIND_LABEL[p.kind]}`}</div>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-lg font-black text-zinc-900">{inr(payer ? p.amount : p.netAmount)}</span>
          <StatusBadge status={p.status} />
          <span className="text-[11px] text-zinc-400">{p.instrument || p.method}</span>
        </div>
        {!payer && <div className="text-[11px] text-zinc-400">{inr(p.amount)} paid by buyer, less {inr(p.platformFee)} platform fee</div>}
        <p className="text-xs text-zinc-500 mt-1">{statusHelp(db, p, user.id)}</p>
      </div>
      <PaymentActions payment={p} />
    </div>
  );
}
