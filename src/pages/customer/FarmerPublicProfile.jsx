import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Ruler, Wheat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Avatar, ListingCard, EmptyState, Card, StatusBadge } from '../../components/common';

// Public farmer page. Listings are read from the shared store, so edits by the farmer show here at once (SRS BY-3/4, FM-7).
// Reused by the farmer's "preview" route, where listing cards are not links.
export default function FarmerPublicProfile() {
  const { farmerId } = useParams();
  const { user } = useAuth();
  const { db } = useData();
  const farmer = db.users.find((u) => u.id === farmerId && u.role === 'Farmer' && u.status !== 'Suspended');
  const isCustomer = user.role === 'Customer';
  const back = isCustomer ? '/customer/farmers' : '/farmer/profile';

  if (!farmer) return <EmptyState title="Farmer not found" action={<Link to={back} className="text-emerald-700 font-bold text-sm">Go back</Link>} />;
  const listings = db.listings.filter((l) => l.farmerId === farmer.id);

  return (
    <>
      <Link to={back} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-4"><ArrowLeft className="w-3.5 h-3.5" />Back</Link>
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-5">
          <Avatar name={farmer.name} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-black text-zinc-900 flex flex-wrap items-center gap-2">{farmer.name}{farmer.verified && <StatusBadge status="Verified" />}</h1>
            <div className="text-emerald-800 font-bold text-sm">{farmer.farmName}</div>
            <p className="text-sm text-zinc-600 mt-2 max-w-2xl">{farmer.bio}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-zinc-700">
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-600" />{farmer.location}</span>
              <span className="inline-flex items-center gap-1.5"><Ruler className="w-4 h-4 text-emerald-600" />{farmer.farmSize}</span>
              <span className="inline-flex items-center gap-1.5"><Wheat className="w-4 h-4 text-emerald-600" />{farmer.mainCrops.join(', ') || 'Not listed'}</span>
              <span className="inline-flex items-center gap-1.5"><Phone className="w-4 h-4 text-emerald-600" />{farmer.phone}</span>
            </div>
          </div>
        </div>
      </Card>
      <h2 className="font-extrabold text-zinc-900 mb-3">Listings by {farmer.name.split(' ')[0]} ({listings.length})</h2>
      {listings.length === 0 ? <EmptyState title="No listings yet" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((l) => <ListingCard key={l.id} listing={l} to={isCustomer ? `/customer/listings/${l.id}` : undefined} />)}
        </div>
      )}
    </>
  );
}
