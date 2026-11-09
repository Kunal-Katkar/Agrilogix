import React, { useMemo, useState } from 'react';
import { Wallet, Hourglass, Clock, HandCoins, ShieldCheck, CreditCard, Undo2, IndianRupee, Landmark, Scale, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, Button, Field, inputCls, EmptyState, Notice, cx } from '../../components/common';
import { PaymentActions, PaymentStrip } from '../../components/PaymentParts';
import { inr, fmtDate, fmtDateTime } from '../../lib/format';
import {
  walletOf, spendingOf, duesOf, describeAccount, paymentSubject, partyName, PAYER_ROLES, RECEIVER_ROLES, KINDS, KIND_LABEL,
  PAYMENT_STATUSES, MIN_PAYOUT, validatePayoutAccount, BANKS,
} from '../../lib/payments';

const TAB_CLS = (on) => cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', on ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50');

/* ---------- Payout account + withdrawal ---------- */
function PayoutAccountCard({ user }) {
  const { run } = useData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(!user.payoutAccount);
  const [a, setA] = useState(() => user.payoutAccount || { type: 'UPI', upiId: '', holder: user.name, accountNumber: '', ifsc: '', bankName: BANKS[0] });
  const [error, setError] = useState('');
  const set = (k, v) => { setA((prev) => ({ ...prev, [k]: v })); setError(''); };

  const save = (e) => {
    e.preventDefault();
    const problem = validatePayoutAccount(a);
    if (problem) return setError(problem);
    const res = run('savePayoutAccount', { userId: user.id, account: a });
    if (!res.ok) return setError(res.error);
    showToast('Payout account saved.', 'success');
    return setEditing(false);
  };

  return (
    <Card title="Where to send my money" action={user.payoutAccount && !editing ? <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change</Button> : null}>
      {!editing && user.payoutAccount ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
          <div><div className="font-bold text-zinc-900">{describeAccount(user.payoutAccount)}</div><div className="text-xs text-zinc-500">{user.payoutAccount.type === 'Bank' ? `${user.payoutAccount.holder} · IFSC ${user.payoutAccount.ifsc}` : 'Withdrawals go to this UPI id'}</div></div>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div className="flex gap-2">
            {[['UPI', 'UPI id'], ['Bank', 'Bank account']].map(([k, label]) => (
              <button key={k} type="button" onClick={() => set('type', k)} className={cx('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border', a.type === k ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-zinc-600 border-zinc-200')}>{label}</button>
            ))}
          </div>
          {a.type === 'UPI' ? (
            <Field label="UPI id"><input value={a.upiId || ''} onChange={(e) => set('upiId', e.target.value)} placeholder="name@bank" className={inputCls} /></Field>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Account holder"><input value={a.holder || ''} onChange={(e) => set('holder', e.target.value)} className={inputCls} /></Field>
              <Field label="Bank"><select value={a.bankName || BANKS[0]} onChange={(e) => set('bankName', e.target.value)} className={inputCls}>{BANKS.map((b) => <option key={b}>{b}</option>)}</select></Field>
              <Field label="Account number"><input inputMode="numeric" value={a.accountNumber || ''} onChange={(e) => set('accountNumber', e.target.value.replace(/\D/g, ''))} className={inputCls} /></Field>
              <Field label="IFSC code"><input value={a.ifsc || ''} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" className={inputCls} /></Field>
            </div>
          )}
          {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
          <div className="flex justify-end gap-2">
            {user.payoutAccount && <Button variant="secondary" onClick={() => { setEditing(false); setError(''); }}>Cancel</Button>}
            <Button type="submit">Save account</Button>
          </div>
          <p className="text-[11px] text-zinc-400">Only the last four digits of an account number are shown after saving. Prototype note: details are kept in this browser only.</p>
        </form>
      )}
    </Card>
  );
}

function WithdrawCard({ user, wallet }) {
  const { run } = useData();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const res = run('requestPayout', { userId: user.id, amount });
    if (!res.ok) return setError(res.error);
    showToast('Withdrawal requested. It is paid out after the platform approves it.', 'success');
    setAmount('');
    return setError('');
  };

  return (
    <Card title="Withdraw to my account">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div><div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Available</div><div className="text-3xl font-black text-emerald-800">{inr(wallet.available)}</div></div>
          <Button size="sm" variant="secondary" disabled={wallet.available <= 0} onClick={() => { setAmount(String(wallet.available)); setError(''); }}>Withdraw all</Button>
        </div>
        <Field label="Amount (₹)" hint={`Minimum ${inr(MIN_PAYOUT)}. Payouts are approved by the platform and sent to ${describeAccount(user.payoutAccount)}.`}>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} disabled={!user.payoutAccount} className={inputCls} />
        </Field>
        {!user.payoutAccount && <Notice>Save a bank account or UPI id first.</Notice>}
        {wallet.balance < 0 && <Notice>Your balance is negative because of commission on cash sales. It is settled against your next earnings.</Notice>}
        {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex justify-end"><Button type="submit" disabled={!user.payoutAccount || !amount}>Request withdrawal</Button></div>
      </form>
    </Card>
  );
}

function WalletTab({ user }) {
  const { db } = useData();
  const w = walletOf(db, user.id);
  const payouts = db.payouts.filter((x) => x.userId === user.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const ledger = [...w.ledger].reverse();
  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-2 gap-5">
        <WithdrawCard user={user} wallet={w} />
        <PayoutAccountCard user={user} />
      </div>
      <Card title="Wallet activity">
        <DataTable
          rows={ledger}
          empty="No wallet activity yet. Earnings appear here when payments are released to you."
          columns={[
            { key: 'at', label: 'Date', render: (e) => fmtDate(e.at) },
            { key: 'type', label: 'Type', render: (e) => <StatusBadge status={e.type === 'Credit' ? 'Paid' : e.type === 'Payout' ? 'Processing' : 'Pending'} /> },
            { key: 'note', label: 'Details', render: (e) => <span className="text-zinc-700">{e.note}</span> },
            { key: 'amount', label: 'Amount', render: (e) => <span className={cx('font-bold', e.amount >= 0 ? 'text-emerald-700' : 'text-zinc-800')}>{e.amount >= 0 ? '+' : '-'} {inr(Math.abs(e.amount))}</span> },
            { key: 'balance', label: 'Balance', render: (e) => inr(e.balance) },
          ]}
        />
      </Card>
      <Card title="Withdrawals">
        <DataTable
          rows={payouts}
          empty="You have not withdrawn anything yet."
          columns={[
            { key: 'id', label: 'Withdrawal' },
            { key: 'at', label: 'Requested', render: (x) => fmtDateTime(x.requestedAt) },
            { key: 'amount', label: 'Amount', render: (x) => <b>{inr(x.amount)}</b> },
            { key: 'destination', label: 'To' },
            { key: 'status', label: 'Status', render: (x) => <StatusBadge status={x.status} /> },
            { key: 'ref', label: 'Reference', render: (x) => x.reference || x.note || '-' },
          ]}
        />
      </Card>
    </div>
  );
}

/* ---------- Transactions ---------- */
function Transactions({ user }) {
  const { db } = useData();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const rows = useMemo(() => db.payments
    .filter((p) => p.payerId === user.id || p.payeeId === user.id)
    .filter((p) => (!kind || p.kind === kind) && (!status || p.status === status))
    .filter((p) => {
      if (!q.trim()) return true;
      const s = paymentSubject(db, p);
      return `${p.id} ${p.refId} ${s.title} ${partyName(db, p.payerId)} ${partyName(db, p.payeeId)}`.toLowerCase().includes(q.trim().toLowerCase());
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [db, user.id, kind, status, q]);

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
            { key: 'date', label: 'Date', render: (p) => fmtDate(p.createdAt) },
            { key: 'what', label: 'For', render: (p) => { const s = paymentSubject(db, p); return <div><div className="font-semibold text-zinc-900">{s.title}</div><div className="text-xs text-zinc-400">{KIND_LABEL[p.kind]} · {p.id}</div></div>; } },
            { key: 'with', label: 'With', render: (p) => <div><div>{partyName(db, p.payerId === user.id ? p.payeeId : p.payerId)}</div><div className="text-xs text-zinc-400">{p.payerId === user.id ? 'You paid' : 'You receive'}</div></div> },
            { key: 'amount', label: 'Amount', render: (p) => (p.payerId === user.id
              ? <span className="font-bold text-zinc-900">- {inr(p.amount)}</span>
              : <div><span className="font-bold text-emerald-700">+ {inr(p.netAmount)}</span><div className="text-xs text-zinc-400">after {inr(p.platformFee)} fee</div></div>) },
            { key: 'method', label: 'Method', render: (p) => <span className="text-xs text-zinc-600">{p.instrument || p.method}</span> },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'actions', label: '', render: (p) => <PaymentActions payment={p} /> },
          ]}
        />
      </Card>
    </>
  );
}

/* ---------- Payments I still have to make ---------- */
function ToPay({ user }) {
  const { db } = useData();
  // A payment stays on this list after it is paid (showing its new status and a receipt) until the tab is left.
  // Otherwise the card, and the checkout confirmation it owns, would vanish the moment the payment succeeds.
  const dueIds = [...duesOf(db, user.id), ...db.payments.filter((p) => p.payerId === user.id && p.status === 'Pending' && p.method === 'Cash on delivery')].map((p) => p.id);
  const [seen, setSeen] = useState(() => new Set(dueIds));
  if (dueIds.some((id) => !seen.has(id))) setSeen(new Set([...seen, ...dueIds]));
  const list = db.payments.filter((p) => seen.has(p.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!list.length) {
    return <EmptyState icon={ShieldCheck} title="Nothing to pay" text="You are all caught up. New payments appear here as soon as an order is placed or a transporter or storage provider is chosen." />;
  }
  return (
    <div className="space-y-4">
      {list.map((p) => {
        const s = paymentSubject(db, p);
        return (
          <Card key={p.id}>
            <div className="mb-3"><div className="text-xs font-bold text-zinc-400">{KIND_LABEL[p.kind]} · {s.sub} · requested {fmtDate(p.createdAt)}</div><h3 className="font-extrabold text-zinc-900">{s.title}</h3><div className="text-xs text-zinc-500">To {partyName(db, p.payeeId)}</div></div>
            <PaymentStrip payment={p} />
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Disputes ---------- */
function Disputes({ user }) {
  const { db } = useData();
  const rows = db.disputes.filter((d) => d.raisedBy === user.id || d.against === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!rows.length) return <EmptyState icon={Scale} title="No disputes" text="If something goes wrong with a delivery or service you paid for, use 'Report problem' on the payment while it is held in escrow." />;
  return (
    <div className="space-y-4">
      {rows.map((d) => {
        const p = db.payments.find((x) => x.id === d.paymentId);
        const s = p && paymentSubject(db, p);
        const mine = d.raisedBy === user.id;
        return (
          <Card key={d.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="text-xs font-bold text-zinc-400">{d.id} · {fmtDate(d.createdAt)} · {mine ? 'raised by you' : `raised by ${partyName(db, d.raisedBy)} against you`}</div><h3 className="font-extrabold text-zinc-900">{s?.title}</h3><div className="text-xs text-zinc-500">{p && inr(p.amount)} · {p?.id}</div></div>
              <StatusBadge status={d.status} />
            </div>
            <p className="text-sm text-zinc-700 bg-zinc-50 rounded-xl p-3 mt-3">{d.reason}</p>
            {d.status === 'Resolved' && <p className="text-sm text-emerald-900 bg-emerald-50 rounded-xl p-3 mt-2"><b>{d.resolution}.</b> {d.adminNote}</p>}
            {d.status === 'Open' && <p className="text-xs text-zinc-500 mt-2">The platform admin is reviewing this. The money stays frozen until a decision is made.</p>}
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Page ---------- */
export default function PaymentsPage() {
  const { user } = useAuth();
  const { db } = useData();
  const [params, setParams] = useSearchParams();
  const pays = PAYER_ROLES.includes(user.role);
  const receives = RECEIVER_ROLES.includes(user.role);
  const wallet = walletOf(db, user.id);
  const spend = spendingOf(db, user.id);
  const dueCount = duesOf(db, user.id).length;
  const disputeCount = db.disputes.filter((d) => d.raisedBy === user.id || d.against === user.id).length;

  const tabs = [
    pays && ['due', `To pay${dueCount ? ` (${dueCount})` : ''}`],
    ['all', 'Transactions'],
    receives && ['wallet', 'Wallet & payouts'],
    ['disputes', `Disputes${disputeCount ? ` (${disputeCount})` : ''}`],
  ].filter(Boolean);
  const wanted = params.get('tab');
  const [tab, setTabState] = useState(tabs.some(([k]) => k === wanted) ? wanted : (pays && dueCount ? 'due' : receives ? 'wallet' : 'all'));
  const setTab = (k) => { setTabState(k); if (params.get('tab')) setParams({}, { replace: true }); };

  return (
    <>
      <PageHeader title="Payments" subtitle={receives && pays ? 'Money you owe for transport and storage, and money you earn from sales.' : receives ? 'Your earnings, wallet and withdrawals.' : 'Pay for your orders securely and keep your receipts.'} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {receives ? (
          <>
            <StatCard icon={Wallet} label="Wallet balance" value={inr(wallet.available)} hint={wallet.balance < 0 ? `Commission owed: ${inr(-wallet.balance)}` : 'Ready to withdraw'} />
            <StatCard icon={Hourglass} label="In escrow for you" value={inr(wallet.inEscrow)} tone="blue" hint="Released on delivery or completion" />
            {pays
              ? <StatCard icon={CreditCard} label="You still have to pay" value={inr(spend.due)} tone="amber" hint={`${dueCount} payment${dueCount === 1 ? '' : 's'} due`} />
              : <StatCard icon={Clock} label="Awaiting payment" value={inr(wallet.awaitingPayer)} tone="amber" hint="Not yet paid by the farmer or buyer" />}
            <StatCard icon={HandCoins} label="Withdrawn" value={inr(wallet.withdrawn)} hint={wallet.processing ? `${inr(wallet.processing)} processing` : `${inr(wallet.earned)} earned in all`} />
          </>
        ) : (
          <>
            <StatCard icon={IndianRupee} label="Paid so far" value={inr(spend.paid)} hint="Released to farmers" />
            <StatCard icon={Hourglass} label="Held in escrow" value={inr(spend.inEscrow)} tone="blue" hint="Protected until you confirm receipt" />
            <StatCard icon={CreditCard} label="Payments due" value={inr(spend.due)} tone="amber" hint={`${dueCount} order${dueCount === 1 ? '' : 's'} to pay`} />
            <StatCard icon={Undo2} label="Refunded" value={inr(spend.refunded)} tone="red" />
          </>
        )}
      </div>

      {pays && receives && (
        <div className="mb-5 grid sm:grid-cols-3 gap-4">
          <StatCard icon={IndianRupee} label="Paid out so far" value={inr(spend.paid)} hint="Transport and storage fees released" />
          <StatCard icon={Hourglass} label="Your payments in escrow" value={inr(spend.inEscrow)} tone="blue" />
          <StatCard icon={Undo2} label="Refunded to you" value={inr(spend.refunded)} tone="red" />
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={TAB_CLS(tab === k)}>{label}</button>)}
      </div>

      {tab === 'due' && <ToPay user={user} />}
      {tab === 'all' && <Transactions user={user} />}
      {tab === 'wallet' && <WalletTab user={user} />}
      {tab === 'disputes' && <Disputes user={user} />}
    </>
  );
}
