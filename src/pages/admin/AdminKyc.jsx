import React, { useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_META } from '../../context/AuthContext';
import { PageHeader, Card, StatusBadge, Button, EmptyState, Avatar, cx } from '../../components/common';
import KycReviewModal from '../../components/KycReviewModal';
import { kycStatus, kycItems, KYC_STATES } from '../../lib/kyc';
import { fmtDateTime } from '../../lib/format';

export default function AdminKyc() {
  const { db, run } = useData();
  const { showToast } = useToast();
  const [tab, setTab] = useState('Under review');
  const [role, setRole] = useState('');
  const [reviewing, setReviewing] = useState(null);

  const people = db.users.filter((u) => u.role !== 'Admin');
  const counts = Object.fromEntries(KYC_STATES.map((s) => [s, people.filter((u) => kycStatus(u) === s).length]));
  const list = people.filter((u) => kycStatus(u) === tab && (!role || u.role === role));
  const current = reviewing && db.users.find((u) => u.id === reviewing);

  const quickApprove = (u) => {
    const res = run('reviewKyc', { userId: u.id, approve: true, note: '' });
    showToast(res.ok ? `${u.name} verified.` : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <>
      <PageHeader title="KYC reviews" subtitle="Check what users submitted, then approve them or send them back with a reason." />
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {KYC_STATES.map((s) => (
          <button key={s} type="button" onClick={() => setTab(s)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === s ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>
            {s} ({counts[s]})
          </button>
        ))}
        <select value={role} onChange={(e) => setRole(e.target.value)} className="sm:ml-auto px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white" aria-label="Role">
          <option value="">All roles</option>{['Farmer', 'Customer', 'Transporter', 'StorageOwner'].map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={tab === 'Under review' ? 'Nothing waiting for review' : `No accounts with status "${tab}"`} text={tab === 'Under review' ? 'New KYC submissions will appear here.' : undefined} />
      ) : (
        <div className="space-y-4">
          {list.map((u) => (
            <Card key={u.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} />
                  <div className="min-w-0">
                    <div className="font-extrabold text-zinc-900">{u.name}</div>
                    <div className="text-xs text-zinc-500">{ROLE_META[u.role].label} · {u.location} · {u.email}</div>
                  </div>
                </div>
                <StatusBadge status={kycStatus(u)} />
              </div>

              <div className="mt-3 space-y-1.5">
                {kycItems(u).length === 0 && <p className="text-sm text-zinc-500">No documents or details on file.</p>}
                {kycItems(u).map(([label, value, at]) => (
                  <div key={label} className="flex items-start gap-2 text-sm"><FileText className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /><span><b className="text-zinc-800">{label}:</b> <span className="text-zinc-700">{value}</span>{at && <span className="text-xs text-zinc-400"> · {fmtDateTime(at)}</span>}</span></div>
                ))}
                {u.kycNote && <p className="text-xs text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2 mt-2">{kycStatus(u) === 'Rejected' ? 'Reason given: ' : 'Admin note: '}{u.kycNote}</p>}
              </div>

              {tab === 'Under review' && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-100">
                  <Button size="sm" variant="secondary" onClick={() => setReviewing(u.id)}>Review in detail</Button>
                  <Button size="sm" onClick={() => quickApprove(u)}>Approve</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {current && <KycReviewModal user={current} onClose={() => setReviewing(null)} />}
    </>
  );
}
