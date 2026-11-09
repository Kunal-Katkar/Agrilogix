import React from 'react';
import { inr } from '../lib/format';
import { cx } from './common';

// Whether a provider accepted the farmer's price or proposed their own.
export function KindBadge({ kind, perspective = 'farmer' }) {
  const accept = kind === 'accept';
  const label = accept ? (perspective === 'farmer' ? 'Accepts your price' : "Accepted farmer's price") : 'Counter offer';
  return (
    <span className={cx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap', accept ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-violet-50 text-violet-800 border-violet-200')}>
      {label}
    </span>
  );
}

// Difference between a bid and the farmer's offer, e.g. "+₹1,500 above your offer".
export function PriceDelta({ price, offered, unit = '' }) {
  const diff = Math.round((price - offered) * 100) / 100;
  if (diff === 0) return <span className="text-xs font-semibold text-emerald-700">Same as your offer</span>;
  const higher = diff > 0;
  return (
    <span className={cx('text-xs font-semibold', higher ? 'text-amber-700' : 'text-emerald-700')}>
      {higher ? '+' : '-'}{inr(Math.abs(diff))}{unit} {higher ? 'above' : 'below'} your offer
    </span>
  );
}

// Small labelled facts row used inside request and bid cards.
export function Facts({ items }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
      {items.filter(Boolean).map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</dt>
          <dd className="text-sm text-zinc-800 font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
