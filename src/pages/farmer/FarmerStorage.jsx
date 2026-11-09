import React, { useMemo, useState } from 'react';
import { Plus, Search, MapPin, Phone, Pencil, XCircle, Warehouse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, StatusBadge, Button, inputCls, EmptyState, Notice, cx } from '../../components/common';
import { StorageRequestModal } from '../../components/RequestModals';
import { KindBadge, PriceDelta, Facts } from '../../components/bids';
import { PaymentStrip } from '../../components/PaymentParts';
import { liveBids, storageTotal } from '../../lib/negotiation';
import { STORAGE_TYPES, inr, fmtDate } from '../../lib/format';

function BidRow({ bid, request, lowest, onSelect }) {
  const { db } = useData();
  const owner = db.users.find((u) => u.id === bid.ownerId);
  const f = db.storages.find((s) => s.id === bid.storageId);
  const stale = bid.status === 'Outdated';
  return (
    <div className={cx('rounded-xl border p-4', stale ? 'border-amber-200 bg-amber-50/40' : lowest ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-white')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-zinc-900">{f ? f.name : 'Facility removed'}</span>
            {stale ? <StatusBadge status="Outdated" /> : <KindBadge kind={bid.kind} />}
            {lowest && !stale && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Lowest price</span>}
          </div>
          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{f?.location} · {f?.type} · {owner?.company || owner?.name}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-800">{inr(bid.price)}<span className="text-xs font-medium text-zinc-500"> / t / day</span></div>
          <div className="text-xs text-zinc-600">Total about <span className="font-bold">{inr(storageTotal(request, bid.price))}</span></div>
          {stale ? <span className="text-xs font-semibold text-amber-700">Waiting for re-confirmation of your new terms.</span> : <PriceDelta price={bid.price} offered={request.offeredPrice} unit=" / t / day" />}
        </div>
      </div>
      <div className="mt-3">
        <Facts items={[
          ['Free capacity', f ? `${f.availableCapacity} of ${f.totalCapacity} t` : '-'],
          ['Listed price', f ? `${inr(f.pricePerTonneDay)} / t / day` : '-'],
          ['Facilities', f?.facilities.join(', ')],
        ]} />
      </div>
      {bid.note && <p className="text-sm text-zinc-700 bg-white/70 border border-zinc-100 rounded-lg px-3 py-2 mt-3">"{bid.note}"</p>}
      <div className="flex justify-end mt-3">
        <Button size="sm" disabled={stale} onClick={() => onSelect(bid)}>{stale ? 'Waiting for re-confirmation' : 'Select this facility'}</Button>
      </div>
    </div>
  );
}

function RequestCard({ request, onEdit }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const listing = db.listings.find((l) => l.id === request.listingId);
  const bids = liveBids(db.storageBids, request.id);
  const open = request.status === 'Open';
  const facility = request.storageId && db.storages.find((s) => s.id === request.storageId);
  const owner = facility && db.users.find((u) => u.id === facility.ownerId);
  const lowestPrice = bids.filter((b) => b.status === 'Pending')[0]?.price;
  const others = db.storageBids.filter((b) => b.requestId === request.id && ['Rejected', 'Withdrawn'].includes(b.status));
  const shownPrice = request.agreedPrice ?? request.offeredPrice;
  const storagePayment = db.payments.find((p) => p.kind === 'Storage' && p.refId === request.id);

  const select = (bid) => {
    const f = db.storages.find((s) => s.id === bid.storageId);
    if (!window.confirm(`Select ${f?.name} at ${inr(bid.price)} per tonne per day? Capacity will be reserved and other responses declined.`)) return;
    const res = run('selectStorageBid', { bidId: bid.id, farmerId: user.id });
    showToast(res.ok ? 'Storage confirmed and capacity reserved.' : res.error, res.ok ? 'success' : 'info');
  };

  const cancel = () => {
    if (!window.confirm(`Cancel ${request.id}? All responses will be declined.`)) return;
    const res = run('cancelStorageRequest', { id: request.id });
    showToast(res.ok ? 'Request cancelled.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-zinc-400">{request.id} · posted {fmtDate(request.createdAt)}</div>
          <h3 className="font-extrabold text-zinc-900 text-lg">{request.quantity} t{listing ? ` of ${listing.name}` : ''} for {request.days} days</h3>
          <div className="text-sm text-zinc-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />Needed in {request.city} from {fmtDate(request.startDate)}</div>
        </div>
        <div className="text-right">
          <StatusBadge status={request.status} />
          <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{request.agreedPrice != null ? 'Agreed price' : 'Your offer'}</div>
          <div className="text-2xl font-black text-emerald-800">{inr(shownPrice)}<span className="text-xs font-medium text-zinc-500"> / t / day</span></div>
          <div className="text-xs text-zinc-500">About {inr(storageTotal(request, shownPrice))} in total</div>
        </div>
      </div>
      <div className="mt-4"><Facts items={[['Storage type', request.storageType || 'Any'], ['Duration', `${request.days} days`], request.notes ? ['Notes', request.notes] : null]} /></div>

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
            <Notice tone="blue">No responses yet. Storage owners see your request on their screen. If nobody responds, try raising your offered price.</Notice>
          ) : (
            <div className="space-y-3">{bids.map((b) => <BidRow key={b.id} bid={b} request={request} lowest={b.status === 'Pending' && b.price === lowestPrice} onSelect={select} />)}</div>
          )}
          {bids.length > 0 && bids.every((b) => b.kind === 'counter' && b.price > request.offeredPrice) && (
            <p className="text-xs text-zinc-500 mt-3">Everyone is asking more than you offered. You can raise your price to make accepting easier.</p>
          )}
        </div>
      )}

      {facility && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h4 className="font-extrabold text-sm text-emerald-900 mb-2">{request.status === 'Completed' ? 'Storage used' : 'Your storage'}</h4>
          <div className="font-bold text-zinc-900">{facility.name} · {facility.type}</div>
          <div className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{facility.location} · {owner?.company || owner?.name}</div>
          {request.status === 'Confirmed' && <a href={`tel:${owner?.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 mt-1"><Phone className="w-3.5 h-3.5" />{owner?.phone}</a>}
          {storagePayment && <PaymentStrip payment={storagePayment} className="mt-3 bg-white" />}
        </div>
      )}
      {!open && others.length > 0 && <p className="text-xs text-zinc-400 mt-3">{others.length} other response{others.length === 1 ? '' : 's'} not chosen.</p>}
    </Card>
  );
}

export default function FarmerStorage() {
  const { user } = useAuth();
  const { db } = useData();
  const [tab, setTab] = useState('requests');
  const [modal, setModal] = useState(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minCap, setMinCap] = useState('');

  const rank = (r) => (r.status === 'Open' ? 0 : r.status === 'Confirmed' ? 1 : 2);
  const requests = db.storageRequests.filter((r) => r.farmerId === user.id).sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));

  const facilities = useMemo(() => db.storages.filter((s) => (
    (!q || `${s.name} ${s.location}`.toLowerCase().includes(q.toLowerCase())) && (!type || s.type === type)
    && (!maxPrice || s.pricePerTonneDay <= Number(maxPrice)) && (!minCap || s.availableCapacity >= Number(minCap))
  )), [db.storages, q, type, maxPrice, minCap]);

  return (
    <>
      <PageHeader
        title="Storage portal"
        subtitle="Post a storage request with your price. Storage owners accept or counter, and you choose."
        action={<Button onClick={() => setModal({})}><Plus className="w-4 h-4" />New storage request</Button>}
      />
      <div className="flex gap-2 mb-5">
        {[['requests', `My requests (${requests.length})`], ['browse', 'Browse storage']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
      </div>

      {tab === 'requests' && (requests.length === 0
        ? <EmptyState icon={Warehouse} title="No storage requests yet" text="Post a request and storage owners will respond with their price." action={<Button onClick={() => setModal({})}>New storage request</Button>} />
        : <div className="space-y-5">{requests.map((r) => <RequestCard key={r.id} request={r} onEdit={(req) => setModal({ request: req })} />)}</div>)}

      {tab === 'browse' && (
        <>
          <Card className="mb-5">
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="relative"><Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or location" className={`${inputCls} pl-9`} /></div>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}><option value="">All types</option>{STORAGE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹ / tonne / day" className={inputCls} />
              <input type="number" min="0" value={minCap} onChange={(e) => setMinCap(e.target.value)} placeholder="Min free capacity (t)" className={inputCls} />
            </div>
            <p className="text-xs text-zinc-500 mt-3">This is a directory with listed prices. To book, post a request and let storage owners respond.</p>
          </Card>
          {facilities.length === 0 ? <EmptyState title="No facilities match your filters" /> : (
            <div className="grid md:grid-cols-2 gap-5">
              {facilities.map((s) => {
                const owner = db.users.find((u) => u.id === s.ownerId);
                const pct = Math.round(((s.totalCapacity - s.availableCapacity) / s.totalCapacity) * 100);
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
                    <div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-zinc-900">{s.name}</h3><div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{s.location} · {s.type}</div></div><StatusBadge status={s.availability} /></div>
                    <div className="mt-4"><div className="flex justify-between text-xs text-zinc-600 mb-1"><span>{s.availableCapacity} t free of {s.totalCapacity} t</span><span>{pct}% used</span></div><div className="h-2 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} /></div></div>
                    <div className="flex flex-wrap gap-1.5 mt-3">{s.facilities.map((f) => <span key={f} className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 rounded-full px-2 py-0.5">{f}</span>)}</div>
                    <div className="mt-4 pt-4 border-t border-zinc-100 text-lg font-black text-emerald-800">{inr(s.pricePerTonneDay)}<span className="text-xs font-medium text-zinc-500"> / tonne / day listed · {owner?.company || owner?.name}</span></div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && <StorageRequestModal farmerId={user.id} request={modal.request} onClose={() => setModal(null)} />}
    </>
  );
}
