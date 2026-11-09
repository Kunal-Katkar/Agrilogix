import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Hourglass } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Button, Field, Modal, inputCls, cx } from './common';
import { kycStatus } from '../lib/kyc';

const HINT = {
  Customer: 'GSTIN or business registration number, and your delivery address',
  Transporter: 'Driving licence number and vehicle RC details',
  StorageOwner: 'Trade licence number and the facility address and capacity',
};

// Non-farmers submit KYC as text (farmers upload documents from My Profile).
function KycDetailsModal({ user, onClose }) {
  const { run } = useData();
  const { showToast } = useToast();
  const [summary, setSummary] = useState(user.kyc?.summary || '');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const res = run('submitKyc', { userId: user.id, kyc: { summary } });
    if (!res.ok) return setError(res.error);
    showToast('KYC details submitted for review.', 'success');
    onClose();
  };
  return (
    <Modal title="Submit KYC details" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your KYC details" hint={`Include: ${HINT[user.role]}.`}>
          <textarea required rows={4} value={summary} onChange={(e) => { setSummary(e.target.value); setError(''); }} className={inputCls} />
        </Field>
        <p className="text-[11px] text-zinc-400">Prototype: details are stored as text and reviewed by the platform admin. No documents are uploaded.</p>
        {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">Submit for review</Button></div>
      </form>
    </Modal>
  );
}

// Shown at the top of every role area until the account is verified.
export default function KycBanner({ user }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const status = kycStatus(user);
  if (status === 'Verified') return null;

  const farmer = user.role === 'Farmer';
  const onProfile = pathname === '/farmer/profile';
  const tone = { 'Not submitted': 'border-amber-200 bg-amber-50 text-amber-900', 'Under review': 'border-sky-200 bg-sky-50 text-sky-900', Rejected: 'border-red-200 bg-red-50 text-red-900' }[status];
  const Icon = status === 'Under review' ? Hourglass : status === 'Rejected' ? ShieldAlert : ShieldCheck;
  const text = {
    'Not submitted': 'Complete your KYC to get a Verified mark. Buyers and providers trust verified accounts more.',
    'Under review': 'Your KYC is with the platform admin for review. You can keep using AgriLogiX meanwhile.',
    Rejected: `Your KYC was rejected${user.kycNote ? `: ${user.kycNote}` : '.'}`,
  }[status];
  const action = status === 'Under review' ? null : farmer
    ? (!onProfile && <Button as={Link} to="/farmer/profile" size="sm">{status === 'Rejected' ? 'Resubmit documents' : 'Complete KYC'}</Button>)
    : <Button size="sm" onClick={() => setOpen(true)}>{status === 'Rejected' ? 'Resubmit details' : 'Submit KYC'}</Button>;

  return (
    <>
      <div className={cx('mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3.5', tone)} role="status">
        <div className="flex items-start gap-3 text-sm"><Icon className="w-5 h-5 shrink-0 mt-0.5" /><span><b>KYC {status.toLowerCase()}.</b> {text}</span></div>
        {action}
      </div>
      {open && <KycDetailsModal user={user} onClose={() => setOpen(false)} />}
    </>
  );
}
