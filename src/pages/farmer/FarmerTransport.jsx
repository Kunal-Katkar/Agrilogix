import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Truck, MapPin, Phone, Pencil, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, StatusBadge, Button, inputCls, EmptyState, Notice, cx } from '../../components/common';
import { TransportRequestModal } from '../../components/RequestModals';
import { KindBadge, PriceDelta, Facts } from '../../components/bids';
import { PaymentStrip } from '../../components/PaymentParts';
import { liveBids } from '../../lib/negotiation';
import { VEHICLE_TYPES, inr, fmtDate, cityOf } from '../../lib/format';

function BidRow({ bid, request, lowest, onSelect }) {
  const { db } = useData();
  const t = db.users.find((u) => u.id === bid.transporterId);
  const v = db.vehicles.find((x) => x.id === bid.vehicleId);
  const stale = bid.status === 'Outdated';
  return (
    <div className={cx('rounded-xl border p-4', stale ? 'border-amber-200 bg-amber-50/40' : lowest ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-white')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-zinc-900">{t?.company || t?.name}</span>
            {stale ? <StatusBadge status="Outdated" /> : <KindBadge kind={bid.kind} />}
            {lowest && !stale && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Lowest price</span>}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{t?.name} · based in {t?.location}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-800">{inr(bid.price)}</div>
          {stale ? <span className="text-xs font-semibold text-amber-700">Was for your earlier price. Waiting for re-confirmation.</span> : <PriceDelta price={bid.price} offered={request.offeredPrice} />}
        </div>
      </div>
      <div className="mt-3">
        <Facts items={[
          ['Vehicle', v ? `${v.vehicleType} (${v.regNo})` : 'Vehicle removed'],
          ['Capacity', v ? `${v.loadCapacity} t` : '-'],
          ['Rate card', v ? `${inr(v.pricePerKm)} per km` : '-'],
          ['Delivery time', `${bid.etaDays} day${bid.etaDays === 1 ? '' : 's'}`],
          ['Service area', v?.serviceArea.join(', ')],
        ]} />
      </div>
      {bid.note && <p className="text-sm text-zinc-700 bg-white/70 border border-zinc-100 rounded-lg px-3 py-2 mt-3">"{bid.note}"</p>}
      <div className="flex justify-end mt-3">
        <Button size="sm" disabled={stale} onClick={() => onSelect(bid)}>{stale ? 'Waiting for re-confirmation' : 'Select this transporter'}</Button>
      </div>
    </div>
  );
}

function RequestCard({ request, onEdit }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const order = db.orders.find((o) => o.id === request.orderId);
  const listing = db.listings.find((l) => l.id === order?.listingId);
  const customer = db.users.find((u) => u.id === order?.customerId);
  const bids = liveBids(db.transportBids, request.id);
  const open = request.status === 'Open';
  const picked = db.transportBids.find((b) => b.id === request.selectedBidId);
  const shipment = db.shipments.find((s) => s.requestId === request.id);
  const transporter = picked && db.users.find((u) => u.id === picked.transporterId);
  const vehicle = picked && db.vehicles.find((v) => v.id === picked.vehicleId);
  const lowestPrice = bids.filter((b) => b.status === 'Pending')[0]?.price;
  const farePayment = shipment && db.payments.find((p) => p.kind === 'Transport' && p.refId === shipment.trackingId);
  const earlier = db.transportBids.filter((b) => b.requestId === request.id && ['Rejected', 'Withdrawn'].includes(b.status));

  const select = (bid) => {
    const t = db.users.find((u) => u.id === bid.transporterId);
    if (!window.confirm(`Select ${t?.company || t?.name} for ${inr(bid.price)}? Other responses will be declined.`)) return;
    const res = run('selectTransportBid', { bidId: bid.id, farmerId: user.id });
    showToast(res.ok ? `Confirmed. Shipment ${res.id} created.` : res.error, res.ok ? 'success' : 'info');
  };

  const cancel = () => {
    if (!window.confirm(`Cancel ${request.id}? All responses will be declined.`)) return;
    const res = run('cancelTransportRequest', { id: request.id });
    showToast(res.ok ? 'Request cancelled.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-zinc-400">{request.id} · order {request.orderId} · posted {fmtDate(request.createdAt)}</div>
          <h3 className="font-extrabold text-zinc-900 text-lg">{listing?.name}, {request.quantity} {request.unit}</h3>
          <div className="text-sm text-zinc-600 flex flex-wrap items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{request.pickup}<ArrowRight className="w-3.5 h-3.5" />{request.destination}</div>
        </div>
        <div className="text-right">
          <StatusBadge status={request.status} />
          <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{request.status === 'Confirmed' || request.status === 'Completed' ? 'Agreed price' : 'Your offer'}</div>
          <div className="text-2xl font-black text-emerald-800">{inr(request.agreedPrice ?? request.offeredPrice)}</div>
        </div>
      </div>
      <div className="mt-4">
        <Facts items={[
          ['Load', `${request.loadTonnes} t`], ['Pickup date', fmtDate(request.date)], ['Vehicle needed', request.vehicleType || 'Any suitable'],
          ['Buyer', customer ? `${customer.name}, ${cityOf(customer.location)}` : '-'], request.notes ? ['Notes', request.notes] : null,
        ]} />
      </div>

      {open && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="font-extrabold text-sm text-zinc-900">Responses ({bids.length})</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => onEdit(request)}><Pencil className="w-3.5 h-3.5" />Update price or details</Button>
              <Button size="sm" variant="danger" onClick={cancel}><XCircle className="w-3.5 h-3.5" />Cancel request</Button>
            </div>
          </div>
          {bids.length === 0 ? (
            <Notice tone="blue">No responses yet. Transporters see your request on their screen. If nobody responds, try raising your offered price.</Notice>
          ) : (
            <div className="space-y-3">
              {bids.map((b) => <BidRow key={b.id} bid={b} request={request} lowest={b.status === 'Pending' && b.price === lowestPrice} onSelect={select} />)}
            </div>
          )}
          {bids.length > 0 && bids.every((b) => b.kind === 'counter' && b.price > request.offeredPrice) && (
            <p className="text-xs text-zinc-500 mt-3">Everyone is asking more than you offered. You can raise your price to make accepting easier.</p>
          )}
        </div>
      )}

      {picked && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h4 className="font-extrabold text-sm text-emerald-900 mb-2">Your transporter</h4>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-zinc-900">{transporter?.company || transporter?.name}</div>
              <div className="text-xs text-zinc-600">{transporter?.name} · {transporter?.location}</div>
              <div className="text-xs text-zinc-600 mt-1">{vehicle ? `${vehicle.vehicleType} (${vehicle.regNo}), ${vehicle.loadCapacity} t` : 'Vehicle removed'}</div>
              <a href={`tel:${transporter?.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 mt-1"><Phone className="w-3.5 h-3.5" />{transporter?.phone}</a>
            </div>
            {shipment && <Button as={Link} to={`/farmer/track/${shipment.trackingId}`} size="sm" variant="secondary">Track {shipment.trackingId}</Button>}
          </div>
          {farePayment && <PaymentStrip payment={farePayment} className="mt-3 bg-white" />}
        </div>
      )}

      {!open && earlier.length > 0 && <p className="text-xs text-zinc-400 mt-3">{earlier.length} other response{earlier.length === 1 ? '' : 's'} not chosen.</p>}
    </Card>
  );
}

export default function FarmerTransport() {
  const { user } = useAuth();
  const { db } = useData();
  const [params, setParams] = useSearchParams();
  const presetOrder = params.get('order') || '';
  const [tab, setTab] = useState('requests');
  const [modal, setModal] = useState(presetOrder ? { mode: 'new' } : null);
  const [area, setArea] = useState('');
  const [type, setType] = useState('');
  const [minLoad, setMinLoad] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const rank = (r) => (r.status === 'Open' ? 0 : r.status === 'Confirmed' ? 1 : 2);
  const requests = db.transportRequests.filter((r) => r.farmerId === user.id)
    .sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  const waiting = db.orders.filter((o) => o.farmerId === user.id && o.status === 'Accepted'
    && !db.transportRequests.some((r) => r.orderId === o.id && ['Open', 'Confirmed'].includes(r.status)));

  const vehicles = useMemo(() => db.vehicles.filter((v) => (
    (!area || v.serviceArea.some((a) => a.toLowerCase().includes(area.toLowerCase())))
    && (!type || v.vehicleType === type) && (!minLoad || v.loadCapacity >= Number(minLoad)) && (!maxPrice || v.pricePerKm <= Number(maxPrice))
  )), [db.vehicles, area, type, minLoad, maxPrice]);

  const closeModal = () => { setModal(null); if (presetOrder) setParams({}, { replace: true }); };

  return (
    <>
      <PageHeader
        title="Transport portal"
        subtitle="Post a transport request with your price. Transporters accept or counter, and you choose."
        action={<Button onClick={() => setModal({ mode: 'new' })}><Plus className="w-4 h-4" />New transport request</Button>}
      />
      <div className="flex gap-2 mb-5">
        {[['requests', `My requests (${requests.length})`], ['browse', 'Browse transporters']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="space-y-5">
          {waiting.length > 0 && (
            <Card title={`Accepted orders waiting for transport (${waiting.length})`}>
              <div className="space-y-2">
                {waiting.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span><span className="font-bold">{o.id}</span> · {db.listings.find((l) => l.id === o.listingId)?.name}, {o.quantity} {o.unit} to {db.users.find((u) => u.id === o.customerId)?.location}</span>
                    <Button size="sm" onClick={() => setModal({ mode: 'new', orderId: o.id })}>Request transport</Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {requests.length === 0 ? (
            <EmptyState icon={Truck} title="No transport requests yet" text="Accept an order, then post a request here. Transporters will respond with their price." />
          ) : requests.map((r) => <RequestCard key={r.id} request={r} onEdit={(req) => setModal({ mode: 'edit', request: req })} />)}
        </div>
      )}

      {tab === 'browse' && (
        <>
          <Card className="mb-5">
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="relative"><Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Service area (city)" className={`${inputCls} pl-9`} /></div>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}><option value="">All vehicle types</option>{VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <input type="number" min="0" step="0.5" value={minLoad} onChange={(e) => setMinLoad(e.target.value)} placeholder="Min load (tonnes)" className={inputCls} />
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹ per km" className={inputCls} />
            </div>
            <p className="text-xs text-zinc-500 mt-3">This is a directory. To hire someone, post a request and let transporters respond with their price.</p>
          </Card>
          {vehicles.length === 0 ? <EmptyState icon={Truck} title="No vehicles match your filters" /> : (
            <div className="grid md:grid-cols-2 gap-5">
              {vehicles.map((v) => {
                const owner = db.users.find((u) => u.id === v.ownerId);
                return (
                  <div key={v.id} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
                    <div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-zinc-900">{v.vehicleType}</h3><div className="text-xs text-zinc-500">{v.regNo} · {owner?.company || owner?.name} · {owner?.location}</div></div><StatusBadge status={v.availability} /></div>
                    <div className="mt-4"><Facts items={[['Load capacity', `${v.loadCapacity} tonnes`], ['Rate card', `${inr(v.pricePerKm)} per km`], ['Service area', v.serviceArea.join(', ')]]} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && <TransportRequestModal farmerId={user.id} request={modal.request} presetOrderId={modal.orderId || presetOrder} onClose={closeModal} />}
    </>
  );
}
