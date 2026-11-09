import React, { useState } from 'react';
import { MapPin, Phone, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, StatusBadge, Button, EmptyState, Notice, cx } from '../../components/common';
import { StorageBidModal } from '../../components/RequestModals';
import { KindBadge, Facts } from '../../components/bids';
import { PaymentStrip } from '../../components/PaymentParts';
import { eligibleFacilities, myStorageBid, storageTotal } from '../../lib/negotiation';
import { inr, fmtDate } from '../../lib/format';

function OpenRequestCard({ request, onRespond }) {
  const { db, run } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const farmer = db.users.find((u) => u.id === request.farmerId);
  const listing = db.listings.find((l) => l.id === request.listingId);
  const mine = db.storages.filter((s) => s.ownerId === user.id);
  const inCity = mine.some((s) => s.location.toLowerCase().includes(request.city.toLowerCase()));
  const fits = eligibleFacilities(db, user.id, request);
  const bid = myStorageBid(db, request.id, user.id);
  const active = bid && bid.status !== 'Withdrawn';
  const stale = bid?.status === 'Outdated';

  const withdraw = () => {
    if (!window.confirm('Withdraw your response?')) return;
    const res = run('withdrawStorageBid', { bidId: bid.id, ownerId: user.id });
    showToast(res.ok ? 'Response withdrawn.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-zinc-400">{request.id} · posted {fmtDate(request.createdAt)}</div>
          <h3 className="font-extrabold text-zinc-900 text-lg">{request.quantity} t{listing ? ` of ${listing.name}` : ''} for {request.days} days</h3>
          <div className="text-sm text-zinc-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />Needed in {request.city} from {fmtDate(request.startDate)}</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {inCity && <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Your facility is in this city</span>}
            {fits.length === 0 && <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">No facility of yours fits</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Farmer's price</div>
          <div className="text-2xl font-black text-emerald-800">{inr(request.offeredPrice)}<span className="text-xs font-medium text-zinc-500"> / t / day</span></div>
          <div className="text-xs text-zinc-500">About {inr(storageTotal(request))} in total</div>
        </div>
      </div>
      <div className="mt-4">
        <Facts items={[
          ['Farmer', `${farmer?.name}${farmer?.verified ? ' (verified)' : ''}`], ['Farmer location', farmer?.location],
          ['Storage type', request.storageType || 'Any'], request.notes ? ['Notes', request.notes] : null,
        ]} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-zinc-100">
        <div className="text-sm">
          {active ? (
            <span className="flex flex-wrap items-center gap-2">Your response: <b>{inr(bid.price)} / t / day</b> {stale ? <StatusBadge status="Outdated" /> : <KindBadge kind={bid.kind} perspective="provider" />}</span>
          ) : <span className="text-zinc-500">You have not responded yet.</span>}
        </div>
        <div className="flex gap-2">
          {active && <Button size="sm" variant="danger" onClick={withdraw}>Withdraw</Button>}
          <Button size="sm" disabled={fits.length === 0 && !active} onClick={() => onRespond(request, active ? bid : undefined)}>
            {stale ? 'Re-confirm terms' : active ? 'Update response' : 'Respond'}
          </Button>
        </div>
      </div>
      {stale && <div className="mt-3"><Notice>The farmer changed the terms. Your earlier acceptance is on hold until you re-confirm.</Notice></div>}
    </Card>
  );
}

export default function StorageRequests() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const [tab, setTab] = useState('open');
  const [modal, setModal] = useState(null);

  const myFacilityIds = new Set(db.storages.filter((s) => s.ownerId === user.id).map((s) => s.id));
  const open = db.storageRequests.filter((r) => r.status === 'Open').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const bids = db.storageBids.filter((b) => b.ownerId === user.id).sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  const bookings = db.storageRequests.filter((r) => myFacilityIds.has(r.storageId) && ['Confirmed', 'Completed'].includes(r.status))
    .sort((a, b) => (a.status === 'Confirmed' ? 0 : 1) - (b.status === 'Confirmed' ? 0 : 1) || b.startDate.localeCompare(a.startDate));
  const needsAction = open.filter((r) => { const b = myStorageBid(db, r.id, user.id); return !b || ['Outdated', 'Withdrawn'].includes(b.status); }).length;

  const complete = (r) => {
    if (!window.confirm('Mark this booking as completed and release the reserved capacity?')) return;
    const res = run('completeStorage', { requestId: r.id });
    showToast(res.ok ? 'Booking completed. Capacity released.' : res.error, res.ok ? 'success' : 'info');
  };

  const tabs = [['open', `Open requests (${open.length})`], ['bids', `My responses (${bids.length})`], ['bookings', `Bookings (${bookings.length})`]];

  return (
    <>
      <PageHeader title="Storage requests" subtitle="Farmers post storage needs with a price. Accept their price or suggest your own; the farmer chooses." />
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
        {needsAction > 0 && tab === 'open' && <span className="self-center text-xs font-semibold text-amber-700">{needsAction} waiting for your response</span>}
      </div>

      {tab === 'open' && (open.length === 0
        ? <EmptyState icon={Inbox} title="No open storage requests" text="New requests from farmers appear here as soon as they are posted." />
        : <div className="space-y-5">{open.map((r) => <OpenRequestCard key={r.id} request={r} onRespond={(request, existingBid) => setModal({ request, existingBid })} />)}</div>)}

      {tab === 'bids' && (bids.length === 0 ? <EmptyState title="You have not responded to any request yet" /> : (
        <div className="space-y-4">
          {bids.map((b) => {
            const r = db.storageRequests.find((x) => x.id === b.requestId);
            const f = db.storages.find((s) => s.id === b.storageId);
            return (
              <Card key={b.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-400">{b.id} · request {b.requestId}</div>
                    <div className="font-bold text-zinc-900">{r?.quantity} t for {r?.days} days in {r?.city}</div>
                    <div className="text-xs text-zinc-500">{f ? f.name : 'Facility removed'} · starts {fmtDate(r?.startDate)}</div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={b.status} />
                    <div className="text-xl font-black text-emerald-800 mt-1">{inr(b.price)}<span className="text-xs font-medium text-zinc-500"> / t / day</span></div>
                    <div className="text-xs text-zinc-500">Farmer offered {inr(r?.offeredPrice)}</div>
                  </div>
                </div>
                {b.status === 'Selected' && <p className="text-xs text-emerald-800 font-semibold mt-3">Chosen by the farmer. See the Bookings tab.</p>}
                {b.status === 'Rejected' && <p className="text-xs text-zinc-400 mt-3">{r?.status === 'Cancelled' ? 'The farmer cancelled this request.' : 'The farmer chose another provider.'}</p>}
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'bookings' && (bookings.length === 0 ? <EmptyState title="No bookings yet" text="When a farmer selects your response, the booking appears here." /> : (
        <div className="space-y-4">
          {bookings.map((r) => {
            const farmer = db.users.find((u) => u.id === r.farmerId);
            const f = db.storages.find((s) => s.id === r.storageId);
            const listing = db.listings.find((l) => l.id === r.listingId);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-400">{r.id}</div>
                    <div className="font-extrabold text-zinc-900">{r.quantity} t{listing ? ` of ${listing.name}` : ''} at {f?.name}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{farmer?.name}, {farmer?.location}</div>
                    {r.status === 'Confirmed' && <a href={`tel:${farmer?.phone}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800 mt-1"><Phone className="w-3.5 h-3.5" />{farmer?.phone}</a>}
                  </div>
                  <div className="text-right">
                    <StatusBadge status={r.status} />
                    <div className="text-xl font-black text-emerald-800 mt-1">{inr(storageTotal(r, r.agreedPrice))}</div>
                    <div className="text-xs text-zinc-500">{inr(r.agreedPrice)} / t / day · {r.days} days from {fmtDate(r.startDate)}</div>
                  </div>
                </div>
                <PaymentStrip payment={db.payments.find((p) => p.kind === 'Storage' && p.refId === r.id)} className="mt-3" />
                {r.status === 'Confirmed' && <div className="flex justify-end mt-3"><Button size="sm" variant="secondary" onClick={() => complete(r)}>Mark completed</Button></div>}
              </Card>
            );
          })}
        </div>
      ))}

      {modal && <StorageBidModal request={modal.request} ownerId={user.id} existingBid={modal.existingBid} onClose={() => setModal(null)} />}
    </>
  );
}
