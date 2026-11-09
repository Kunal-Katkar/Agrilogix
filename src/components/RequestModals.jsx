import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Button, Field, Modal, inputCls, Notice, cx } from './common';
import { inr, today, cityOf, toTonnes, VEHICLE_TYPES, STORAGE_TYPES } from '../lib/format';
import { eligibleVehicles, eligibleFacilities, storageTotal } from '../lib/negotiation';
import { recommendTransportPrice, recommendStoragePrice } from '../lib/pricing';

// Shows the recommended price for a farmer who does not know what to offer. Never forces the price.
function PriceSuggestion({ rec, unit, current, onUse }) {
  if (!rec) return null;
  if (rec.reason) return <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500">{rec.reason}</div>;
  const applied = Number(current) === rec.price;
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="price-suggestion">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Recommended price</div>
        <div className="text-xl font-black text-emerald-900">{inr(rec.price)}<span className="text-xs font-semibold text-emerald-800"> {unit}</span></div>
        <div className="text-[11px] text-zinc-600">{rec.low === rec.high ? '' : `Fair range ${inr(rec.low)} to ${inr(rec.high)}. `}Based on {rec.basis}.</div>
        <div className="text-[11px] text-zinc-400">An estimate from prices listed on AgriLogiX. You can offer any price.</div>
      </div>
      <Button type="button" variant={applied ? 'secondary' : 'primary'} disabled={applied} onClick={() => onUse(rec.price)}>
        {applied ? 'Price applied' : 'Use this price'}
      </Button>
    </div>
  );
}

const FormError = ({ children }) => (children
  ? <div role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">{children}</div>
  : null);

const Actions = ({ onClose, label }) => (
  <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{label}</Button></div>
);

// Provider chooses between accepting the farmer's price and proposing their own.
function PriceChoice({ kind, setKind, price, setPrice, offered, unitLabel }) {
  const options = [
    ['accept', `Accept the farmer's price: ${inr(offered)}${unitLabel}`, 'I am available at this price'],
    ['counter', 'Suggest my own price', 'The farmer can choose or ignore it'],
  ];
  return (
    <div>
      <span className="block text-xs font-bold text-zinc-700 mb-1">Your response</span>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map(([k, title, text]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cx('text-left rounded-xl border p-3 cursor-pointer transition-colors', kind === k ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30' : 'border-zinc-200 hover:border-emerald-300')}>
            <div className="text-sm font-bold text-zinc-900">{title}</div>
            <div className="text-[11px] text-zinc-500">{text}</div>
          </button>
        ))}
      </div>
      {kind === 'counter' && (
        <div className="mt-2">
          <input type="number" min="1" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`Your price${unitLabel}`} className={inputCls} aria-label="Your price" />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Farmer: transport request */
// Create (request omitted) or edit an open transport request. Editing the price makes earlier "accept" bids re-confirm.
export function TransportRequestModal({ farmerId, request, presetOrderId, onClose }) {
  const { db, run } = useData();
  const { showToast } = useToast();
  const editing = Boolean(request);
  const eligible = useMemo(() => db.orders.filter((o) => o.farmerId === farmerId && o.status === 'Accepted'
    && !db.transportRequests.some((r) => r.orderId === o.id && ['Open', 'Confirmed'].includes(r.status))), [db, farmerId]);
  const [orderId, setOrderId] = useState(presetOrderId && eligible.some((o) => o.id === presetOrderId) ? presetOrderId : eligible[0]?.id || '');
  const [date, setDate] = useState(request?.date || today());
  const [vehicleType, setVehicleType] = useState(request?.vehicleType || '');
  const [price, setPrice] = useState(request?.offeredPrice ?? '');
  const [notes, setNotes] = useState(request?.notes || '');
  const [error, setError] = useState('');

  const order = db.orders.find((o) => o.id === (editing ? request.orderId : orderId));
  const listing = order && db.listings.find((l) => l.id === order.listingId);
  const customer = order && db.users.find((u) => u.id === order.customerId);
  const bidCount = editing ? db.transportBids.filter((b) => b.requestId === request.id && ['Pending', 'Outdated'].includes(b.status)).length : 0;
  const repricing = editing && Number(price) !== request.offeredPrice;
  const loadTonnes = editing ? request.loadTonnes : (order ? toTonnes(order.quantity, order.unit) : 0);
  const rec = useMemo(() => (order ? recommendTransportPrice(db, {
    pickup: listing?.location, destination: customer?.location, loadTonnes, vehicleType,
  }) : null), [db, order, listing, customer, loadTonnes, vehicleType]);

  const submit = (e) => {
    e.preventDefault();
    const res = editing
      ? run('updateTransportRequest', { id: request.id, changes: { offeredPrice: price, date, vehicleType, notes } })
      : run('createTransportRequest', { farmerId, orderId, date, vehicleType, notes, offeredPrice: price });
    if (!res.ok) return setError(res.error);
    showToast(editing ? 'Transport request updated.' : 'Transport request posted. Transporters can now respond.', 'success');
    onClose();
  };

  if (!editing && eligible.length === 0) {
    return (
      <Modal title="New transport request" onClose={onClose}>
        <Notice>You have no accepted orders waiting for transport. Accept an order first, then post a request for it.</Notice>
        <div className="flex justify-end mt-4"><Button onClick={onClose}>Close</Button></div>
      </Modal>
    );
  }

  return (
    <Modal title={editing ? `Edit ${request.id}` : 'New transport request'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {!editing && (
          <Field label="Order to ship">
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputCls}>
              {eligible.map((o) => <option key={o.id} value={o.id}>{o.id} · {db.listings.find((l) => l.id === o.listingId)?.name} · {o.quantity} {o.unit}</option>)}
            </select>
          </Field>
        )}
        {order && (
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-xs text-zinc-600 grid sm:grid-cols-2 gap-x-6 gap-y-1">
            <div><span className="font-bold text-zinc-800">Goods: </span>{listing?.name}, {order.quantity} {order.unit} (about {editing ? request.loadTonnes : Math.round(order.quantity * ({ quintal: 0.1, kg: 0.001, tonne: 1 }[order.unit] ?? 0.1) * 100) / 100} t)</div>
            <div><span className="font-bold text-zinc-800">Buyer: </span>{customer?.name}</div>
            <div><span className="font-bold text-zinc-800">Pickup: </span>{listing?.location}</div>
            <div><span className="font-bold text-zinc-800">Destination: </span>{customer?.location}</div>
          </div>
        )}
        <PriceSuggestion rec={rec} unit="for the whole trip" current={price} onUse={(p) => setPrice(p)} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Your offered price for the whole trip (₹)" hint="Transporters can accept this or suggest their own price.">
            <input type="number" min="1" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Pickup date"><input type="date" min={today()} required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Vehicle needed">
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className={inputCls}>
              <option value="">Any suitable vehicle</option>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Notes for the transporter (optional)"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Handling, loading time, gate details" className={inputCls} /></Field>
        </div>
        {repricing && bidCount > 0 && (
          <Notice>Changing the price asks transporters who accepted your earlier price to re-confirm. Counter offers stay as they are.</Notice>
        )}
        <FormError>{error}</FormError>
        <Actions onClose={onClose} label={editing ? 'Save changes' : 'Post request'} />
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Farmer: storage request */
export function StorageRequestModal({ farmerId, request, presetListingId, onClose }) {
  const { db, run } = useData();
  const { showToast } = useToast();
  const editing = Boolean(request);
  const farmer = db.users.find((u) => u.id === farmerId);
  const myListings = db.listings.filter((l) => l.farmerId === farmerId);
  const [listingId, setListingId] = useState(request?.listingId || presetListingId || '');
  const [quantity, setQuantity] = useState(request?.quantity ?? '');
  const [days, setDays] = useState(request?.days ?? 30);
  const [startDate, setStartDate] = useState(request?.startDate || today());
  const [city, setCity] = useState(request?.city || cityOf(farmer.location));
  const [storageType, setStorageType] = useState(request?.storageType || '');
  const [price, setPrice] = useState(request?.offeredPrice ?? '');
  const [notes, setNotes] = useState(request?.notes || '');
  const [error, setError] = useState('');

  // Recommended price from what providers in the chosen city (or state) list for this storage type.
  const rec = useMemo(() => recommendStoragePrice(db, { city, storageType }), [db, city, storageType]);
  const total = Number(quantity) * Number(days) * Number(price);
  const termsChanged = editing && (Number(price) !== request.offeredPrice || Number(quantity) !== request.quantity || Number(days) !== request.days || startDate !== request.startDate);
  const bidCount = editing ? db.storageBids.filter((b) => b.requestId === request.id && ['Pending', 'Outdated'].includes(b.status)).length : 0;

  const submit = (e) => {
    e.preventDefault();
    const data = { listingId, quantity, days, startDate, city, storageType, notes, offeredPrice: price };
    const res = editing
      ? run('updateStorageRequest', { id: request.id, changes: { quantity, days, startDate, city, storageType, notes, offeredPrice: price } })
      : run('createStorageRequest', { farmerId, ...data });
    if (!res.ok) return setError(res.error);
    showToast(editing ? 'Storage request updated.' : 'Storage request posted. Storage owners can now respond.', 'success');
    onClose();
  };

  return (
    <Modal title={editing ? `Edit ${request.id}` : 'New storage request'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Produce to store" className="sm:col-span-2">
            <select value={listingId} onChange={(e) => setListingId(e.target.value)} disabled={editing} className={inputCls}>
              <option value="">Not linked to a listing</option>{myListings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {!editing && <span className="block text-[11px] text-zinc-400 mt-1">If linked, the listing shows the chosen facility to buyers once you confirm a provider.</span>}
          </Field>
          <Field label="Quantity (tonnes)"><input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} /></Field>
          <Field label="Duration (days)"><input type="number" min="1" required value={days} onChange={(e) => setDays(e.target.value)} className={inputCls} /></Field>
          <Field label="Storage starts on"><input type="date" min={today()} required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></Field>
          <Field label="City where you need storage"><input required value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></Field>
          <Field label="Storage type">
            <select value={storageType} onChange={(e) => setStorageType(e.target.value)} className={inputCls}><option value="">Any type</option>{STORAGE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <div className="sm:col-span-2"><PriceSuggestion rec={rec} unit="per tonne per day" current={price} onUse={(p) => setPrice(p)} /></div>
          <Field label="Your offered price (₹ per tonne per day)" hint="Storage owners can accept this or suggest their own price.">
            <input type="number" min="1" step="any" required value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes for storage owners (optional)" className="sm:col-span-2"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Temperature, humidity, handling needs" className={inputCls} /></Field>
        </div>
        {total > 0 && <Notice tone="blue">At your price the total is about {inr(total)} for {quantity} t over {days} days.</Notice>}
        {termsChanged && bidCount > 0 && <Notice>Changing the price, quantity, duration or start date asks providers who accepted your earlier terms to re-confirm. Counter offers stay as they are.</Notice>}
        <FormError>{error}</FormError>
        <Actions onClose={onClose} label={editing ? 'Save changes' : 'Post request'} />
      </form>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Transporter: bid */
export function TransportBidModal({ request, transporterId, existingBid, onClose }) {
  const { db, run } = useData();
  const { showToast } = useToast();
  const vehicles = eligibleVehicles(db, transporterId, request);
  const [vehicleId, setVehicleId] = useState(existingBid && vehicles.some((v) => v.id === existingBid.vehicleId) ? existingBid.vehicleId : vehicles[0]?.id || '');
  const [kind, setKind] = useState(existingBid?.status === 'Outdated' ? 'accept' : existingBid?.kind || 'accept');
  const [price, setPrice] = useState(existingBid?.kind === 'counter' ? existingBid.price : '');
  const [etaDays, setEtaDays] = useState(existingBid?.etaDays || 1);
  const [note, setNote] = useState(existingBid?.note || '');
  const [error, setError] = useState('');
  const farmer = db.users.find((u) => u.id === request.farmerId);

  const submit = (e) => {
    e.preventDefault();
    const res = run('submitTransportBid', { requestId: request.id, transporterId, vehicleId, kind, price, etaDays, note });
    if (!res.ok) return setError(res.error);
    showToast(existingBid ? 'Your response was updated.' : 'Response sent to the farmer.', 'success');
    onClose();
  };

  return (
    <Modal title={`${existingBid ? 'Update response for' : 'Respond to'} ${request.id}`} onClose={onClose} wide>
      {vehicles.length === 0 ? (
        <>
          <Notice>None of your vehicles can take this job. It needs {request.loadTonnes} t{request.vehicleType ? ` in a ${request.vehicleType}` : ''}, and the vehicle must be marked Available.</Notice>
          <div className="flex justify-end mt-4"><Button onClick={onClose}>Close</Button></div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-xs text-zinc-600">
            {farmer.name} offers <span className="font-bold text-emerald-800">{inr(request.offeredPrice)}</span> for {request.pickup} → {request.destination}, {request.loadTonnes} t, pickup {request.date}.
          </div>
          {existingBid?.status === 'Outdated' && <Notice>The farmer changed the offered price to {inr(request.offeredPrice)}. Confirm again or suggest your own price.</Notice>}
          <Field label="Vehicle you will use">
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={inputCls}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleType} · {v.regNo} · {v.loadCapacity} t · {inr(v.pricePerKm)}/km</option>)}
            </select>
          </Field>
          <PriceChoice kind={kind} setKind={setKind} price={price} setPrice={setPrice} offered={request.offeredPrice} unitLabel="" />
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Days to deliver"><input type="number" min="1" required value={etaDays} onChange={(e) => setEtaDays(e.target.value)} className={inputCls} /></Field>
            <Field label="Message to the farmer (optional)" className="sm:col-span-2"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Availability, return load, conditions" className={inputCls} /></Field>
          </div>
          <FormError>{error}</FormError>
          <Actions onClose={onClose} label={existingBid ? 'Update response' : 'Send response'} />
        </form>
      )}
    </Modal>
  );
}

/* ---------------------------------------------------------------- Storage owner: bid */
export function StorageBidModal({ request, ownerId, existingBid, onClose }) {
  const { db, run } = useData();
  const { showToast } = useToast();
  const facilities = eligibleFacilities(db, ownerId, request);
  const [storageId, setStorageId] = useState(existingBid && facilities.some((s) => s.id === existingBid.storageId) ? existingBid.storageId : facilities[0]?.id || '');
  const [kind, setKind] = useState(existingBid?.status === 'Outdated' ? 'accept' : existingBid?.kind || 'accept');
  const [price, setPrice] = useState(existingBid?.kind === 'counter' ? existingBid.price : '');
  const [note, setNote] = useState(existingBid?.note || '');
  const [error, setError] = useState('');
  const farmer = db.users.find((u) => u.id === request.farmerId);
  const finalPrice = kind === 'accept' ? request.offeredPrice : Number(price);

  const submit = (e) => {
    e.preventDefault();
    const res = run('submitStorageBid', { requestId: request.id, ownerId, storageId, kind, price, note });
    if (!res.ok) return setError(res.error);
    showToast(existingBid ? 'Your response was updated.' : 'Response sent to the farmer.', 'success');
    onClose();
  };

  return (
    <Modal title={`${existingBid ? 'Update response for' : 'Respond to'} ${request.id}`} onClose={onClose} wide>
      {facilities.length === 0 ? (
        <>
          <Notice>None of your facilities can take this request. It needs {request.quantity} t of free capacity, and the facility must be marked Available.</Notice>
          <div className="flex justify-end mt-4"><Button onClick={onClose}>Close</Button></div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-xs text-zinc-600">
            {farmer.name} offers <span className="font-bold text-emerald-800">{inr(request.offeredPrice)} per tonne per day</span> for {request.quantity} t over {request.days} days from {request.startDate}.
          </div>
          {existingBid?.status === 'Outdated' && <Notice>The farmer changed the terms. Confirm again or suggest your own price.</Notice>}
          <Field label="Facility you will use">
            <select value={storageId} onChange={(e) => setStorageId(e.target.value)} className={inputCls}>
              {facilities.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.type} · {s.availableCapacity} t free · lists {inr(s.pricePerTonneDay)}</option>)}
            </select>
          </Field>
          <PriceChoice kind={kind} setKind={setKind} price={price} setPrice={setPrice} offered={request.offeredPrice} unitLabel=" per tonne per day" />
          {finalPrice > 0 && <Notice tone="blue">Total for the farmer: about {inr(storageTotal(request, finalPrice))}.</Notice>}
          <Field label="Message to the farmer (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is included, discounts, conditions" className={inputCls} /></Field>
          <FormError>{error}</FormError>
          <Actions onClose={onClose} label={existingBid ? 'Update response' : 'Send response'} />
        </form>
      )}
    </Modal>
  );
}
