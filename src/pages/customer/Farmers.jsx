import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PageHeader, ProfileCard, inputCls, EmptyState } from '../../components/common';

export default function Farmers() {
  const { db } = useData();
  const [q, setQ] = useState('');
  const farmers = db.users.filter((u) => u.role === 'Farmer' && u.status !== 'Suspended' && `${u.name} ${u.farmName} ${u.location} ${u.mainCrops.join(' ')}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Farmers" subtitle="Open a profile to see everything a farmer is selling." />
      <div className="relative max-w-md mb-6">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, crop or location" className={`${inputCls} pl-9`} />
      </div>
      {farmers.length === 0 ? <EmptyState title="No farmers found" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {farmers.map((f) => <ProfileCard key={f.id} farmer={f} to={`/customer/farmers/${f.id}`} listingCount={db.listings.filter((l) => l.farmerId === f.id && l.availability !== 'Out of stock').length} />)}
        </div>
      )}
    </>
  );
}
