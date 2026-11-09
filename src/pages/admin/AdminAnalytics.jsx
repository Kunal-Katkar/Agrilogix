import React, { useMemo, useState } from 'react';
import { IndianRupee, Percent, Package, Truck, Warehouse, Handshake, TrendingUp, Gauge } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PageHeader, StatCard, Card, DataTable, StatusBadge, cx } from '../../components/common';
import { ChartCard, StackBar, HBars, Columns, Funnel, COLORS, VIZ } from '../../components/charts';
import { computeAnalytics } from '../../lib/analytics';
import { inr, fmtDate } from '../../lib/format';

const signed = (n) => `${n > 0 ? '+' : ''}${n}%`;

function Marketplace({ a, db }) {
  const m = a.market;
  const recent = [...db.orders].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 8);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={IndianRupee} label="Order value" value={inr(m.gmv)} hint={`Average ${inr(m.avgOrderValue)} per order`} />
        <StatCard icon={Percent} label="Payments collected" value={`${m.collectionRate}%`} tone="blue" hint={`${inr(m.paid)} paid · ${inr(m.pending)} pending`} />
        <StatCard icon={Package} label="Listings" value={m.listings} hint={`${m.outOfStock} out of stock`} />
        <StatCard icon={TrendingUp} label="Stock on offer" value={inr(m.stockValue)} tone="amber" hint="Available quantity at listed prices" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <ChartCard title="Order value by month" subtitle="Excludes rejected and cancelled orders" table={{ head: ['Month', 'Orders', 'Value'], rows: m.byMonth.map((r) => [r.label, r.orders, inr(r.value)]) }}>
          <Columns data={m.byMonth.map((r) => ({ label: r.label, value: r.value }))} format={inr} />
        </ChartCard>
        <ChartCard title="Payments" subtitle="Status of payment records" table={{ head: ['Status', 'Payments'], rows: m.paymentsByStatus.map((r) => [r.label, r.value]) }}>
          <StackBar data={m.paymentsByStatus} colors={COLORS.payment} />
        </ChartCard>
        <ChartCard title="Top farmers" subtitle="By order value" table={{ head: ['Farmer', 'Value'], rows: m.topFarmers.map((r) => [r.label, inr(r.value)]) }}><HBars data={m.topFarmers} format={inr} color={VIZ.blue} /></ChartCard>
        <ChartCard title="Top produce" subtitle="By order value" table={{ head: ['Produce', 'Value'], rows: m.topProduce.map((r) => [r.label, inr(r.value)]) }}><HBars data={m.topProduce} format={inr} color={VIZ.green} /></ChartCard>
        <ChartCard title="Top buyers" subtitle="By order value" table={{ head: ['Buyer', 'Value'], rows: m.topCustomers.map((r) => [r.label, inr(r.value)]) }}><HBars data={m.topCustomers} format={inr} color={VIZ.orange} /></ChartCard>
        <ChartCard title="Listings by category" subtitle="Number of listings" table={{ head: ['Category', 'Listings'], rows: m.byCategory.map((r) => [r.label, r.value]) }}><StackBar data={m.byCategory} colors={COLORS.category} /></ChartCard>
        <ChartCard title="Where produce is stored" subtitle="Listings in the farmer's own storage vs a provider's facility" table={{ head: ['Storage', 'Listings'], rows: [['Own storage', m.ownStorageListings], ['Provider facility', m.providerStorageListings]] }}>
          <StackBar data={[{ label: 'Own storage', value: m.ownStorageListings }, { label: 'Provider facility', value: m.providerStorageListings }]} colors={{ 'Own storage': VIZ.yellow, 'Provider facility': VIZ.blue }} />
        </ChartCard>
      </div>
      <Card title="Recent orders">
        <DataTable
          rows={recent}
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'p', label: 'Produce', render: (o) => db.listings.find((l) => l.id === o.listingId)?.name },
            { key: 'f', label: 'Farmer', render: (o) => db.users.find((u) => u.id === o.farmerId)?.name },
            { key: 'c', label: 'Buyer', render: (o) => db.users.find((u) => u.id === o.customerId)?.name },
            { key: 't', label: 'Value', render: (o) => inr(o.totalAmount) },
            { key: 'd', label: 'Date', render: (o) => fmtDate(o.createdAt) },
            { key: 's', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
          ]}
        />
      </Card>
    </>
  );
}

// Shared by the transport and storage tabs: how requests turn into deals, and how prices move.
function NegotiationStats({ n, noun }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Handshake} label="Request-to-deal rate" value={`${n.conversion}%`} hint={`${n.confirmed} of ${n.posted} ${noun} requests confirmed`} />
        <StatCard icon={Package} label="Responses per request" value={n.bidsPerRequest} tone="blue" hint={`${n.bids} responses in total`} />
        <StatCard icon={Percent} label="Accept farmer's price" value={`${n.acceptShare}%`} tone="amber" hint="Share of responses that accepted the offer" />
        <StatCard icon={TrendingUp} label="Counter-offer premium" value={signed(n.avgCounterPremium)} tone="red" hint={`Deals closed ${signed(n.avgAgreedVsOffer)} vs farmer's offer`} />
      </div>
    </>
  );
}

function Transport({ a }) {
  const t = a.transport;
  return (
    <>
      <NegotiationStats n={t} noun="transport" />
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Request funnel" subtitle="From posted request to confirmed transporter" table={{ head: ['Stage', 'Requests'], rows: [['Posted', t.posted], ['Got at least one response', t.withBids], ['Confirmed', t.confirmed]] }}>
          <Funnel steps={[{ label: 'Posted', value: t.posted }, { label: 'Got at least one response', value: t.withBids }, { label: 'Confirmed', value: t.confirmed }]} />
        </ChartCard>
        <ChartCard title="Requests by status" table={{ head: ['Status', 'Requests'], rows: t.byStatus.map((r) => [r.label, r.value]) }}><StackBar data={t.byStatus} colors={COLORS.request} /></ChartCard>
        <ChartCard title="Shipments by status" subtitle={`${inr(t.freightValue)} freight agreed in total`} table={{ head: ['Status', 'Shipments'], rows: t.shipmentsByStatus.map((r) => [r.label, r.value]) }}><StackBar data={t.shipmentsByStatus} colors={COLORS.shipment} /></ChartCard>
        <ChartCard title="Fleet availability" subtitle={`${t.vehicles} vehicles, ${t.capacityTonnes} t combined capacity`} table={{ head: ['State', 'Vehicles'], rows: t.fleet.map((r) => [r.label, r.value]) }}><StackBar data={t.fleet} colors={COLORS.fleet} /></ChartCard>
        <ChartCard title="Fleet by vehicle type" className="lg:col-span-2" table={{ head: ['Type', 'Vehicles'], rows: t.fleetByType.map((r) => [r.label, r.value]) }}><HBars data={t.fleetByType} color={VIZ.aqua} /></ChartCard>
      </div>
    </>
  );
}

function Storage({ a }) {
  const s = a.storage;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Warehouse} label="Facilities" value={s.facilities} hint={`${s.totalCapacity} t total capacity`} />
        <StatCard icon={Gauge} label="Utilisation" value={`${s.utilisation}%`} tone="blue" hint={`${s.usedCapacity} t used · ${s.freeCapacity} t free`} />
        <StatCard icon={IndianRupee} label="Booked value" value={inr(s.bookedValue)} tone="amber" hint="Confirmed and completed bookings" />
        <StatCard icon={Truck} label="Storage requests" value={s.posted} hint={`${s.confirmed} confirmed`} />
      </div>
      <NegotiationStats n={s} noun="storage" />
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Capacity used by facility" subtitle="Percentage of each facility's capacity" className="lg:col-span-2" table={{ head: ['Facility', 'Used (t)', 'Total (t)', 'Used'], rows: s.perFacility.map((f) => [f.label, f.used, f.total, `${f.pct}%`]) }}>
          <HBars data={s.perFacility.map((f) => ({ label: f.label, value: f.pct, note: `${f.used} / ${f.total} t` }))} format={(v) => `${v}%`} max={100} color={VIZ.violet} />
        </ChartCard>
        <ChartCard title="Request funnel" subtitle="From posted request to confirmed provider" table={{ head: ['Stage', 'Requests'], rows: [['Posted', s.posted], ['Got at least one response', s.withBids], ['Confirmed', s.confirmed]] }}>
          <Funnel steps={[{ label: 'Posted', value: s.posted }, { label: 'Got at least one response', value: s.withBids }, { label: 'Confirmed', value: s.confirmed }]} />
        </ChartCard>
        <ChartCard title="Requests by status" table={{ head: ['Status', 'Requests'], rows: s.byStatus.map((r) => [r.label, r.value]) }}><StackBar data={s.byStatus} colors={COLORS.request} /></ChartCard>
        <ChartCard title="Facilities by type" className="lg:col-span-2" table={{ head: ['Type', 'Facilities'], rows: s.byType.map((r) => [r.label, r.value]) }}><HBars data={s.byType} color={VIZ.violet} /></ChartCard>
      </div>
    </>
  );
}

export default function AdminAnalytics() {
  const { db } = useData();
  const a = useMemo(() => computeAnalytics(db), [db]);
  const [tab, setTab] = useState('market');
  const tabs = [['market', 'Marketplace'], ['transport', 'Transport'], ['storage', 'Storage']];
  return (
    <>
      <PageHeader title="Analytics" subtitle="Marketplace, logistics and negotiation figures calculated live from platform data." />
      <div className="flex gap-2 mb-5">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('px-4 py-2 rounded-xl text-sm font-bold cursor-pointer', tab === k ? 'bg-emerald-700 text-white' : 'bg-white border border-emerald-100 text-zinc-600 hover:bg-emerald-50')}>{label}</button>
        ))}
      </div>
      {tab === 'market' && <Marketplace a={a} db={db} />}
      {tab === 'transport' && <Transport a={a} />}
      {tab === 'storage' && <Storage a={a} />}
    </>
  );
}
