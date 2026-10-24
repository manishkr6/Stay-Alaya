/**
 * Utility helpers to sanitize, normalize, and format real PG listing data
 * from Supabase, preventing duplicate text, repetitive titles, and awkward city labels.
 */

/**
 * Deduplicates repetitive phrases in listing titles (e.g., repeated phrases accidentally submitted by hosts)
 */
export function cleanPGTitle(rawTitle) {
  if (!rawTitle) return 'Paying Guest Accommodation';
  let str = String(rawTitle).trim();

  // 1. Detect if entire string is composed of repeated identical blocks
  for (let len = 15; len <= Math.floor(str.length / 2); len++) {
    const chunk = str.slice(0, len);
    const rest = str.slice(len).trim();
    if (rest.startsWith(chunk)) {
      str = chunk.trim();
      break;
    }
  }

  // 2. Remove repetitive suffix where host typed name at start and end
  // e.g. "Sandeep Paying Guest Vishal Gaon Tadong, Gangtok Sandeep Paying Guest"
  const words = str.split(/\s+/);
  if (words.length > 5) {
    const first3 = words.slice(0, 3).join(' ').toLowerCase();
    const last3 = words.slice(-3).join(' ').toLowerCase();
    if (first3 === last3) {
      str = words.slice(0, -3).join(' ');
    }
  }

  // 3. Separate excessive landmark directions accidentally typed into the PG name
  // e.g. "Radiant Paying Guest Opposite to Denzong Hyundai..." -> "Radiant Paying Guest"
  const oppMatch = str.match(/^(.*?)\s+(?:opposite to|opposite|opp\.|opp\s+to)\s+/i);
  if (oppMatch && oppMatch[1].trim().length >= 8) {
    str = oppMatch[1].trim();
  }

  return str;
}

/**
 * Extracts and formats clean neighborhood & locality information without duplicate "Gangtok, Gangtok" labels.
 */
export function getFormattedLocation(pg) {
  if (!pg) return { neighborhood: 'Gangtok', city: 'Sikkim', display: 'Gangtok, Sikkim' };

  const addr = (pg.address || pg.location?.address || '').toLowerCase();
  const title = (pg.title || '').toLowerCase();
  const desc = (pg.description || '').toLowerCase();
  const locality = pg.locality || pg.location?.area || '';
  const city = pg.city || pg.location?.city || 'Gangtok';

  let neighborhood = '';

  // 1. Check primary landmark / neighborhood (Paljor Stadium is the real location in database)
  if (addr.includes('paljor stadium') || title.includes('paljor stadium') || desc.includes('paljor stadium')) {
    neighborhood = 'Paljor Stadium';
  } else if (addr.includes('development area') || title.includes('development area') || desc.includes('development area')) {
    neighborhood = 'Paljor Stadium';
  } else if (addr.includes('vishal gaon') || title.includes('vishal gaon')) {
    neighborhood = 'Vishal Gaon';
  } else if (title.includes('tadong') || addr.includes('tadong') || locality.toLowerCase() === 'tadong') {
    neighborhood = 'Tadong';
  } else if (title.includes('majitar') || addr.includes('majitar') || locality.toLowerCase() === 'majitar') {
    neighborhood = 'Majitar';
  } else if (title.includes('5th mile') || addr.includes('5th mile')) {
    neighborhood = '5th Mile';
  } else if (title.includes('deorali') || addr.includes('deorali')) {
    neighborhood = 'Deorali';
  } else if (locality && locality.toLowerCase() !== city.toLowerCase()) {
    neighborhood = locality;
  }

  if (neighborhood && city && neighborhood.toLowerCase() !== city.toLowerCase()) {
    return {
      neighborhood,
      city,
      display: `${neighborhood}, ${city}`,
    };
  }

  if (locality && locality.toLowerCase() !== 'gangtok') {
    return {
      neighborhood: locality,
      city: 'Gangtok',
      display: `${locality}, Gangtok`,
    };
  }

  return {
    neighborhood: neighborhood || locality || 'Gangtok',
    city: 'Sikkim',
    display: `${neighborhood || locality || 'Gangtok'}, Sikkim`,
  };
}

/**
 * Map amenities to friendly icon representations and labels
 */
export const AMENITY_META = {
  WiFi: { label: 'High-Speed WiFi', short: 'WiFi', icon: 'Wifi', color: 'text-blue-500' },
  Food: { label: 'Hygienic Mess / Food', short: 'Food Included', icon: 'Utensils', color: 'text-amber-500' },
  AC: { label: 'Air Conditioner', short: 'AC', icon: 'Wind', color: 'text-cyan-500' },
  Water: { label: '24/7 Water & Geyser', short: 'Hot Water', icon: 'Droplets', color: 'text-sky-500' },
  CCTV: { label: '24/7 CCTV Security', short: 'CCTV', icon: 'Video', color: 'text-emerald-500' },
  Laundry: { label: 'Laundry Service', short: 'Laundry', icon: 'Shirt', color: 'text-purple-500' },
  Parking: { label: 'Two/Four Wheeler Parking', short: 'Parking', icon: 'Car', color: 'text-slate-600' },
  Gym: { label: 'Fitness Center / Gym', short: 'Gym', icon: 'Dumbbell', color: 'text-rose-500' },
};
