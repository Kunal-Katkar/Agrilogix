import React from 'react';
import { Upload, FileCheck2 } from 'lucide-react';
import { cx } from './common';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png';

// File picker for KYC documents. Prototype: only the file name and size are kept; the file itself is not stored.
export default function KycUpload({ label, hint, value, onChange, onError }) {
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return onError?.('File must be smaller than 5 MB.');
    onError?.('');
    onChange({ name: file.name, size: file.size, uploadedAt: new Date().toISOString() });
  };

  return (
    <div>
      <span className="block text-xs font-semibold text-zinc-700 mb-1">{label}</span>
      <label className={cx(
        'flex items-center justify-center gap-2 border-2 border-dashed rounded-xl p-3.5 text-center transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500',
        value ? 'border-emerald-300 bg-emerald-50/60' : 'border-zinc-200 bg-zinc-50/60 hover:bg-emerald-50/40',
      )}
      >
        {value ? <FileCheck2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <Upload className="w-5 h-5 text-emerald-700 shrink-0" />}
        <span className="text-xs text-zinc-600 truncate">{value ? `${value.name} (click to replace)` : hint}</span>
        <input type="file" accept={ACCEPT} onChange={pick} className="sr-only" />
      </label>
    </div>
  );
}
