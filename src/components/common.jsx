import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, X, Inbox, Home, Warehouse } from 'lucide-react';
import { inr, produceStyle } from '../lib/format';
import { useData } from '../context/DataContext';
import { storageInfo } from '../lib/storage';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ---------- Status badges (SRS UI-7: green positive, amber pending, red failed, blue active, grey inactive) ---------- */
const TONES = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  blue: 'bg-sky-100 text-sky-800 border-sky-200',
  gray: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};
const STATUS_TONE = {
  Available: 'green', Active: 'green', Verified: 'green', Confirmed: 'green', Selected: 'green', Paid: 'green', Accepted: 'green', Delivered: 'green', Completed: 'green', Replied: 'green',
  Limited: 'amber', 'Under review': 'amber', 'Not submitted': 'red', Pending: 'amber', Placed: 'amber', Open: 'amber',
  'In transit': 'blue', 'Picked up': 'blue', Assigned: 'blue', 'On trip': 'blue', 'In escrow': 'blue', Processing: 'blue',
  Rejected: 'red', Suspended: 'red', Failed: 'red', Full: 'red', 'Out of stock': 'red', Disputed: 'red',
  Resolved: 'green',
  Cancelled: 'gray', Refunded: 'gray', Unavailable: 'gray', Withdrawn: 'gray', Outdated: 'amber',
};

export function StatusBadge({ status }) {
  return (
    <span className={cx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap', TONES[STATUS_TONE[status] || 'gray'])}>
      {status}
    </span>
  );
}

/* ---------- Buttons and form controls ---------- */
const BTN = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shadow-emerald-800/20',
  secondary: 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100',
};

export function Button({ variant = 'primary', size = 'md', className, as: As = 'button', ...props }) {
  const extra = As === 'button' ? { type: props.type || 'button' } : {};
  return (
    <As
      {...extra}
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2.5',
        BTN[variant], className,
      )}
    />
  );
}

export const inputCls = 'w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

export function Field({ label, hint, className, children }) {
  return (
    <label className={cx('block', className)}>
      <span className="block text-xs font-bold text-zinc-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-400 mt-1">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/40 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('w-full bg-white rounded-2xl shadow-2xl my-8', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="font-extrabold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Page structure ---------- */
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STAT_TONE = { green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-sky-100 text-sky-700', red: 'bg-red-100 text-red-600' };

export function StatCard({ icon: Icon, label, value, hint, tone = 'green' }) {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <div className={cx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', STAT_TONE[tone])}><Icon className="w-5 h-5" /></div>
        <div className="min-w-0">
          <div className="text-2xl font-black text-zinc-900 leading-tight">{value}</div>
          <div className="text-xs font-semibold text-zinc-500">{label}</div>
        </div>
      </div>
      {hint && <div className="text-[11px] text-zinc-400 mt-3">{hint}</div>}
    </div>
  );
}

export function Card({ title, action, children, className }) {
  return (
    <section className={cx('bg-white rounded-2xl border border-emerald-100 shadow-xs', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-extrabold text-zinc-900 text-sm">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, action, icon: Icon = Inbox }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Icon className="w-6 h-6" /></div>
      <div className="font-bold text-zinc-800">{title}</div>
      {text && <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* Generic responsive table: columns = [{ key, label, render?(row) }] */
export function DataTable({ columns, rows, empty = 'Nothing to show yet.' }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto -mx-5 -my-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 bg-zinc-50">
            {columns.map((c) => <th key={c.key} className="px-5 py-3 font-bold whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || row.trackingId || i} className="border-t border-zinc-100 hover:bg-emerald-50/30">
              {columns.map((c) => <td key={c.key} className="px-5 py-3 align-top">{c.render ? c.render(row) : row[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Shared visual cards ---------- */
export function Avatar({ name, size = 'md' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className={cx('rounded-full bg-gradient-to-br from-emerald-500 to-green-700 text-white font-black flex items-center justify-center shrink-0', size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-11 h-11 text-sm')}>
      {initials}
    </div>
  );
}

export function ProduceImage({ listing, className }) {
  if (listing.image) {
    return <img src={listing.image} alt={listing.name} className={cx('object-cover', className)} />;
  }
  const [emoji, from, to] = produceStyle(listing.name);
  return (
    <div className={cx('flex items-center justify-center', className)} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} role="img" aria-label={listing.name}>
      <span className="text-5xl drop-shadow-sm">{emoji}</span>
    </div>
  );
}

// Shows buyers (and the farmer) where the produce is kept: own storage or a provider's facility.
export function StorageTag({ listing }) {
  const { db } = useData();
  const info = storageInfo(db, listing);
  const provider = info.mode === 'provider';
  return (
    <div className={cx('inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 border max-w-full', provider ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-amber-50 text-amber-800 border-amber-200')}>
      {provider ? <Warehouse className="w-3.5 h-3.5 shrink-0" /> : <Home className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">{provider ? (info.facility ? info.facility.name : 'Provider storage') : 'Own storage'}</span>
    </div>
  );
}

export function ListingCard({ listing, farmer, to, actions }) {
  const body = (
    <>
      <ProduceImage listing={listing} className="h-36 w-full rounded-t-2xl" />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-zinc-900 leading-snug">{listing.name}</h3>
          <StatusBadge status={listing.availability} />
        </div>
        <div className="text-xs text-zinc-500 mt-1">{listing.category}</div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-black text-emerald-800">{inr(listing.price)}</span>
          <span className="text-xs text-zinc-500">/ {listing.unit}</span>
        </div>
        <div className="text-xs text-zinc-600 mt-1">{listing.quantity} {listing.unit} available</div>
        <div className="mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-500 space-y-1">
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{listing.location}</div>
          <StorageTag listing={listing} />
          {farmer && <div className="font-semibold text-zinc-700">by {farmer.name}</div>}
        </div>
      </div>
    </>
  );
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {to ? <Link to={to} className="flex-1 flex flex-col">{body}</Link> : <div className="flex-1 flex flex-col">{body}</div>}
      {actions && <div className="px-4 pb-4 flex gap-2">{actions}</div>}
    </div>
  );
}

export function ProfileCard({ farmer, listingCount, to }) {
  return (
    <Link to={to} className="bg-white rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={farmer.name} />
        <div className="min-w-0">
          <div className="font-extrabold text-zinc-900 truncate">{farmer.name}</div>
          <div className="text-xs text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{farmer.location}</div>
        </div>
      </div>
      <div className="text-sm text-zinc-600 font-semibold">{farmer.farmName}</div>
      <div className="flex flex-wrap gap-1.5">
        {farmer.mainCrops.map((c) => <span key={c} className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-2 py-0.5">{c}</span>)}
      </div>
      <div className="text-xs text-zinc-500">{farmer.farmSize} · {listingCount} active listing{listingCount === 1 ? '' : 's'}</div>
    </Link>
  );
}

export function Notice({ tone = 'amber', children }) {
  const cls = tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-sky-50 border-sky-200 text-sky-900';
  return <div className={cx('rounded-xl border px-4 py-3 text-xs font-medium', cls)}>{children}</div>;
}

/* Small helper for a labelled value pair */
export function Meta({ label, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="text-sm text-zinc-800 font-medium">{children}</div>
    </div>
  );
}
