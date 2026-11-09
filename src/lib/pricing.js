// Recommended prices shown to farmers when they post a transport or storage request.
// Pure functions over the db, so they can be checked from Node like the rest of the business logic.
//
// These are estimates built from what providers have listed on the platform. They help a farmer who does not
// know a fair price; the farmer can still enter any price.

import { cityOf } from './format.js';

// Approximate city coordinates [lat, lng] for the cities used in the prototype and some common mandi towns.
const CITY_COORDS = {
  nashik: [19.99, 73.79], sinnar: [19.85, 74.0], mumbai: [19.08, 72.88], pune: [18.52, 73.86], satara: [17.69, 74.0],
  kolhapur: [16.7, 74.24], nagpur: [21.15, 79.09], ahmedabad: [23.02, 72.57], surat: [21.17, 72.83],
  indore: [22.72, 75.86], bhopal: [23.26, 77.41], ludhiana: [30.9, 75.86], khanna: [30.7, 76.22],
  chandigarh: [30.73, 76.78], amritsar: [31.63, 74.87], delhi: [28.61, 77.21], agra: [27.18, 78.01],
  jaipur: [26.91, 75.79], lucknow: [26.85, 80.95], patna: [25.59, 85.14], kolkata: [22.57, 88.36],
  hyderabad: [17.39, 78.49], guntur: [16.31, 80.44], vijayawada: [16.51, 80.65], bengaluru: [12.97, 77.59],
  mysuru: [12.3, 76.64], mangaluru: [12.91, 74.86], udupi: [13.34, 74.74], hubballi: [15.36, 75.12],
  belagavi: [15.85, 74.5], chennai: [13.08, 80.27], coimbatore: [11.02, 76.96], kochi: [9.93, 76.27],
  'nitk surathkal': [12.99, 74.8],
};

const ROAD_FACTOR = 1.3; // road distance is longer than the straight line
const MIN_TRIP_KM = 40; // short and same-city trips are priced as at least this distance
const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Approximate road distance in km between two places, or null if either city is not in the table.
export const roadDistanceKm = (placeA = '', placeB = '') => {
  const a = CITY_COORDS[cityOf(placeA).toLowerCase()];
  const b = CITY_COORDS[cityOf(placeB).toLowerCase()];
  if (!a || !b) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * ROAD_FACTOR);
};

// Transport: distance x the per-km rates of vehicles that would fit this load.
// Returns { price, low, high, km, rate, vehicles, basis } or { reason } when no estimate can be made.
export function recommendTransportPrice(db, { pickup, destination, loadTonnes, vehicleType }) {
  const km = roadDistanceKm(pickup, destination);
  if (km === null) return { reason: 'The distance for this route is not known yet, so no price is suggested.' };
  const fits = db.vehicles.filter((v) => v.availability !== 'Unavailable' && v.loadCapacity >= loadTonnes
    && (!vehicleType || v.vehicleType === vehicleType));
  if (!fits.length) return { reason: 'No listed vehicle can carry this load, so no price is suggested.' };
  // Use the vehicles that fit most closely: a 0.5 t load is priced like a mini truck, not a 16 t truck.
  const smallest = Math.min(...fits.map((v) => v.loadCapacity));
  const close = fits.filter((v) => v.loadCapacity <= smallest * 2);
  const rates = close.map((v) => v.pricePerKm);
  const rate = median(rates);
  const billedKm = Math.max(km, MIN_TRIP_KM);
  const price = roundTo(billedKm * rate, 50);
  let low = roundTo(billedKm * Math.min(...rates), 50);
  let high = roundTo(billedKm * Math.max(...rates), 50);
  if (low === high) { low = roundTo(price * 0.9, 50); high = roundTo(price * 1.1, 50); }
  return {
    price, low, high, km, billedKm, rate: Math.round(rate), vehicles: close.length,
    basis: `${km < MIN_TRIP_KM ? `a local trip, billed at the ${MIN_TRIP_KM} km minimum` : `about ${km} km by road`} at ${Math.round(rate)} per km, the middle rate of ${close.length} listed ${close.length === 1 ? 'vehicle' : 'vehicles'} that fit the load`,
  };
}

// Storage: the middle price per tonne per day that matching facilities list. Prefers the same city, then the
// same state, then any facility of the type.
// Returns { price, low, high, count, scope, basis } or { reason }.
export function recommendStoragePrice(db, { city, storageType }) {
  const open = db.storages.filter((s) => s.availability !== 'Unavailable' && (!storageType || s.type === storageType));
  const c = (city || '').trim().toLowerCase();
  const inCity = c ? open.filter((s) => cityOf(s.location).toLowerCase() === c) : [];
  const known = [...db.storages, ...db.users, ...db.listings].find((x) => cityOf(x.location || '').toLowerCase() === c && (x.location || '').includes(','));
  const state = c && known ? known.location.split(',')[1].trim().toLowerCase() : '';
  const inState = state ? open.filter((s) => (s.location.split(',')[1] || '').trim().toLowerCase() === state) : [];
  let pool = inCity; let scope = c ? `in ${city.trim()}` : '';
  if (!pool.length) { pool = inState; scope = `in the same state as ${city.trim()}`; }
  if (!pool.length) { pool = open; scope = 'across all listed cities'; }
  if (!pool.length) return { reason: 'No facility of this type is listed yet, so no price is suggested.' };
  const prices = pool.map((s) => s.pricePerTonneDay);
  const price = Math.round(median(prices));
  return {
    price, low: Math.min(...prices), high: Math.max(...prices), count: pool.length, scope,
    basis: `the middle price of ${pool.length} listed ${storageType ? storageType.toLowerCase() : 'storage'} ${pool.length === 1 ? 'facility' : 'facilities'} ${scope}`,
  };
}
