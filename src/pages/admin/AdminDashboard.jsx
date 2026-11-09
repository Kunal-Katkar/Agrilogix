import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, ShieldAlert, IndianRupee, ClipboardList, Route, Gauge, AlertTriangle, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PageHeader, StatCard, Card, StatusBadge, Button } from '../../components/common';
import { ChartCard, StackBar, Columns, COLORS, VIZ } from '../../components/charts';
import { computeAnalytics } from '../../lib/analytics';
import { inr, fmtDateTime } from '../../lib/format';

export default function AdminDashboard() {
  const { db } = useData();
  const a = useMemo(() => computeAnalytics(db), [db]);
  const unanswered = db.transportRequests.filter((r) => r.status === 'Open' && !db.transportBids.some((b) => b.requestId === r.id && b.status !== 'Withdrawn')).length
    + db.storageRequests.filter((r) => r.status === 'Open' && !db.storageBids.some((b) => b.requestId === r.id && b.status !== 'Withdrawn')).length;

  const attention = [
    { text: `${a.users.kycPending} KYC submission${a.users.kycPending === 1 ? '' : 's'} waiting for review`, to: '/admin/kyc', show: a.users.kycPending > 0 },
    { text: `${unanswered} open transport or storage request${unanswered === 1 ? '' : 's'} with no provider response`, to: '/admin/analytics', show: unanswered > 0 },
    { text: `${a.market.openEnquiries} unanswered buyer enquir${a.market.openEnquiries === 1 ? 'y' : 'ies'}`, to: '/admin/analytics', show: a.market.openEnquiries > 0 },
    { text: `${a.users.suspended} suspended account${a.users.suspended === 1 ? '' : 's'}`, to: '/admin/users', show: a.users.suspended > 0 },
  ].filter((x) => x.show);

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Everything happening across farmers, buyers, transporters and storage owners." action={<Button as={Link} to="/admin/analytics" variant="secondary">Detailed analytics</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Registered users" value={a.users.total} hint={a.users.byRole.map((r) => `${r.value} ${r.label === 'StorageOwner' ? 'storage' : r.label.toLowerCase()}`).join(' · ')} />
        <StatCard icon={ShieldAlert} label="KYC awaiting review" value={a.users.kycPending} tone="amber" hint={`${a.users.kyc.find((k) => k.label === 'Verified').value} verified`} />
        <StatCard icon={IndianRupee} label="Order value (excl. rejected)" value={inr(a.market.gmv)} hint={`${inr(a.market.paid)} paid · ${a.market.collectionRate}% collected`} />
        <StatCard icon={ClipboardList} label="Orders" value={a.market.totalOrders} tone="blue" hint={`${a.market.activeListings} of ${a.market.listings} listings active`} />
        <StatCard icon={Route} label="Active shipments" value={a.transport.activeShipments} tone="blue" hint={`${inr(a.transport.freightValue)} freight agreed`} />
        <StatCard icon={Gauge} label="Storage utilisation" value={`${a.storage.utilisation}%`} hint={`${a.storage.usedCapacity} of ${a.storage.totalCapacity} t in use`} />
      </div>

      {attention.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="flex items-center gap-2 font-extrabold text-sm text-amber-900 mb-3"><AlertTriangle className="w-4 h-4" />Needs attention</h2>
          <ul className="space-y-2">
            {attention.map((x) => (
              <li key={x.text}><Link to={x.to} className="flex items-center justify-between gap-3 text-sm text-amber-900 hover:underline"><span>{x.text}</span><ArrowRight className="w-4 h-4 shrink-0" /></Link></li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <ChartCard title="Users by role" subtitle="Registered accounts, excluding administrators" table={{ head: ['Role', 'Users'], rows: a.users.byRole.map((r) => [r.label, r.value]) }}>
          <StackBar data={a.users.byRole} colors={COLORS.role} />
        </ChartCard>
        <ChartCard title="KYC status" subtitle="Share of accounts by verification state" table={{ head: ['Status', 'Accounts'], rows: a.users.kyc.map((r) => [r.label, r.value]) }}>
          <StackBar data={a.users.kyc} colors={COLORS.kyc} />
        </ChartCard>
        <ChartCard title="Orders by status" subtitle={`${a.market.totalOrders} orders in total`} table={{ head: ['Status', 'Orders'], rows: a.market.ordersByStatus.map((r) => [r.label, r.value]) }}>
          <StackBar data={a.market.ordersByStatus} colors={COLORS.order} />
        </ChartCard>
        <ChartCard title="Order value by month" subtitle="Orders that were not rejected or cancelled, in ₹" table={{ head: ['Month', 'Orders', 'Value'], rows: a.market.byMonth.map((m) => [m.label, m.orders, inr(m.value)]) }}>
          <Columns data={a.market.byMonth.map((m) => ({ label: m.label, value: m.value }))} color={VIZ.blue} format={inr} />
        </ChartCard>
      </div>

      <Card title="Latest activity" action={<Link to="/admin/activity" className="text-xs font-bold text-emerald-700">Full log</Link>}>
        <ul className="divide-y divide-zinc-100 -my-2">
          {a.activity.slice(0, 8).map((e) => (
            <li key={e.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <StatusBadge status={e.status} />
              <span className="font-semibold text-zinc-800">{e.title}</span>
              <span className="text-zinc-500 truncate">{e.note}</span>
              <span className="ml-auto text-xs text-zinc-400">{fmtDateTime(e.timestamp)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
