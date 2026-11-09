// Where a listing's produce is kept: the farmer's own storage, or a storage provider's facility.
// listing.storage = { mode: 'own', note } | { mode: 'provider', storageId }. Older records without it count as own storage.
export const storageOf = (listing) => listing.storage || { mode: 'own', note: '' };

export function storageInfo(db, listing) {
  const st = storageOf(listing);
  if (st.mode !== 'provider') return { mode: 'own', note: st.note || '', facility: null, booking: null };
  const facility = db.storages.find((s) => s.id === st.storageId) || null;
  const reqs = db.storageRequests.filter((r) => r.farmerId === listing.farmerId && (!r.listingId || r.listingId === listing.id));
  let booking = 'No booking on record';
  if (reqs.some((r) => r.status === 'Confirmed' && r.storageId === st.storageId)) booking = 'Booking confirmed';
  else if (reqs.some((r) => r.status === 'Open')) booking = 'Booking pending';
  return { mode: 'provider', note: '', facility, booking };
}
