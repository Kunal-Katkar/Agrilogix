import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, Field, inputCls, Button, Avatar, StatusBadge, Notice } from '../../components/common';
import KycUpload from '../../components/KycUpload';
import { kycStatus } from '../../lib/kyc';

export default function FarmerProfile() {
  const { user } = useAuth();
  const { run } = useData();
  const { showToast } = useToast();
  const [f, setF] = useState({
    name: user.name, phone: user.phone, location: user.location, farmName: user.farmName, farmSize: user.farmSize,
    mainCrops: user.mainCrops.join(', '), bio: user.bio,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // KYC documents: can be completed any time after registration (SRS AU-1, AU-8).
  const [kyc, setKyc] = useState({ landProof: user.kyc?.landProof || null, organicCert: user.kyc?.organicCert || null });
  const [kycError, setKycError] = useState('');
  const status = kycStatus(user);
  const submitKyc = () => {
    if (!kyc.landProof) return setKycError('Land ownership proof is required for KYC.');
    setKycError('');
    const res = run('submitKyc', { userId: user.id, kyc });
    showToast(res.ok ? 'KYC documents submitted for review.' : res.error, res.ok ? 'success' : 'info');
  };

  const submit = (e) => {
    e.preventDefault();
    const changes = { ...f, mainCrops: f.mainCrops.split(',').map((c) => c.trim()).filter(Boolean) };
    const res = run('updateUser', { id: user.id, changes });
    showToast(res.ok ? 'Profile saved.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <>
      <PageHeader title="My profile" subtitle="This is what buyers see on your public farmer page." action={<Button as={Link} variant="secondary" to={`/farmer/preview/${user.id}`}><Eye className="w-4 h-4" />Preview public page</Button>} />
      <Card title="KYC verification" action={<StatusBadge status={status} />} className="mb-6">
        {status === 'Verified' ? (
          <p className="text-sm text-zinc-600">Your account is verified. Buyers see a Verified mark on your public profile.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              {status === 'Under review' && 'Your documents are with the platform admin for review. You can replace them below.'}
              {status === 'Rejected' && `Your KYC was rejected${user.kycNote ? `: ${user.kycNote}` : '.'} Upload a corrected document and submit again.`}
              {status === 'Not submitted' && 'No KYC documents on file. Upload them here to get a Verified mark on your public profile.'}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <KycUpload label="Land ownership proof (7/12 extract / RTC) *" hint="Upload PDF, JPG or PNG (max 5 MB)" value={kyc.landProof} onChange={(v) => setKyc((p) => ({ ...p, landProof: v }))} onError={setKycError} />
              <KycUpload label="Organic / crop certificate (optional)" hint="APEDA / Jaivik Bharat certificate" value={kyc.organicCert} onChange={(v) => setKyc((p) => ({ ...p, organicCert: v }))} onError={setKycError} />
            </div>
            {kycError && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{kycError}</div>}
            <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button onClick={submitKyc}>{status === 'Not submitted' ? 'Submit for verification' : 'Resubmit documents'}</Button>
            </div>
            <Notice tone="blue">Prototype: only file names are kept. The platform admin reviews submissions and approves or rejects them with a reason.</Notice>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-4 mb-6"><Avatar name={user.name} size="lg" /><div><div className="font-black text-lg">{user.name}</div><div className="text-sm text-zinc-500">{user.email}</div></div></div>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name"><input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></Field>
          <Field label="Mobile number"><input required value={f.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></Field>
          <Field label="Location"><input required value={f.location} onChange={(e) => set('location', e.target.value)} className={inputCls} /></Field>
          <Field label="Farm name"><input required value={f.farmName} onChange={(e) => set('farmName', e.target.value)} className={inputCls} /></Field>
          <Field label="Farm size"><input value={f.farmSize} onChange={(e) => set('farmSize', e.target.value)} placeholder="e.g. 12 acres" className={inputCls} /></Field>
          <Field label="Main crops" hint="Separate with commas"><input value={f.mainCrops} onChange={(e) => set('mainCrops', e.target.value)} className={inputCls} /></Field>
          <Field label="About the farm" className="sm:col-span-2"><textarea rows={3} value={f.bio} onChange={(e) => set('bio', e.target.value)} className={inputCls} /></Field>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save profile</Button></div>
        </form>
      </Card>
    </>
  );
}
