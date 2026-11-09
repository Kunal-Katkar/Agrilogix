import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, StatusBadge, Button, Modal, Field, inputCls, EmptyState } from '../../components/common';
import { VEHICLE_TYPES, inr } from '../../lib/format';

function VehicleForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial ? { ...initial, serviceArea: initial.serviceArea.join(', ') } : {
    vehicleType: VEHICLE_TYPES[0], regNo: '', loadCapacity: '', pricePerKm: '', serviceArea: '', availability: 'Available',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...f, regNo: f.regNo.trim().toUpperCase(), loadCapacity: Number(f.loadCapacity), pricePerKm: Number(f.pricePerKm),
      serviceArea: f.serviceArea.split(',').map((a) => a.trim()).filter(Boolean),
    });
  };
  return (
    <Modal title={initial ? 'Edit vehicle' : 'Register a vehicle'} onClose={onClose} wide>
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Vehicle type"><select value={f.vehicleType} onChange={(e) => set('vehicleType', e.target.value)} className={inputCls}>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Registration number"><input required value={f.regNo} onChange={(e) => set('regNo', e.target.value)} placeholder="MH15 AB 1234" className={inputCls} /></Field>
        <Field label="Load capacity (tonnes)"><input type="number" min="0.5" step="0.5" required value={f.loadCapacity} onChange={(e) => set('loadCapacity', e.target.value)} className={inputCls} /></Field>
        <Field label="Price per km (₹)"><input type="number" min="1" required value={f.pricePerKm} onChange={(e) => set('pricePerKm', e.target.value)} className={inputCls} /></Field>
        <Field label="Service areas" hint="Cities, separated by commas" className="sm:col-span-2"><input required value={f.serviceArea} onChange={(e) => set('serviceArea', e.target.value)} placeholder="Nashik, Pune, Mumbai" className={inputCls} /></Field>
        <Field label="Availability"><select value={f.availability} onChange={(e) => set('availability', e.target.value)} className={inputCls}>{['Available', 'On trip', 'Unavailable'].map((a) => <option key={a}>{a}</option>)}</select></Field>
        <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{initial ? 'Save changes' : 'Add vehicle'}</Button></div>
      </form>
    </Modal>
  );
}

export default function TransportVehicles() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null);
  const vehicles = db.vehicles.filter((v) => v.ownerId === user.id);

  const save = (data) => {
    const res = editing === 'new' ? run('addVehicle', { ...data, ownerId: user.id }) : run('updateVehicle', { id: editing.id, changes: data });
    if (!res.ok) return showToast(res.error);
    showToast(editing === 'new' ? 'Vehicle added.' : 'Vehicle updated.', 'success');
    setEditing(null);
  };

  const toggle = (v) => {
    if (v.availability === 'On trip') return showToast('This vehicle is on a trip. It is freed automatically on delivery.');
    run('updateVehicle', { id: v.id, changes: { availability: v.availability === 'Available' ? 'Unavailable' : 'Available' } });
  };

  const remove = (v) => {
    if (!window.confirm(`Remove ${v.regNo}?`)) return;
    const res = run('deleteVehicle', { id: v.id });
    showToast(res.ok ? 'Vehicle removed.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <>
      <PageHeader title="My vehicles" subtitle="Vehicles and service areas that farmers can book." action={<Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" />Add vehicle</Button>} />
      {vehicles.length === 0 ? <EmptyState icon={Truck} title="No vehicles registered" action={<Button onClick={() => setEditing('new')}>Register a vehicle</Button>} /> : (
        <div className="grid md:grid-cols-2 gap-5">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
              <div className="flex items-start justify-between"><div><h3 className="font-extrabold text-zinc-900">{v.vehicleType}</h3><div className="text-xs text-zinc-500">{v.regNo}</div></div><StatusBadge status={v.availability} /></div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm"><div><div className="text-[11px] font-bold uppercase text-zinc-400">Capacity</div>{v.loadCapacity} tonnes</div><div><div className="text-[11px] font-bold uppercase text-zinc-400">Rate</div>{inr(v.pricePerKm)} / km</div><div className="col-span-2"><div className="text-[11px] font-bold uppercase text-zinc-400">Service area</div>{v.serviceArea.join(', ')}</div></div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100">
                <Button size="sm" variant="secondary" onClick={() => toggle(v)}>{v.availability === 'Available' ? 'Mark unavailable' : 'Mark available'}</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(v)}><Pencil className="w-3.5 h-3.5" />Edit</Button>
                <Button size="sm" variant="danger" onClick={() => remove(v)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <VehicleForm initial={editing === 'new' ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
    </>
  );
}
