import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { ROLE_META } from '../context/AuthContext';
import { Button, Field, Modal, inputCls, Notice, StatusBadge, Meta } from './common';
import { kycItems, kycStatus } from '../lib/kyc';
import { fmtDateTime } from '../lib/format';

// Admin decision on one KYC submission. Rejecting needs a reason, which the user sees.
export default function KycReviewModal({ user, onClose }) {
  const { run } = useData();
  const { showToast } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const items = kycItems(user);

  const decide = (approve) => {
    const res = run('reviewKyc', { userId: user.id, approve, note });
    if (!res.ok) return setError(res.error);
    showToast(approve ? `${user.name} verified.` : `KYC rejected. ${user.name} can see your reason and resubmit.`, 'success');
    onClose();
  };

  return (
    <Modal title={`Review KYC · ${user.name}`} onClose={onClose} wide>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="text-sm text-zinc-600">{ROLE_META[user.role].label} · {user.location}</div>
        <StatusBadge status={kycStatus(user)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <Meta label="Email">{user.email}</Meta>
        <Meta label="Phone">{user.phone}</Meta>
        {user.farmName && <Meta label="Farm">{user.farmName}</Meta>}
        {user.company && <Meta label="Business">{user.company}</Meta>}
      </div>

      <div className="space-y-2 mb-4">
        <h4 className="font-extrabold text-sm text-zinc-900">Submitted</h4>
        {items.length === 0 && <p className="text-sm text-zinc-500">Nothing was submitted.</p>}
        {items.map(([label, value, at]) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3">
            <FileText className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-zinc-500">{label}</div>
              <div className="text-sm text-zinc-900 break-words">{value}</div>
              {at && <div className="text-[11px] text-zinc-400">Submitted {fmtDateTime(at)}</div>}
            </div>
          </div>
        ))}
      </div>
      <Notice tone="blue">Prototype: only file names and entered details are stored, so there is no document preview. In the final release the reviewer would open the uploaded files here.</Notice>

      <div className="mt-4">
        <Field label="Note to the user" hint="Required if you reject. Optional when approving.">
          <textarea rows={3} value={note} onChange={(e) => { setNote(e.target.value); setError(''); }} placeholder="e.g. The document is blurry, please upload a clear scan." className={inputCls} />
        </Field>
      </div>
      {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mt-3">{error}</div>}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="danger" onClick={() => decide(false)}>Reject</Button>
        <Button onClick={() => decide(true)}>Approve</Button>
      </div>
    </Modal>
  );
}
