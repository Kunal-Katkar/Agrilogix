import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Inbox, Route, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, Button } from '../../components/common';
import { fmtDate } from '../../lib/format';

export default function TransportDashboard() {
  const { user } = useAuth();
  const { db } = useData();
  const vehicles = db.vehicles.filter((v) => v.ownerId === user.id);
  const openRequests = db.transportRequests.filter((r) => r.status === 'Open');
  const myBids = db.transportBids.filter((b) => b.transporterId === user.id);
  const shipments = db.shipments.filter((s) => s.transporterId === user.id);
  const active = shipments.filter((s) => s.status !== 'Delivered');

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle={`${user.company} · ${user.location}`} action={<Button as={Link} to="/transport/requests">View requests</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Truck} label="Vehicles" value={vehicles.length} hint={`${vehicles.filter((v) => v.availability === 'Available').length} available`} />
        <StatCard icon={Inbox} label="Open requests" value={openRequests.length} tone="amber" hint={`${myBids.filter((b) => b.status === 'Pending' || b.status === 'Outdated').length} of your responses pending`} />
        <StatCard icon={Route} label="Active shipments" value={active.length} tone="blue" />
        <StatCard icon={CheckCircle2} label="Completed trips" value={shipments.filter((s) => s.status === 'Delivered').length} />
      </div>
      <Card title="Active shipments" action={<Link to="/transport/shipments" className="text-xs font-bold text-emerald-700">Manage</Link>}>
        <DataTable
          rows={active}
          empty="No active shipments. Accept a request to start one."
          columns={[
            { key: 'trackingId', label: 'Tracking ID' },
            { key: 'r', label: 'Route', render: (s) => `${s.pickup} → ${s.destination}` },
            { key: 'e', label: 'ETA', render: (s) => fmtDate(s.eta) },
            { key: 's', label: 'Status', render: (s) => <StatusBadge status={s.status} /> },
          ]}
        />
      </Card>
    </>
  );
}
