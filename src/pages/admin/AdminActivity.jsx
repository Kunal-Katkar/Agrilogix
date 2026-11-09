import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { PageHeader, Card, DataTable, StatusBadge, inputCls } from '../../components/common';
import { computeAnalytics } from '../../lib/analytics';
import { fmtDateTime } from '../../lib/format';

const TYPE_LABEL = { Order: 'Orders', Shipment: 'Shipments', TransportRequest: 'Transport requests', StorageRequest: 'Storage requests', User: 'Accounts and KYC' };

export default function AdminActivity() {
  const { db } = useData();
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const all = useMemo(() => computeAnalytics(db).activity, [db]);
  const rows = all.filter((e) => (!type || e.entityType === type) && (!q || `${e.title} ${e.note} ${e.status}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="Activity log" subtitle="Every order, shipment, request, booking and account decision, newest first." />
      <Card className="mb-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the log" className={inputCls} aria-label="Search the log" />
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls} aria-label="Type"><option value="">All activity</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <div className="text-sm text-zinc-500 self-center">{rows.length} of {all.length} entries</div>
        </div>
      </Card>
      <Card>
        <DataTable
          rows={rows.slice(0, 150)}
          empty="No activity matches."
          columns={[
            { key: 't', label: 'When', render: (e) => <span className="whitespace-nowrap">{fmtDateTime(e.timestamp)}</span> },
            { key: 'e', label: 'Item', render: (e) => <span className="font-semibold">{e.title}</span> },
            { key: 's', label: 'Status', render: (e) => <StatusBadge status={e.status} /> },
            { key: 'n', label: 'Detail', render: (e) => e.note },
          ]}
        />
      </Card>
    </>
  );
}
