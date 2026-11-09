import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowRight, Sprout } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ListingCard, ProfileCard, inputCls, EmptyState, Button } from '../../components/common';
import { CATEGORIES } from '../../lib/format';
import { storageOf } from '../../lib/storage';

// Customer homepage: produce listings from farmers are the first thing on the page (SRS BY-1..BY-3).
export default function Marketplace() {
  const { user } = useAuth();
  const { db } = useData();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [storage, setStorage] = useState('');
  const [sort, setSort] = useState('new');

  const farmers = db.users.filter((u) => u.role === 'Farmer' && u.status !== 'Suspended');
  const locations = useMemo(() => [...new Set(db.listings.map((l) => l.location))].sort(), [db.listings]);

  const results = useMemo(() => {
    const hidden = new Set(db.users.filter((u) => u.status === 'Suspended').map((u) => u.id));
    const out = db.listings.filter((l) => !hidden.has(l.farmerId) && (
      (!q || `${l.name} ${l.description}`.toLowerCase().includes(q.toLowerCase()))
      && (!category || l.category === category)
      && (!location || l.location === location)
      && (!maxPrice || l.price <= Number(maxPrice))
      && (!inStock || l.availability !== 'Out of stock')
      && (!storage || storageOf(l).mode === storage)
    ));
    const by = { new: (a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }), low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, qty: (a, b) => b.quantity - a.quantity }[sort];
    return [...out].sort(by);
  }, [db.listings, db.users, q, category, location, maxPrice, inStock, storage, sort]);

  const clear = () => { setQ(''); setCategory(''); setLocation(''); setMaxPrice(''); setInStock(false); setStorage(''); };

  return (
    <>
      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-green-800 text-white p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-widest mb-2"><Sprout className="w-4 h-4" />Direct from farmers</div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Fresh produce, straight from {farmers.length} farms</h1>
        <p className="text-emerald-100 text-sm mt-1 max-w-xl">Hello {user.name.split(' ')[0]}. Browse listings, open a farmer's profile for all their produce, then order or send an enquiry.</p>
        <div className="relative mt-5 max-w-xl">
          <Search className="w-4.5 h-4.5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wheat, onion, soybean..." className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-zinc-900 focus:outline-hidden focus:ring-4 focus:ring-emerald-300/50" />
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-emerald-100 p-4 mb-6 flex flex-wrap items-center gap-3">
        <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Location"><option value="">All locations</option>{locations.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={storage} onChange={(e) => setStorage(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Storage"><option value="">Any storage</option><option value="own">Farmer's own storage</option><option value="provider">Storage provider</option></select>
        <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price (₹)" className={`${inputCls} !w-36`} aria-label="Maximum price" />
        <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-emerald-700" />In stock only</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} !w-auto sm:ml-auto`} aria-label="Sort">
          <option value="new">Newest</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="qty">Most quantity</option>
        </select>
      </div>

      <div className="flex items-center justify-between mb-3"><h2 className="font-extrabold text-zinc-900">{results.length} listing{results.length === 1 ? '' : 's'}</h2></div>
      {results.length === 0 ? (
        <EmptyState title="No produce matches your search" text="Try a different keyword or clear the filters." action={<Button variant="secondary" onClick={clear}>Clear filters</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {results.map((l) => <ListingCard key={l.id} listing={l} farmer={farmers.find((f) => f.id === l.farmerId)} to={`/customer/listings/${l.id}`} />)}
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-zinc-900">Browse farmers</h2>
          <Link to="/customer/farmers" className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">All farmers <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {farmers.slice(0, 3).map((f) => <ProfileCard key={f.id} farmer={f} to={`/customer/farmers/${f.id}`} listingCount={db.listings.filter((l) => l.farmerId === f.id && l.availability !== 'Out of stock').length} />)}
        </div>
      </section>
    </>
  );
}
