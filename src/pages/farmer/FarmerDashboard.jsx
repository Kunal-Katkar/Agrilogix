import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ClipboardList, MessageSquare, Warehouse, Truck, IndianRupee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, Button } from '../../components/common';
import { inr, fmtDate } from '../../lib/format';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { db } = useData();
  const listings = db.listings.filter((l) => l.farmerId === user.id);
  const orders = db.orders.filter((o) => o.farmerId === user.id);
  const enquiries = db.enquiries.filter((e) => e.farmerId === user.id);
  const storageReqs = db.storageRequests.filter((r) => r.farmerId === user.id);
  const transportReqs = db.transportRequests.filter((r) => r.farmerId === user.id);
  const openTr = new Set(transportReqs.filter((r) => r.status === 'Open').map((r) => r.id));
  const openSr = new Set(storageReqs.filter((r) => r.status === 'Open').map((r) => r.id));
  const trOffers = db.transportBids.filter((b) => openTr.has(b.requestId) && b.status === 'Pending').length;
  const srOffers = db.storageBids.filter((b) => openSr.has(b.requestId) && b.status === 'Pending').length;

  const revenue = orders
    .filter((o) => ['Accepted', 'In transit', 'Delivered'].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const rows = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        subtitle={`${user.farmName} · ${user.location}`}
        action={<Button as={Link} to="/farmer/listings">Manage listings</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Package} label="Active listings" value={listings.filter((l) => l.availability !== 'Out of stock').length} hint={`${listings.length} total`} />
        <StatCard icon={ClipboardList} label="Orders awaiting response" value={orders.filter((o) => o.status === 'Placed').length} tone="amber" hint={`${orders.length} orders in all`} />
        <StatCard icon={MessageSquare} label="Open enquiries" value={enquiries.filter((e) => e.status === 'Open').length} tone="amber" />
        <StatCard icon={Warehouse} label="Storage requests" value={storageReqs.length} tone="blue" hint={`${openSr.size} open · ${srOffers} offer${srOffers === 1 ? '' : 's'} to review`} />
        <StatCard icon={Truck} label="Transport requests" value={transportReqs.length} tone="blue" hint={`${openTr.size} open · ${trOffers} offer${trOffers === 1 ? '' : 's'} to review`} />
        <StatCard icon={IndianRupee} label="Confirmed order value" value={inr(revenue)} hint="Accepted, in transit and delivered" />
      </div>
      <Card title="Recent orders" action={<Link to="/farmer/orders" className="text-xs font-bold text-emerald-700">View all</Link>}>
        <DataTable
          rows={rows}
          empty="No orders yet. They will appear here when buyers order your produce."
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'p', label: 'Produce', render: (o) => db.listings.find((l) => l.id === o.listingId)?.name },
            { key: 'c', label: 'Customer', render: (o) => db.users.find((u) => u.id === o.customerId)?.name },
            { key: 'q', label: 'Quantity', render: (o) => `${o.quantity} ${o.unit}` },
            { key: 't', label: 'Total', render: (o) => inr(o.totalAmount) },
            { key: 'd', label: 'Date', render: (o) => fmtDate(o.createdAt) },
            { key: 's', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
          ]}
        />
      </Card>
    </>
  );
}
