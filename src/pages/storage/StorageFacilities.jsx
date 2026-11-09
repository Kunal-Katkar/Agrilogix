import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Boxes, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatusBadge, Button, Modal, Field, inputCls, EmptyState } from '../../components/common';
import { STORAGE_TYPES, inr } from '../../lib/format';

function FacilityForm({ initial, owner, onSave, onClose }) {
  const [f, setF] = useState(initial ? { ...initial, facilities: initial.facilities.join(', ') } : {
    name: '', type: STORAGE_TYPES[0], location: owner.location, totalCapacity: '', availableCapacity: '', pricePerTonneDay: '', facilities: '', availability: 'Available',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    const total = Number(f.totalCapacity);
    const avail = Number(f.availableCapacity);
    if (avail > total) return setError('Available capacity cannot exceed total capacity.');
    onSave({
      ...f, name: f.name.trim(), totalCapacity: total, availableCapacity: avail, pricePerTonneDay: Number(f.pricePerTonneDay),
      facilities: f.facilities.split(',').map((x) => x.trim()).filter(Boolean),
    });
  };
  return (
    <Modal title={initial ? 'Edit facility' : 'Add storage facility'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Facility name"><input required value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Storage type"><select value={f.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>{STORAGE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Location" className="sm:col-span-2"><input required value={f.location} onChange={(e) => set('location', e.target.value)} className={inputCls} /></Field>
        <Field label="Total capacity (tonnes)"><input type="number" min="1" required value={f.totalCapacity} onChange={(e) => set('totalCapacity', e.target.value)} className={inputCls} /></Field>
        <Field label="Available capacity (tonnes)"><input type="number" min="0" required value={f.availableCapacity} onChange={(e) => set('availableCapacity', e.target.value)} className={inputCls} /></Field>
        <Field label="Price (₹ per tonne per day)"><input type="number" min="1" required value={f.pricePerTonneDay} onChange={(e) => set('pricePerTonneDay', e.target.value)} className={inputCls} /></Field>
        <Field label="Availability"><select value={f.availability} onChange={(e) => set('availability', e.target.value)} className={inputCls}>{['Available', 'Full', 'Unavailable'].map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Facilities" hint="Separate with commas, e.g. Temperature control, CCTV" className="sm:col-span-2"><input value={f.facilities} onChange={(e) => set('facilities', e.target.value)} className={inputCls} /></Field>
        {error && <div role="alert" className="sm:col-span-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{error}</div>}
        <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{initial ? 'Save changes' : 'Add facility'}</Button></div>
      </form>
    </Modal>
  );
}

export default function StorageFacilities() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null);
  const facilities = db.storages.filter((s) => s.ownerId === user.id);

  const save = (data) => {
    const res = editing === 'new' ? run('addFacility', { ...data, ownerId: user.id }) : run('updateFacility', { id: editing.id, changes: data });
    if (!res.ok) return showToast(res.error);
    showToast(editing === 'new' ? 'Facility added.' : 'Facility updated.', 'success');
    setEditing(null);
  };

  const remove = (s) => {
    if (!window.confirm(`Remove ${s.name}?`)) return;
    const res = run('deleteFacility', { id: s.id });
    showToast(res.ok ? 'Facility removed.' : res.error, res.ok ? 'success' : 'info');
  };

  const toggle = (s) => {
    const next = s.availability === 'Available' ? 'Unavailable' : 'Available';
    if (next === 'Available' && s.availableCapacity === 0) return showToast('No free capacity. Update the available capacity first.');
    run('updateFacility', { id: s.id, changes: { availability: next } });
  };

  return (
    <>
      <PageHeader title="My facilities" subtitle="Farmers search these listings when they need storage." action={<Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Add facility</Button>} />
      {facilities.length === 0 ? <EmptyState icon={Boxes} title="No facilities listed" action={<Button onClick={() => setEditing('new')}>Add your first facility</Button>} /> : (
        <div className="grid md:grid-cols-2 gap-5">
          {facilities.map((s) => {
            const pct = Math.round(((s.totalCapacity - s.availableCapacity) / s.totalCapacity) * 100);
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
                <div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-zinc-900">{s.name}</h3><div className="text-xs text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location} · {s.type}</div></div><StatusBadge status={s.availability} /></div>
                <div className="mt-4"><div className="flex justify-between text-xs text-zinc-600 mb-1"><span>{s.availableCapacity} t free of {s.totalCapacity} t</span><span>{pct}% used</span></div><div className="h-2 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} /></div></div>
                <div className="flex flex-wrap gap-1.5 mt-3">{s.facilities.map((x) => <span key={x} className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 rounded-full px-2 py-0.5">{x}</span>)}</div>
                <div className="text-sm font-black text-emerald-800 mt-3">{inr(s.pricePerTonneDay)} <span className="text-xs font-medium text-zinc-500">/ tonne / day</span></div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                  <Button size="sm" variant="secondary" onClick={() => toggle(s)}>{s.availability === 'Available' ? 'Mark unavailable' : 'Mark available'}</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(s)}><Pencil className="w-3.5 h-3.5" />Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {editing && <FacilityForm initial={editing === 'new' ? null : editing} owner={user} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}
