import React, { useMemo, useState } from 'react';
import { Percent, Hourglass, IndianRupee, Undo2, Scale, HandCoins, Clock, Search } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, Button, Modal, Field, inputCls, EmptyState, Notice, cx } from '../../components/common';
import { PaymentActions } from '../../components/PaymentParts';
import { inr, fmtDate, fmtDateTime } from '../../lib/format';
import { payout as gatewayPayout } from '../../lib/gateway';
import { platformSummary, paymentSubject, partyName, KINDS, KIND_LABEL, PAYMENT_STATUSES, FEE_RATES, describeAccount } from '../../lib/payments';

const TAB_CLS = (on) => cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', on ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50');

function ResolveModal({ dispute, payment, onClose }) {
  const { db, run } = useData();
  const { showToast } = useToast();
  const [resolution, setResolution] = useState('refund');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const subject = paymentSubject(db, payment);

  const submit = (e) => {
    e.preventDefault();
    const res = run('resolveDispute', { disputeId: dispute.id, resolution, note });
    if (!res.ok) return setError(res.error);
    showToast(resolution === 'refund' ? 'Dispute resolved: payer refunded.' : 'Dispute resolved: money released to the payee.', 'success');
    return onClose();
  };

  return (
    <Modal title={`Resolve ${dispute.id}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-zinc-50 p-3 text-sm">
          <div className="font-bold">{subject.title}</div>
          <div className="text-xs text-zinc-500">{inr(payment.amount)} · {partyName(db, payment.payerId)} paid {partyName(db, payment.payeeId)}</div>
          <p className="mt-2 text-zinc-700">"{dispute.reason}"</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[['refund', 'Refund the payer'], ['release', 'Release to the payee']].map(([k, label]) => (
            <button key={k} type="button" onClick={() => setResolution(k)} className={cx('rounded-xl border px-3 py-3 text-sm font-bold cursor-pointer', resolution === k ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30' : 'border-zinc-200 text-zinc-600')}>{label}</button>
          ))}
        </div>
        <Notice tone="blue">{resolution === 'refund' ? `${inr(payment.amount)} goes back to the payer's original payment method. The payee receives nothing.` : `${inr(payment.netAmount)} goes to the payee's wallet after a ${inr(payment.platformFee)} platform fee.`} The order or booking itself is not changed.</Notice>
        <Field label="Decision note (shown to both sides)"><textarea required rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} className={inputCls} /></Field>
        {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Confirm decision</Button></div>
      </form>
    </Modal>
  );
}

function DisputesTab() {
  const { db } = useData();
  const [resolving, setResolving] = useState(null);
  const rows = [...db.disputes].sort((a, b) => (a.status === 'Open' ? 0 : 1) - (b.status === 'Open' ? 0 : 1) || b.createdAt.localeCompare(a.createdAt));
  if (!rows.length) return <EmptyState icon={Scale} title="No disputes" text="Disputes raised by payers appear here for you to decide." />;
  return (
    <div className="space-y-4">
      {rows.map((d) => {
        const p = db.payments.find((x) => x.id === d.paymentId);
        const s = p && paymentSubject(db, p);
        return (
          <Card key={d.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-zinc-400">{d.id} · {p?.id} · {fmtDate(d.createdAt)}</div>
                <h3 className="font-extrabold text-zinc-900">{s?.title}</h3>
                <div className="text-xs text-zinc-500">{partyName(db, d.raisedBy)} (payer) vs {partyName(db, d.against)} · {p && inr(p.amount)}</div>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <p className="text-sm text-zinc-700 bg-zinc-50 rounded-xl p-3 mt-3">{d.reason}</p>
            {d.status === 'Resolved'
              ? <p className="text-sm text-emerald-900 bg-emerald-50 rounded-xl p-3 mt-2"><b>{d.resolution}</b> on {fmtDate(d.resolvedAt)}. {d.adminNote}</p>
              : <div className="flex justify-end mt-3"><Button size="sm" onClick={() => setResolving(d)}>Review and decide</Button></div>}
          </Card>
        );
      })}
      {resolving && <ResolveModal dispute={resolving} payment={db.payments.find((x) => x.id === resolving.paymentId)} onClose={() => setResolving(null)} />}
    </div>
  );
}

function PayoutsTab() {
  const { db, run } = useData();
  const { showToast } = useToast();
  const [busy, setBusy] = useState('');
  const rows = [...db.payouts].sort((a, b) => (a.status === 'Processing' ? 0 : 1) - (b.status === 'Processing' ? 0 : 1) || b.requestedAt.localeCompare(a.requestedAt));

  const approve = async (x) => {
    const user = db.users.find((u) => u.id === x.userId);
    setBusy(x.id);
    const sent = await gatewayPayout({ amount: x.amount, account: user?.payoutAccount });
    setBusy('');
    if (!sent.ok) return showToast(sent.error);
    const res = run('processPayout', { payoutId: x.id, approve: true, reference: sent.gatewayRef });
    return showToast(res.ok ? `${inr(x.amount)} sent to ${user?.name}.` : res.error, res.ok ? 'success' : 'info');
  };

  const reject = (x) => {
    const note = window.prompt('Why is this withdrawal being rejected? The user will see this.');
    if (note === null) return;
    const res = run('processPayout', { payoutId: x.id, approve: false, note });
    showToast(res.ok ? 'Withdrawal rejected. The money is back in the wallet.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <Card>
      <DataTable
        rows={rows}
        empty="No withdrawals yet."
        columns={[
          { key: 'id', label: 'Withdrawal' },
          { key: 'user', label: 'User', render: (x) => { const u = db.users.find((y) => y.id === x.userId); return <div><div className="font-semibold">{u?.company || u?.name}</div><div className="text-xs text-zinc-400">{u?.role} · {describeAccount(u?.payoutAccount)}</div></div>; } },
          { key: 'amount', label: 'Amount', render: (x) => <b>{inr(x.amount)}</b> },
          { key: 'at', label: 'Requested', render: (x) => fmtDateTime(x.requestedAt) },
          { key: 'status', label: 'Status', render: (x) => <StatusBadge status={x.status} /> },
          { key: 'ref', label: 'Reference', render: (x) => x.reference || x.note || '-' },
          { key: 'act', label: '', render: (x) => (x.status === 'Processing'
            ? <div className="flex gap-2"><Button size="sm" disabled={busy === x.id} onClick={() => approve(x)}>{busy === x.id ? 'Sending…' : 'Mark paid'}</Button><Button size="sm" variant="danger" disabled={busy === x.id} onClick={() => reject(x)}>Reject</Button></div>
            : null) },
        ]}
      />
    </Card>
  );
}

function TransactionsTab() {
  const { db } = useData();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const rows = useMemo(() => db.payments
    .filter((p) => (!kind || p.kind === kind) && (!status || p.status === status))
    .filter((p) => !q.trim() || `${p.id} ${p.refId} ${paymentSubject(db, p).title} ${partyName(db, p.payerId)} ${partyName(db, p.payeeId)}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, kind, status, q]);
  return (
    <>
      <Card className="mb-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative"><Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by item, person or id" className={`${inputCls} pl-9`} /></div>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}><option value="">All types</option>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}><option value="">All statuses</option>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </div>
      </Card>
      <Card>
        <DataTable
          rows={rows}
          empty="No payments match."
          columns={[
            { key: 'id', label: 'Payment', render: (p) => <div><div className="font-semibold">{p.id}</div><div className="text-xs text-zinc-400">{fmtDate(p.createdAt)}</div></div> },
            { key: 'what', label: 'For', render: (p) => { const s = paymentSubject(db, p); return <div><div className="font-semibold text-zinc-900">{s.title}</div><div className="text-xs text-zinc-400">{KIND_LABEL[p.kind]}</div></div>; } },
            { key: 'from', label: 'From → to', render: (p) => <div className="text-xs"><div>{partyName(db, p.payerId)}</div><div className="text-zinc-400">to {partyName(db, p.payeeId)}</div></div> },
            { key: 'amount', label: 'Amount', render: (p) => <div><b>{inr(p.amount)}</b><div className="text-xs text-zinc-400">fee {inr(p.platformFee)}</div></div> },
            { key: 'method', label: 'Method', render: (p) => <span className="text-xs text-zinc-600">{p.instrument || p.method}</span> },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'act', label: '', render: (p) => <PaymentActions payment={p} /> },
          ]}
        />
      </Card>
    </>
  );
}

function FeesTab({ summary }) {
  return (
    <div className="space-y-5">
      <Card title="Platform fee by payment type">
        <DataTable
          rows={summary.byKind.map((k) => ({ ...k, id: k.kind }))}
          columns={[
            { key: 'label', label: 'Type' },
            { key: 'rate', label: 'Fee rate', render: (k) => `${(FEE_RATES[k.kind] * 100).toFixed(1)}%` },
            { key: 'count', label: 'Payments' },
            { key: 'volume', label: 'Volume (paid or in escrow)', render: (k) => inr(k.volume) },
            { key: 'fees', label: 'Fees earned', render: (k) => <b>{inr(k.fees)}</b> },
          ]}
        />
      </Card>
      <Notice tone="blue">Fees are taken from the payee's share when money is released, never added to what the payer pays. {inr(summary.feesPending)} more will be earned from payments now held in escrow. On cash-on-delivery orders the commission is debited from the farmer's wallet.</Notice>
    </div>
  );
}

export default function AdminPayments() {
  const { db } = useData();
  const s = platformSummary(db);
  const [tab, setTab] = useState(s.openDisputes ? 'disputes' : s.payoutsProcessing ? 'payouts' : 'all');
  const tabs = [
    ['all', 'Transactions'],
    ['disputes', `Disputes${s.openDisputes ? ` (${s.openDisputes})` : ''}`],
    ['payouts', `Withdrawals${s.payoutsProcessing ? ` (${s.payoutsProcessing})` : ''}`],
    ['fees', 'Fees'],
  ];
  return (
    <>
      <PageHeader title="Payments" subtitle="Escrow, disputes, withdrawals and platform fees across the whole platform." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Percent} label="Platform fees earned" value={inr(s.feesEarned)} hint={`${inr(s.feesPending)} more from escrowed payments`} />
        <StatCard icon={Hourglass} label="Held in escrow" value={inr(s.held)} tone="blue" hint="Includes disputed payments" />
        <StatCard icon={IndianRupee} label="Volume processed" value={inr(s.volume)} hint="Paid and in escrow" />
        <StatCard icon={Undo2} label="Refunded" value={inr(s.refunded)} tone="red" />
        <StatCard icon={Clock} label="Unpaid dues" value={inr(s.outstanding)} tone="amber" hint="Waiting for payers" />
        <StatCard icon={Scale} label="Open disputes" value={s.openDisputes} tone={s.openDisputes ? 'red' : 'green'} />
        <StatCard icon={HandCoins} label="Withdrawals to process" value={s.payoutsProcessing} tone={s.payoutsProcessing ? 'amber' : 'green'} hint={s.payoutsProcessing ? inr(s.payoutsProcessingAmount) : 'All settled'} />
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={TAB_CLS(tab === k)}>{label}</button>)}
      </div>
      {tab === 'all' && <TransactionsTab />}
      {tab === 'disputes' && <DisputesTab />}
      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'fees' && <FeesTab summary={s} />}
    </>
  );
}
