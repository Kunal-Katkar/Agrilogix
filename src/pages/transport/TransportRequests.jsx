import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Phone, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, StatusBadge, Button, EmptyState, Notice, cx } from '../../components/common';
import { TransportBidModal } from '../../components/RequestModals';
import { KindBadge, Facts } from '../../components/bids';
import { eligibleVehicles, myTransportBid } from '../../lib/negotiation';
import { inr, fmtDate, cityOf } from '../../lib/format';

function OpenRequestCard({ request, onRespond }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const farmer = db.users.find((u) => u.id === request.farmerId);
  const order = db.orders.find((o) => o.id === request.orderId);
  const listing = db.listings.find((l) => l.id === order?.listingId);
  const mine = db.vehicles.filter((v) => v.ownerId === user.id);
  const inArea = mine.some((v) => v.serviceArea.some((a) => a.toLowerCase() === cityOf(request.pickup).toLowerCase()));
  const fits = eligibleVehicles(db, user.id, request);
  const bid = myTransportBid(db, request.id, user.id);
  const active = bid && bid.status !== 'Withdrawn';
  const stale = bid?.status === 'Outdated';

  const withdraw = () => {
    if (!window.confirm('Withdraw your response?')) return;
    const res = run('withdrawTransportBid', { bidId: bid.id, transporterId: user.id });
    showToast(res.ok ? 'Response withdrawn.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-zinc-400">{request.id} · posted {fmtDate(request.createdAt)}</div>
          <h3 className="font-extrabold text-zinc-900 text-lg">{listing?.name}, {request.quantity} {request.unit} ({request.loadTonnes} t)</h3>
          <div className="text-sm text-zinc-600 flex flex-wrap items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{request.pickup}<ArrowRight className="w-3.5 h-3.5" />{request.destination}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {inArea && <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Pickup in your service area</span>}
            {fits.length === 0 && <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">No vehicle of yours fits</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Farmer's price</div>
          <div className="text-2xl font-black text-emerald-800">{inr(request.offeredPrice)}</div>
          <div className="text-xs text-zinc-500">for the whole trip</div>
        </div>
      </div>
      <div className="mt-4">
        <Facts items={[
          ['Farmer', `${farmer?.name}${farmer?.verified ? ' (verified)' : ''}`], ['Farmer location', farmer?.location], ['Pickup date', fmtDate(request.date)],
          ['Vehicle needed', request.vehicleType || 'Any suitable'], request.notes ? ['Notes', request.notes] : null,
        ]} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100">
        <div className="text-sm">
          {active ? (
            <span className="flex flex-wrap items-center gap-2">Your response: <b>{inr(bid.price)}</b> {stale ? <StatusBadge status="Outdated" /> : <KindBadge kind={bid.kind} perspective="provider" />}</span>
          ) : <span className="text-zinc-500">You have not responded yet.</span>}
        </div>
        <div className="flex gap-2">
          {active && <Button size="sm" variant="danger" onClick={withdraw}>Withdraw</Button>}
          <Button size="sm" disabled={fits.length === 0 && !active} onClick={() => onRespond(request, active ? bid : undefined)}>
            {stale ? 'Re-confirm price' : active ? 'Update response' : 'Respond'}
          </Button>
        </div>
      </div>
      {stale && <div className="mt-3"><Notice>The farmer changed the offered price. Your earlier acceptance is on hold until you re-confirm.</Notice></div>}
    </Card>
  );
}

export default function TransportRequests() {
  const { user } = useAuth();
  const { db } = useData();
  const [tab, setTab] = useState('open');
  const [modal, setModal] = useState(null);

  const open = db.transportRequests.filter((r) => r.status === 'Open').sort((a, b) => a.date.localeCompare(b.date));
  const mine = db.transportBids.filter((b) => b.transporterId === user.id).sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  const needsAction = open.filter((r) => !myTransportBid(db, r.id, user.id) || myTransportBid(db, r.id, user.id).status === 'Outdated' || myTransportBid(db, r.id, user.id).status === 'Withdrawn').length;

  return (
    <>
      <PageHeader title="Transport requests" subtitle="Farmers post jobs with a price. Accept their price or suggest your own; the farmer chooses." />
      <div className="flex gap-2 mb-5">
        {[['open', `Open requests (${open.length})`], ['bids', `My responses (${mine.length})`]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
        {needsAction > 0 && tab === 'open' && <span className="self-center text-xs font-semibold text-amber-700">{needsAction} waiting for your response</span>}
      </div>

      {tab === 'open' && (open.length === 0
        ? <EmptyState icon={Inbox} title="No open requests right now" text="New jobs from farmers appear here as soon as they are posted." />
        : <div className="space-y-5">{open.map((r) => <OpenRequestCard key={r.id} request={r} onRespond={(request, existingBid) => setModal({ request, existingBid })} />)}</div>)}

      {tab === 'bids' && (mine.length === 0
        ? <EmptyState title="You have not responded to any request yet" />
        : (
          <div className="space-y-4">
            {mine.map((b) => {
              const r = db.transportRequests.find((x) => x.id === b.requestId);
              const farmer = db.users.find((u) => u.id === r?.farmerId);
              const shipment = db.shipments.find((s) => s.bidId === b.id);
              const v = db.vehicles.find((x) => x.id === b.vehicleId);
              return (
                <Card key={b.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-zinc-400">{b.id} · request {b.requestId}</div>
                      <div className="font-bold text-zinc-900">{r?.pickup} → {r?.destination}</div>
                      <div className="text-xs text-zinc-500">{r?.loadTonnes} t · pickup {fmtDate(r?.date)} · {v ? `${v.vehicleType} (${v.regNo})` : 'vehicle removed'}</div>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={b.status} />
                      <div className="text-xl font-black text-emerald-800 mt-1">{inr(b.price)}</div>
                      <div className="text-xs text-zinc-500">Farmer offered {inr(r?.offeredPrice)}{r?.agreedPrice != null && r.selectedBidId !== b.id ? '' : ''}</div>
                    </div>
                  </div>
                  {b.status === 'Selected' && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-zinc-900 text-sm">You won this job: {farmer?.name}</div>
                        <div className="text-xs text-zinc-600">{farmer?.location}</div>
                        <a href={`tel:${farmer?.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 mt-1"><Phone className="w-3.5 h-3.5" />{farmer?.phone}</a>
                      </div>
                      {shipment && <Button as={Link} to="/transport/shipments" size="sm">Open shipment {shipment.trackingId}</Button>}
                    </div>
                  )}
                  {b.status === 'Rejected' && <p className="text-xs text-zinc-400 mt-3">{r?.status === 'Cancelled' ? 'The farmer cancelled this request.' : 'The farmer chose another transporter.'}</p>}
                </Card>
              );
            })}
          </div>
        ))}

      {modal && <TransportBidModal request={modal.request} transporterId={user.id} existingBid={modal.existingBid} onClose={() => setModal(null)} />}
    </>
  );
}
