export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

export const today = () => new Date().toISOString().slice(0, 10);

export const CATEGORIES = ['Grains', 'Vegetables', 'Oilseeds', 'Fibre'];
export const UNITS = ['quintal', 'kg', 'tonne'];
export const STORAGE_TYPES = ['Cold storage', 'Warehouse', 'Silo', 'Dry store'];
export const VEHICLE_TYPES = ['Mini Truck', 'Refrigerated Truck', 'Heavy Covered Truck', 'Open Flatbed'];
export const PAYMENT_METHODS = ['UPI', 'Card', 'Net banking', 'Cash on delivery'];

// Produce visuals: used when a listing has no uploaded image.
const PRODUCE_STYLE = {
  wheat: ['🌾', '#F3E3A6', '#D9A93B'], rice: ['🍚', '#F4F1E4', '#CFC7A3'], basmati: ['🍚', '#F4F1E4', '#CFC7A3'],
  maize: ['🌽', '#FBE9A0', '#E3B52F'], onion: ['🧅', '#F2D4DC', '#C0728A'], tomato: ['🍅', '#FAD0C8', '#E0594A'],
  potato: ['🥔', '#EBD9BC', '#B98B52'], soybean: ['🫘', '#E6E4B8', '#A59E45'], cotton: ['☁️', '#E8EEF4', '#A6BBD0'],
};

export const produceStyle = (name = '') => {
  const key = Object.keys(PRODUCE_STYLE).find((k) => name.toLowerCase().includes(k));
  return PRODUCE_STYLE[key] || ['🌱', '#DDEFD8', '#7DB56F'];
};

// Weight conversion used to compare produce quantities with vehicle load capacity (tonnes).
export const toTonnes = (qty, unit) => Number(qty) * ({ quintal: 0.1, kg: 0.001, tonne: 1 }[unit] ?? 0.1);

export const cityOf = (location = '') => location.split(',')[0].trim();
