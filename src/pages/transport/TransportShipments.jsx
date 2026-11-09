import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader, Card, StatusBadge, Button, EmptyState } from '../../components/common';
import { PaymentStrip } from '../../components/PaymentParts';
import { SHIPMENT_FLOW } from '../../data/actions';
import { fmtDate, inr } from '../../lib/format';

export default function TransportShipments() {
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const shipments = db.shipments.filter((s) => s.transporterId === user.id)
    .sort((a, b) => (a.status === 'Delivered') - (b.status === 'Delivered') || b.trackingId.localeCompare(a.trackingId));

  const advance = (s) => {
    const res = run('updateShipment', { trackingId: s.trackingId });
    if (!res.ok) return showToast(res.error);
    const next = SHIPMENT_FLOW[SHIPMENT_FLOW.indexOf(s.status) + 1];
    showToast(`${s.trackingId} marked ${next}.`, 'success');
  };

  return (
    <>
      <PageHeader title="Shipments" subtitle="Update each shipment as it moves. Farmers and buyers see the status immediately." />
      {shipments.length === 0 ? <EmptyState title="No shipments yet" text="Accept a transport request to create one." action={<Button as={Link} to="/transport/requests">View requests</Button>} /> : (
        <div className="space-y-4">
          {shipments.map((s) => {
            const idx = SHIPMENT_FLOW.indexOf(s.status);
            const next = SHIPMENT_FLOW[idx + 1];
            const vehicle = db.vehicles.find((v) => v.id === s.vehicleId);
            const order = db.orders.find((o) => o.id === s.orderId);
            const farmer = db.users.find((u) => u.id === order?.farmerId);
            return (
              <Card key={s.trackingId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-zinc-900">{s.trackingId}</div>
                    <div className="text-sm text-zinc-600">{s.pickup} → {s.destination}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{vehicle?.vehicleType} · {vehicle?.regNo} · ETA {fmtDate(s.eta)} · Order {s.orderId}</div>
                    <div className="text-xs text-zinc-600 mt-1">Agreed price <b>{inr(s.agreedPrice)}</b> · Farmer {farmer?.name}, {farmer?.phone}</div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mt-4"><div className="h-full bg-emerald-600" style={{ width: `${s.progress}%` }} /></div>
                <PaymentStrip payment={db.payments.find((p) => p.kind === 'Transport' && p.refId === s.trackingId)} className="mt-4" />
                <div className="flex gap-2 mt-4">
                  {next && <Button size="sm" onClick={() => advance(s)}>Mark as {next}</Button>}
                  <Button as={Link} to={`/transport/track/${s.trackingId}`} size="sm" variant="secondary">Open tracking page</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
