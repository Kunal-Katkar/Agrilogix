import React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Gauge, Inbox, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, Button } from '../../components/common';
import { fmtDate, inr } from '../../lib/format';

export default function StorageDashboard() {
  const { user } = useAuth();
  const { db } = useData();
  const facilities = db.storages.filter((s) => s.ownerId === user.id);
  const ids = new Set(facilities.map((s) => s.id));
  const bookings = db.storageRequests.filter((r) => ids.has(r.storageId));
  const openRequests = db.storageRequests.filter((r) => r.status === 'Open');
  const myBids = db.storageBids.filter((b) => b.ownerId === user.id);
  const total = facilities.reduce((n, s) => n + s.totalCapacity, 0);
  const free = facilities.reduce((n, s) => n + s.availableCapacity, 0);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle={`${user.company} · ${user.location}`} action={<Button as={Link} to="/storage/requests">View requests</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Boxes} label="Facilities" value={facilities.length} />
        <StatCard icon={Gauge} label="Free capacity" value={`${free} t`} hint={`of ${total} t total (${total ? Math.round(((total - free) / total) * 100) : 0}% used)`} tone="blue" />
        <StatCard icon={Inbox} label="Open requests" value={openRequests.length} tone="amber" hint={`${myBids.filter((b) => b.status === 'Pending' || b.status === 'Outdated').length} of your responses pending`} />
        <StatCard icon={CalendarCheck} label="Active bookings" value={bookings.filter((r) => r.status === 'Confirmed').length} />
      </div>
      <Card title="Open requests from farmers" action={<Link to="/storage/requests" className="text-xs font-bold text-emerald-700">Respond</Link>}>
        <DataTable
          rows={openRequests}
          empty="No open requests right now."
          columns={[
            { key: 'id', label: 'Request' },
            { key: 'f', label: 'Farmer', render: (r) => db.users.find((u) => u.id === r.farmerId)?.name },
            { key: 'c', label: 'City', render: (r) => r.city },
            { key: 'q', label: 'Need', render: (r) => `${r.quantity} t for ${r.days} days` },
            { key: 'p', label: 'Farmer offers', render: (r) => `${inr(r.offeredPrice)} / t / day` },
            { key: 'd', label: 'Starts', render: (r) => fmtDate(r.startDate) },
            { key: 'm', label: 'Your response', render: (r) => { const b = myBids.find((x) => x.requestId === r.id && x.status !== 'Rejected'); return b ? <StatusBadge status={b.status} /> : <span className="text-xs text-zinc-400">None yet</span>; } },
          ]}
        />
      </Card>
    </>
  );
}
