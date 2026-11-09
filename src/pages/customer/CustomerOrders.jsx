import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, StatusBadge, Button, EmptyState, cx } from '../../components/common';
import { PaymentStrip } from '../../components/PaymentParts';
import { inr, fmtDate, fmtDateTime } from '../../lib/format';

export default function CustomerOrders() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const [tab, setTab] = useState('orders');

  const orders = db.orders.filter((o) => o.customerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const enquiries = db.enquiries.filter((e) => e.customerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const cancel = (o) => {
    if (!window.confirm(`Cancel order ${o.id}?`)) return;
    const res = run('cancelOrder', { orderId: o.id });
    showToast(res.ok ? 'Order cancelled.' : res.error, res.ok ? 'success' : 'info');
  };

  return (
    <>
      <PageHeader title="My orders" subtitle="Track orders, pay, and follow up on enquiries." />
      <div className="flex gap-2 mb-4">
        {[['orders', `Orders (${orders.length})`], ['enquiries', `Enquiries (${enquiries.length})`]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
      </div>

      {tab === 'orders' && (orders.length === 0 ? (
        <EmptyState title="No orders yet" text="Browse the marketplace and place your first order." action={<Button as={Link} to="/customer">Browse produce</Button>} />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const l = db.listings.find((x) => x.id === o.listingId);
            const farmer = db.users.find((u) => u.id === o.farmerId);
            const payment = db.payments.find((p) => p.kind === 'Order' && p.orderId === o.id);
            const shipment = db.shipments.find((s) => s.orderId === o.id);
            const events = db.events.filter((ev) => (ev.entityType === 'Order' && ev.entityId === o.id) || (shipment && ev.entityType === 'Shipment' && ev.entityId === shipment.trackingId))
              .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            return (
              <Card key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-400">{o.id} · {fmtDate(o.createdAt)}</div>
                    <h3 className="font-extrabold text-zinc-900">{l ? <Link to={`/customer/listings/${l.id}`} className="hover:text-emerald-700">{l.name}</Link> : 'Listing removed'}</h3>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />from <Link to={`/customer/farmers/${farmer.id}`} className="font-semibold text-emerald-800">{farmer.name}</Link>, {farmer.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-zinc-900">{inr(o.totalAmount)}</div>
                    <div className="text-xs text-zinc-500">{o.quantity} {o.unit}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <StatusBadge status={o.status} />
                </div>
                {payment && <PaymentStrip payment={payment} className="mt-3" />}
                {events.length > 0 && (
                  <ol className="mt-4 border-l-2 border-emerald-100 ml-1.5 space-y-2">
                    {events.map((ev) => (
                      <li key={ev.id} className="pl-4 relative text-xs">
                        <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-zinc-800">{ev.status}</span> <span className="text-zinc-500">· {ev.note} · {fmtDateTime(ev.timestamp)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-100">
                  {shipment && <Button as={Link} to={`/customer/track/${shipment.trackingId}`} size="sm" variant="secondary">Track shipment</Button>}
                  {o.status === 'Placed' && <Button size="sm" variant="danger" onClick={() => cancel(o)}>Cancel order</Button>}
                </div>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === 'enquiries' && (enquiries.length === 0 ? (
        <EmptyState title="No enquiries yet" text="Use 'Ask the farmer' on any listing page." />
      ) : (
        <div className="space-y-4">
          {enquiries.map((e) => {
            const l = db.listings.find((x) => x.id === e.listingId);
            const farmer = db.users.find((u) => u.id === e.farmerId);
            return (
              <Card key={e.id}>
                <div className="flex items-start justify-between gap-3"><div><div className="font-bold text-zinc-900">{l?.name || 'Listing removed'}</div><div className="text-xs text-zinc-400">to {farmer?.name} · {fmtDate(e.createdAt)}</div></div><StatusBadge status={e.status} /></div>
                <p className="text-sm text-zinc-700 mt-3 bg-zinc-50 rounded-xl p-3">{e.message}</p>
                {e.reply && <p className="text-sm text-emerald-900 mt-2 bg-emerald-50 rounded-xl p-3"><span className="font-bold">{farmer?.name}: </span>{e.reply}</p>}
              </Card>
            );
          })}
        </div>
      ))}

    </>
  );
}
