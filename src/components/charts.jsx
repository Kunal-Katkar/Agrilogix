import React, { useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { cx } from './common';

/* Lightweight charts for the admin portal (plain HTML/CSS, no chart library).
   Colours come from the validated categorical palette and stay fixed per entity: the same status or role
   is always the same colour on every chart. Every chart has a legend or direct labels, values in text ink,
   native hover titles, and a "table" view so colour is never the only way to read the data. */

export const VIZ = {
  blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4',
  green: '#008300', violet: '#6250d6', red: '#e34948', gray: '#8a8985',
};

export const COLORS = {
  role: { Farmer: VIZ.blue, Customer: VIZ.orange, Transporter: VIZ.aqua, StorageOwner: VIZ.violet },
  kyc: { Verified: VIZ.green, 'Under review': VIZ.yellow, Rejected: VIZ.red, 'Not submitted': VIZ.gray },
  order: { Placed: VIZ.yellow, Accepted: VIZ.blue, 'In transit': VIZ.violet, Delivered: VIZ.green, Rejected: VIZ.red, Cancelled: VIZ.gray },
  payment: { Paid: VIZ.green, 'In escrow': VIZ.blue, Disputed: VIZ.orange, Pending: VIZ.yellow, Failed: VIZ.red, Refunded: VIZ.gray },
  request: { Open: VIZ.blue, Confirmed: VIZ.green, Completed: VIZ.aqua, Cancelled: VIZ.gray },
  shipment: { Assigned: VIZ.blue, 'Picked up': VIZ.violet, 'In transit': VIZ.orange, Delivered: VIZ.green },
  fleet: { Available: VIZ.green, 'On trip': VIZ.blue, Unavailable: VIZ.gray },
  category: { Grains: VIZ.yellow, Vegetables: VIZ.green, Oilseeds: VIZ.orange, Fibre: VIZ.violet },
};

const fmtNum = (n) => Number(n).toLocaleString('en-IN');

/* Card with a chart/table switch. `table` = { head: [...], rows: [[...]] } */
export function ChartCard({ title, subtitle, table, children, className }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cx('bg-white rounded-2xl border border-emerald-100 shadow-xs p-5', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-extrabold text-zinc-900 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {table && (
          <button type="button" onClick={() => setAsTable(!asTable)} className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-emerald-800 border border-zinc-200 rounded-lg px-2 py-1 cursor-pointer" aria-pressed={asTable}>
            {asTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}{asTable ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      {asTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-zinc-500">{table.head.map((h) => <th key={h} className="py-1.5 pr-4 font-bold">{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, i) => <tr key={i} className="border-t border-zinc-100">{r.map((c, j) => <td key={j} className="py-1.5 pr-4 text-zinc-800">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
    </section>
  );
}

/* One bar split into segments, with a legend that carries the counts. data: [{ label, value }] */
export function StackBar({ data, colors, format = fmtNum }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  if (!total) return <p className="text-sm text-zinc-500">No data yet.</p>;
  return (
    <div>
      <div className="flex h-3.5 gap-0.5" role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(', ')}>
        {data.filter((d) => d.value > 0).map((d) => (
          <div key={d.label} title={`${d.label}: ${format(d.value)}`} className="first:rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${(d.value / total) * 100}%`, background: colors[d.label] || VIZ.gray }} />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: colors[d.label] || VIZ.gray }} />
            <span className="text-zinc-600 truncate">{d.label === 'StorageOwner' ? 'Storage Owner' : d.label}</span>
            <span className="ml-auto font-bold text-zinc-900 tabular-nums">{format(d.value)}</span>
            <span className="text-zinc-400 tabular-nums w-10 text-right">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Horizontal bars with the value written at the end. data: [{ label, value, note? }] */
export function HBars({ data, color = VIZ.blue, colors, format = fmtNum, max }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-zinc-500">No data yet.</p>;
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-zinc-700 font-medium truncate">{d.label === 'StorageOwner' ? 'Storage Owner' : d.label}</span>
            <span className="font-bold text-zinc-900 tabular-nums shrink-0">{format(d.value)}{d.note ? <span className="font-medium text-zinc-400"> {d.note}</span> : null}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-[4px] bg-zinc-100 overflow-hidden" title={`${d.label}: ${format(d.value)}`}>
            <div className="h-full rounded-[4px]" style={{ width: `${Math.max(2, (d.value / top) * 100)}%`, background: colors?.[d.label] || color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Vertical columns for a short time series. data: [{ label, value }] */
export function Columns({ data, color = VIZ.blue, format = fmtNum, height = 150 }) {
  const top = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-sm text-zinc-500">No data yet.</p>;
  return (
    <div className="flex items-end gap-4" style={{ height: height + 44 }}>
      {data.map((d) => (
        <div key={d.label} className="flex-1 min-w-0 max-w-24 flex flex-col items-center justify-end h-full" title={`${d.label}: ${format(d.value)}`}>
          <span className="text-xs font-bold text-zinc-900 tabular-nums mb-1">{format(d.value)}</span>
          <div className="w-full rounded-t-[4px]" style={{ height: Math.max(3, (d.value / top) * height), background: color }} />
          <span className="text-[11px] text-zinc-500 mt-2 truncate max-w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* Funnel of stages: bars shrink as requests drop out. steps: [{ label, value }] */
export function Funnel({ steps, color = VIZ.blue }) {
  const top = Math.max(1, steps[0]?.value || 1);
  return (
    <ul className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="flex justify-between text-xs"><span className="text-zinc-700 font-medium">{s.label}</span><span className="font-bold text-zinc-900 tabular-nums">{s.value}{i > 0 && steps[0].value ? <span className="font-medium text-zinc-400"> · {Math.round((s.value / top) * 100)}%</span> : null}</span></div>
          <div className="mt-1 h-3 rounded-[4px] bg-zinc-100 overflow-hidden" title={`${s.label}: ${s.value}`}><div className="h-full rounded-[4px]" style={{ width: `${Math.max(2, (s.value / top) * 100)}%`, background: color }} /></div>
        </li>
      ))}
    </ul>
  );
}
