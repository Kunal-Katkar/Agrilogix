import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, ListingCard, Button, Modal, Field, inputCls, EmptyState, Notice, cx } from '../../components/common';
import { storageOf, storageInfo } from '../../lib/storage';
import { CATEGORIES, UNITS } from '../../lib/format';

const MAX_IMAGE_BYTES = 400 * 1024;

function ListingForm({ initial, farmer, onSave, onClose }) {
  const { db } = useData();
  const [f, setF] = useState(initial ? { ...initial, storage: storageOf(initial) } : {
    name: '', category: 'Vegetables', quantity: '', unit: 'quintal', price: '', location: farmer.location, description: '', image: '', availability: 'Available',
    storage: { mode: 'own', note: '' },
  });
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) return setError('Image must be smaller than 400 KB.');
    const reader = new FileReader();
    reader.onload = () => { set('image', reader.result); setError(''); };
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!(Number(f.price) > 0)) return setError('Enter a valid price.');
    if (!(Number(f.quantity) >= 0)) return setError('Enter a valid quantity.');
    if (f.storage.mode === 'provider' && !f.storage.storageId) return setError('Choose the storage provider facility.');
    onSave({ ...f, name: f.name.trim(), price: Number(f.price), quantity: Number(f.quantity) });
  };

  return (
    <Modal title={initial ? 'Edit listing' : 'New produce listing'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Produce name"><input required value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Onion (Nashik Red)" className={inputCls} /></Field>
          <Field label="Category"><select value={f.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Price per unit (₹)"><input type="number" min="1" required value={f.price} onChange={(e) => set('price', e.target.value)} className={inputCls} /></Field>
          <Field label="Unit"><select value={f.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls}>{UNITS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Available quantity"><input type="number" min="0" required value={f.quantity} onChange={(e) => set('quantity', e.target.value)} className={inputCls} /></Field>
          <Field label="Availability">
            <select value={f.availability} onChange={(e) => set('availability', e.target.value)} className={inputCls}>
              {['Available', 'Limited', 'Out of stock'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Location" className="sm:col-span-2"><input required value={f.location} onChange={(e) => set('location', e.target.value)} className={inputCls} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea required rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} className={inputCls} /></Field>
          <div className="sm:col-span-2">
            <span className="block text-xs font-bold text-zinc-700 mb-1">Where is this produce stored?</span>
            <div className="grid sm:grid-cols-2 gap-2">
              {[['own', 'My own storage', 'Kept at the farm or my own godown'], ['provider', "A storage provider's facility", 'Cold storage, warehouse or silo of a provider']].map(([mode, title, text]) => (
                <button key={mode} type="button" onClick={() => set('storage', mode === 'own' ? { mode, note: f.storage.note || '' } : { mode, storageId: f.storage.storageId || '' })}
                  className={cx('text-left rounded-xl border p-3 cursor-pointer transition-colors', f.storage.mode === mode ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30' : 'border-zinc-200 hover:border-emerald-300')}>
                  <div className="text-sm font-bold text-zinc-900">{title}</div>
                  <div className="text-[11px] text-zinc-500">{text}</div>
                </button>
              ))}
            </div>
            {f.storage.mode === 'own' ? (
              <input value={f.storage.note || ''} onChange={(e) => set('storage', { mode: 'own', note: e.target.value })} placeholder="Optional detail, e.g. On-farm cold room" className={`${inputCls} mt-2`} />
            ) : (
              <div className="mt-2 space-y-2">
                <select required value={f.storage.storageId || ''} onChange={(e) => set('storage', { mode: 'provider', storageId: e.target.value })} className={inputCls}>
                  <option value="">Select a facility</option>
                  {db.storages.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.location} ({s.type})</option>)}
                </select>
                {f.storage.storageId && storageInfo(db, { ...f, id: initial?.id, farmerId: farmer.id }).booking !== 'Booking confirmed' && (
                  <Notice>
                    No confirmed booking at this facility yet, so buyers will see "{storageInfo(db, { ...f, id: initial?.id, farmerId: farmer.id }).booking}". Request capacity from <Link to="/farmer/storage" className="underline font-bold">Find storage</Link>; a request linked to this listing updates it automatically once accepted.
                  </Notice>
                )}
              </div>
            )}
          </div>
          <Field label="Image (optional)" hint="JPG or PNG under 400 KB. A produce illustration is used if none is uploaded." className="sm:col-span-2">
            <input type="file" accept="image/*" onChange={onFile} className="text-xs" />
            {f.image && <img src={f.image} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />}
          </Field>
        </div>
        {error && <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{initial ? 'Save changes' : 'Create listing'}</Button></div>
      </form>
    </Modal>
  );
}

export default function FarmerListings() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null); // null | 'new' | listing
  const listings = db.listings.filter((l) => l.farmerId === user.id);

  const save = (data) => {
    const res = editing === 'new'
      ? run('addListing', { ...data, farmerId: user.id })
      : run('updateListing', { id: editing.id, changes: data });
    if (!res.ok) return showToast(res.error);
    showToast(editing === 'new' ? 'Listing created.' : 'Listing updated.', 'success');
    setEditing(null);
  };

  const remove = (l) => {
    if (!window.confirm(`Delete "${l.name}"? This cannot be undone.`)) return;
    const res = run('deleteListing', { id: l.id });
    showToast(res.ok ? 'Listing deleted.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <>
      <PageHeader title="My listings" subtitle="Produce you offer to buyers. Changes appear on your public profile immediately." action={<Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" />New listing</Button>} />
      {listings.length === 0 ? (
        <EmptyState icon={Package} title="No listings yet" text="Create your first listing so buyers can find your produce." action={<Button onClick={() => setEditing('new')}>Create listing</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              actions={(
                <>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(l)}><Pencil className="w-3.5 h-3.5" />Edit</Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={() => remove(l)}><Trash2 className="w-3.5 h-3.5" />Delete</Button>
                </>
              )}
            />
          ))}
        </div>
      )}
      {editing && <ListingForm initial={editing === 'new' ? null : editing} farmer={user} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}
