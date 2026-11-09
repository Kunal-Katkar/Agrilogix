import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, MessageSquare, ShoppingCart, Home, Warehouse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ProduceImage, StatusBadge, Button, Field, inputCls, Card, Avatar, EmptyState, Meta } from '../../components/common';
import { inr } from '../../lib/format';
import { storageInfo } from '../../lib/storage';

export default function ListingDetail() {
  const { listingId } = useParams();
  const { user } = useAuth();
  const { db, run } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) return <EmptyState title="Listing not found" text="It may have been removed by the farmer." action={<Link to="/customer" className="text-emerald-700 font-bold text-sm">Back to marketplace</Link>} />;
  const farmer = db.users.find((u) => u.id === listing.farmerId);
  const orderable = listing.availability !== 'Out of stock' && listing.quantity > 0;
  const total = Number(quantity) * listing.price;
  const storage = storageInfo(db, listing);
  const myEnquiries = db.enquiries.filter((e) => e.listingId === listing.id && e.customerId === user.id);

  const order = (e) => {
    e.preventDefault();
    const res = run('placeOrder', { customerId: user.id, listingId: listing.id, quantity });
    if (!res.ok) return showToast(res.error);
    showToast(`Order ${res.id} placed. The farmer will confirm it shortly.`, 'success');
    navigate('/customer/orders');
  };

  const enquire = (e) => {
    e.preventDefault();
    const res = run('sendEnquiry', { customerId: user.id, listingId: listing.id, message });
    if (!res.ok) return showToast(res.error);
    showToast('Enquiry sent to the farmer.', 'success');
    setMessage('');
  };

  return (
    <>
      <Link to={`/customer/farmers/${farmer.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-4"><ArrowLeft className="w-3.5 h-3.5" />More from {farmer.name}</Link>
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <ProduceImage listing={listing} className="w-full h-64 sm:h-80 rounded-3xl" />
          <Card title="About this produce">
            <p className="text-sm text-zinc-700 leading-relaxed">{listing.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <Meta label="Category">{listing.category}</Meta>
              <Meta label="Available">{listing.quantity} {listing.unit}</Meta>
              <Meta label="Location"><span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-600" />{listing.location}</span></Meta>
              <Meta label="Listing ID">{listing.id}</Meta>
            </div>
          </Card>
          <Card title="Storage">
            {storage.mode === 'own' ? (
              <div className="flex gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Home className="w-5 h-5" /></span>
                <div>
                  <div className="font-bold text-zinc-900">Stored at the farmer's own storage</div>
                  <div className="text-sm text-zinc-600">{storage.note || 'Kept on the farm until dispatch.'}</div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0"><Warehouse className="w-5 h-5" /></span>
                <div className="min-w-0">
                  <div className="font-bold text-zinc-900">Stored with a storage provider</div>
                  {storage.facility ? (
                    <>
                      <div className="text-sm text-zinc-700">{storage.facility.name} · {storage.facility.type}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{storage.facility.location}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">{storage.facility.facilities.map((x) => <span key={x} className="text-[11px] font-semibold bg-sky-50 text-sky-800 rounded-full px-2 py-0.5">{x}</span>)}</div>
                    </>
                  ) : <div className="text-sm text-zinc-500">Facility details unavailable.</div>}
                  <div className="mt-2"><StatusBadge status={storage.booking === 'Booking confirmed' ? 'Accepted' : 'Pending'} /> <span className="text-xs text-zinc-500 ml-1">{storage.booking}</span></div>
                </div>
              </div>
            )}
          </Card>
          <Link to={`/customer/farmers/${farmer.id}`} className="flex items-center gap-4 bg-white rounded-2xl border border-emerald-100 p-4 hover:shadow-md transition-shadow">
            <Avatar name={farmer.name} />
            <div><div className="font-extrabold text-zinc-900">{farmer.name}</div><div className="text-xs text-zinc-500">{farmer.farmName} · {farmer.location}</div></div>
            <span className="ml-auto text-xs font-bold text-emerald-700">View profile</span>
          </Link>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-2"><h1 className="text-xl font-black text-zinc-900">{listing.name}</h1><StatusBadge status={listing.availability} /></div>
            <div className="mt-2"><span className="text-3xl font-black text-emerald-800">{inr(listing.price)}</span><span className="text-sm text-zinc-500"> / {listing.unit}</span></div>
            <form onSubmit={order} className="mt-5 space-y-3">
              <Field label={`Quantity (${listing.unit})`} hint={`Up to ${listing.quantity} ${listing.unit} available`}>
                <input type="number" min="1" max={listing.quantity} required disabled={!orderable} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
              </Field>
              <div className="flex justify-between text-sm"><span className="text-zinc-500">Order total</span><span className="font-black text-zinc-900">{inr(total || 0)}</span></div>
              <Button type="submit" disabled={!orderable} className="w-full"><ShoppingCart className="w-4 h-4" />{orderable ? 'Place order' : 'Out of stock'}</Button>
              <p className="text-[11px] text-zinc-400">The farmer must accept your order. You then pay online; the money is held in escrow until you confirm delivery.</p>
            </form>
          </Card>

          <Card title="Ask the farmer">
            <form onSubmit={enquire} className="space-y-3">
              <textarea required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about quality, bulk price or delivery..." className={inputCls} />
              <Button type="submit" variant="secondary" className="w-full"><MessageSquare className="w-4 h-4" />Send enquiry</Button>
            </form>
            {myEnquiries.length > 0 && (
              <div className="mt-4 space-y-2">
                {myEnquiries.map((e) => (
                  <div key={e.id} className="text-xs bg-zinc-50 rounded-xl p-3">
                    <div className="text-zinc-700">{e.message}</div>
                    {e.reply ? <div className="mt-1.5 text-emerald-800 font-semibold">Farmer: {e.reply}</div> : <div className="mt-1.5 text-amber-700">Awaiting reply</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
