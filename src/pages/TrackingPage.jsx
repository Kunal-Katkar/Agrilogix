import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Truck, CalendarClock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Card, StatusBadge, EmptyState, Notice, Meta } from '../components/common';
import { SHIPMENT_FLOW } from '../data/actions';
import { fmtDate, fmtDateTime, inr } from '../lib/format';

// Shipment tracking UI (SRS TR-6). It shows stored shipment data only: no GPS, no live location, no map service.
function PlaceholderMap({ shipment }) {
  const p = shipment.progress / 100;
  // Straight-line route from pickup (left) to destination (right); the truck marker moves with progress.
  const x1 = 60, y1 = 150, x2 = 540, y2 = 60;
  const cx = x1 + (x2 - x1) * p;
  const cy = y1 + (y2 - y1) * p;
  return (
    <div className="relative rounded-2xl overflow-hidden border border-emerald-100 bg-emerald-50">
      <svg viewBox="0 0 600 210" className="w-full h-auto" role="img" aria-label="Placeholder route map">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#CFE5CF" strokeWidth="1" /></pattern>
        </defs>
        <rect width="600" height="210" fill="url(#grid)" />
        <path d="M0 120 C120 90 180 190 300 140 S480 90 600 150" fill="none" stroke="#BFD9E8" strokeWidth="14" opacity="0.7" />
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CCFA5" strokeWidth="4" strokeDasharray="8 8" />
        <line x1={x1} y1={y1} x2={cx} y2={cy} stroke="#2E7D32" strokeWidth="5" strokeLinecap="round" />
        <circle cx={x1} cy={y1} r="9" fill="#2E7D32" /><circle cx={x2} cy={y2} r="9" fill="#C0392B" />
        <g transform={`translate(${cx - 14}, ${cy - 28})`}>
          <rect width="28" height="22" rx="6" fill="#1B5E20" /><text x="14" y="16" textAnchor="middle" fontSize="13">🚚</text>
        </g>
        <text x={x1} y={y1 + 28} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1B5E20">{shipment.pickup.split(',')[0]}</text>
        <text x={x2} y={y2 - 16} textAnchor="middle" fontSize="12" fontWeight="700" fill="#922B21">{shipment.destination.split(',')[0]}</text>
      </svg>
      <div className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-amber-800 border border-amber-200 rounded-full px-2.5 py-1">Placeholder map · dummy data</div>
    </div>
  );
}

export default function TrackingPage() {
  const { trackingId } = useParams();
  const { user } = useAuth();
  const { db } = useData();
  const shipment = db.shipments.find((s) => s.trackingId === trackingId);
  const order = shipment && db.orders.find((o) => o.id === shipment.orderId);

  const home = { Farmer: '/farmer/orders', Customer: '/customer/orders', Transporter: '/transport/shipments', StorageOwner: '/storage' }[user.role];
  const allowed = shipment && order && (
    (user.role === 'Customer' && order.customerId === user.id)
    || (user.role === 'Farmer' && order.farmerId === user.id)
    || (user.role === 'Transporter' && shipment.transporterId === user.id)
  );

  if (!allowed) {
    return <EmptyState title="Shipment not available" text="This tracking ID does not exist, or it does not belong to your account." action={<Link to={home} className="text-emerald-700 font-bold text-sm">Go back</Link>} />;
  }

  const listing = db.listings.find((l) => l.id === order.listingId);
  const vehicle = db.vehicles.find((v) => v.id === shipment.vehicleId);
  const transporter = db.users.find((u) => u.id === shipment.transporterId);
  const events = db.events.filter((e) => e.entityType === 'Shipment' && e.entityId === trackingId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const stepIndex = SHIPMENT_FLOW.indexOf(shipment.status);

  return (
    <>
      <Link to={home} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-4"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tracking ID</div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{shipment.trackingId}</h1>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      <div className="mb-6"><Notice>Prototype tracking: status and progress come from stored shipment records. Live GPS location is not active in this version.</Notice></div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <PlaceholderMap shipment={shipment} />
          <Card title="Delivery progress">
            <div className="flex justify-between text-xs font-semibold text-zinc-600 mb-2"><span>{shipment.pickup.split(',')[0]}</span><span>{shipment.progress}%</span><span>{shipment.destination.split(',')[0]}</span></div>
            <div className="h-3 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-green-700 transition-all" style={{ width: `${shipment.progress}%` }} /></div>
            <div className="grid grid-cols-4 gap-2 mt-5">
              {SHIPMENT_FLOW.map((step, i) => (
                <div key={step} className="text-center">
                  <div className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? 'bg-emerald-700 text-white' : 'bg-zinc-100 text-zinc-400'}`}>{i <= stepIndex ? <Check className="w-4 h-4" /> : i + 1}</div>
                  <div className={`text-[11px] mt-1.5 font-semibold ${i <= stepIndex ? 'text-emerald-800' : 'text-zinc-400'}`}>{step}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="Shipment details">
            <div className="space-y-4">
              <Meta label="Pickup"><span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{shipment.pickup}</span></Meta>
              <Meta label="Destination"><span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-500" />{shipment.destination}</span></Meta>
              <Meta label="Estimated delivery"><span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-emerald-600" />{fmtDate(shipment.eta)}</span></Meta>
              <Meta label="Consignment"><span className="inline-flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-emerald-600" />{listing?.name}, {order.quantity} {order.unit} (order {order.id})</span></Meta>
              <Meta label="Vehicle"><span className="inline-flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-emerald-600" />{vehicle?.vehicleType} · {vehicle?.regNo}</span></Meta>
              <Meta label="Carrier">{transporter?.company || transporter?.name}</Meta>
              {user.role !== 'Customer' && shipment.agreedPrice != null && <Meta label="Agreed freight price">{inr(shipment.agreedPrice)}</Meta>}
            </div>
          </Card>
          <Card title="Status history">
            <ol className="border-l-2 border-emerald-100 ml-1.5 space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="pl-4 relative text-xs">
                  <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="font-bold text-zinc-800">{ev.status}</div>
                  <div className="text-zinc-500">{ev.note} · {fmtDateTime(ev.timestamp)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
