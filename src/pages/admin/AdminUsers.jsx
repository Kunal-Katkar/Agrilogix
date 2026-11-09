import React, { useMemo, useState } from 'react';
import { Search, Phone, Mail, MapPin } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, DataTable, StatusBadge, Button, Modal, Field, inputCls, Avatar, Notice, Meta } from '../../components/common';
import { ROLE_META } from '../../context/AuthContext';
import { kycStatus, kycItems, KYC_STATES } from '../../lib/kyc';
import KycReviewModal from '../../components/KycReviewModal';
import { userActivity } from '../../lib/analytics';
import { inr, fmtDateTime } from '../../lib/format';

const money = (label, v) => (/value|Spend|earned/i.test(label) ? inr(v) : v);

function UserModal({ user, onClose, onKyc }) {
  const { db, run } = useData();
  const { showToast } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const status = kycStatus(user);
  const suspended = user.status === 'Suspended';
  const items = kycItems(user);
  const history = db.events.filter((e) => e.entityType === 'User' && e.entityId === user.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const toggle = () => {
    const res = run('setUserStatus', { userId: user.id, status: suspended ? 'Active' : 'Suspended', note: reason });
    if (!res.ok) return setError(res.error);
    showToast(suspended ? `${user.name} reactivated.` : `${user.name} suspended and signed out.`, 'success');
    onClose();
  };

  return (
    <Modal title="User details" onClose={onClose} wide>
      <div className="flex items-center gap-4 mb-5">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0">
          <div className="text-xl font-black text-zinc-900 truncate">{user.name}</div>
          <div className="text-sm text-zinc-500">{ROLE_META[user.role].label} · ID {user.id}</div>
          <div className="flex flex-wrap gap-2 mt-1.5"><StatusBadge status={status} /><StatusBadge status={suspended ? 'Suspended' : 'Active'} /></div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-5 text-sm">
        <Meta label="Email"><span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-emerald-600" />{user.email}</span></Meta>
        <Meta label="Phone"><span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" />{user.phone}</span></Meta>
        <Meta label="Location"><span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{user.location}</span></Meta>
        {user.company && <Meta label="Business">{user.company}</Meta>}
        {user.farmName && <Meta label="Farm">{user.farmName} · {user.farmSize}</Meta>}
        {user.gstNumber && <Meta label="GSTIN">{user.gstNumber}</Meta>}
        {user.licenseNumber && <Meta label="Licence number">{user.licenseNumber}</Meta>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {userActivity(db, user).map(([label, v]) => (
          <div key={label} className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5">
            <div className="text-lg font-black text-zinc-900 tabular-nums">{money(label, v)}</div>
            <div className="text-[11px] font-semibold text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-2"><h4 className="font-extrabold text-sm text-zinc-900">KYC</h4><StatusBadge status={status} /></div>
        {items.length ? items.map(([label, value, at]) => (
          <div key={label} className="text-sm py-1"><span className="font-semibold text-zinc-800">{label}: </span><span className="text-zinc-700">{value}</span>{at && <span className="text-xs text-zinc-400"> · {fmtDateTime(at)}</span>}</div>
        )) : <p className="text-sm text-zinc-500">No KYC submitted.</p>}
        {user.kycNote && <p className="text-xs text-zinc-600 mt-2 bg-zinc-50 rounded-lg px-3 py-2">Admin note: {user.kycNote}</p>}
        {status === 'Under review' && <div className="mt-3"><Button size="sm" onClick={() => { onClose(); onKyc(user); }}>Review KYC</Button></div>}
      </div>

      {history.length > 0 && (
        <div className="mb-5">
          <h4 className="font-extrabold text-sm text-zinc-900 mb-2">Account history</h4>
          <ul className="space-y-1.5">{history.map((e) => <li key={e.id} className="text-xs text-zinc-600"><span className="font-bold text-zinc-800">{e.status}</span> · {e.note} · {fmtDateTime(e.timestamp)}</li>)}</ul>
        </div>
      )}

      <div className="border-t border-zinc-100 pt-4">
        {suspended ? (
          <>
            {user.statusNote && <Notice>Suspended: {user.statusNote}</Notice>}
            <div className="flex justify-end mt-3"><Button onClick={toggle}>Reactivate account</Button></div>
          </>
        ) : (
          <>
            <Field label="Suspend this account" hint="The user is signed out at once and their listings are hidden from buyers. Give a reason.">
              <input value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} placeholder="Reason for suspension" className={inputCls} />
            </Field>
            {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mt-2">{error}</div>}
            <div className="flex justify-end mt-3"><Button variant="danger" onClick={toggle}>Suspend account</Button></div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function AdminUsers() {
  const { db } = useData();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [kyc, setKyc] = useState('');
  const [state, setState] = useState('');
  const [open, setOpen] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const users = useMemo(() => db.users.filter((u) => u.role !== 'Admin').filter((u) => (
    (!q || `${u.name} ${u.email} ${u.location} ${u.company || ''} ${u.farmName || ''}`.toLowerCase().includes(q.toLowerCase()))
    && (!role || u.role === role) && (!kyc || kycStatus(u) === kyc) && (!state || (u.status || 'Active') === state)
  )), [db.users, q, role, kyc, state]);

  const current = open && db.users.find((u) => u.id === open);
  const reviewUser = reviewing && db.users.find((u) => u.id === reviewing);

  return (
    <>
      <PageHeader title="Users" subtitle={`${db.users.filter((u) => u.role !== 'Admin').length} registered accounts across all roles.`} />
      <Card className="mb-5">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="relative"><Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or location" className={`${inputCls} pl-9`} aria-label="Search users" /></div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} aria-label="Role"><option value="">All roles</option>{['Farmer', 'Customer', 'Transporter', 'StorageOwner'].map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}</select>
          <select value={kyc} onChange={(e) => setKyc(e.target.value)} className={inputCls} aria-label="KYC status"><option value="">Any KYC status</option>{KYC_STATES.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={state} onChange={(e) => setState(e.target.value)} className={inputCls} aria-label="Account state"><option value="">Active and suspended</option><option>Active</option><option>Suspended</option></select>
        </div>
      </Card>

      <Card>
        <DataTable
          rows={users}
          empty="No users match your filters."
          columns={[
            { key: 'n', label: 'User', render: (u) => <div className="flex items-center gap-3"><Avatar name={u.name} /><div className="min-w-0"><div className="font-bold text-zinc-900">{u.name}</div><div className="text-xs text-zinc-500">{u.email}</div></div></div> },
            { key: 'r', label: 'Role', render: (u) => ROLE_META[u.role].label },
            { key: 'l', label: 'Location', render: (u) => u.location },
            { key: 'k', label: 'KYC', render: (u) => <StatusBadge status={kycStatus(u)} /> },
            { key: 's', label: 'Account', render: (u) => <StatusBadge status={u.status === 'Suspended' ? 'Suspended' : 'Active'} /> },
            { key: 'a', label: '', render: (u) => <Button size="sm" variant="secondary" onClick={() => setOpen(u.id)}>View</Button> },
          ]}
        />
      </Card>

      {current && <UserModal user={current} onClose={() => setOpen(null)} onKyc={(u) => setReviewing(u.id)} />}
      {reviewUser && <KycReviewModal user={reviewUser} onClose={() => setReviewing(null)} />}
    </>
  );
}
