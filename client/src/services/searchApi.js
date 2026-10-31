import { supabase } from '../lib/supabaseClient';

/**
 * Configuration for FastAPI backend endpoint.
 * Configurable via Vite env (VITE_API_URL or VITE_FASTAPI_URL).
 */
const FASTAPI_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.VITE_API_URL || import.meta.env?.VITE_FASTAPI_URL)) ||
  'http://localhost:8000';

/**
 * Dynamic Location Service
 * Fetches distinct active locations (cities, areas, localities) directly from FastAPI backend
 * with graceful fallback to querying Supabase pg_listings directly if FastAPI is unreachable.
 */
export async function fetchActiveLocations(signal = null) {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/locations/active`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.locations || []);
      if (Array.isArray(list) && list.length > 0) {
        // Ensure default 'All Sikkim' option exists at top
        const hasAll = list.some((item) => item.id === '');
        if (!hasAll) {
          return [{ id: '', label: 'All Sikkim' }, ...list];
        }
        return list;
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn('FastAPI locations endpoint unavailable, falling back to direct Supabase query:', err?.message || err);
  }

  // Graceful Supabase fallback: query unique approved, available, non-deleted listings
  try {
    const { data, error } = await supabase
      .from('pg_listings')
      .select('locality, city, area')
      .eq('status', 'approved')
      .eq('is_available', true)
      .eq('is_deleted', false);

    if (error) throw error;

    const localityMap = new Map();

    (data || []).forEach((item) => {
      const loc = (item.locality || item.area || item.city || '').trim();
      if (loc) {
        const key = loc.toLowerCase();
        if (!localityMap.has(key)) {
          localityMap.set(key, { id: loc, label: loc, count: 1 });
        } else {
          localityMap.get(key).count += 1;
        }
      }
    });

    const sortedLocs = Array.from(localityMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    return [
      { id: '', label: 'All Sikkim' },
      ...sortedLocs,
    ];
  } catch (err) {
    console.error('Failed to load active locations from Supabase:', err);
    return [{ id: '', label: 'All Sikkim' }];
  }
}

/**
 * Normalizes user input values.
 */
function cleanKey(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase().replace(/[-_\s/.]+/g, '');
}

/**
 * Canonical gender normalization.
 */
export function normalizeGender(val) {
  if (!val) return null;
  const k = cleanKey(val);
  if (['coed', 'co-ed', 'coad', 'coede', 'coade', 'unisex', 'mixed', 'both'].includes(k)) return 'Co-ed';
  if (['girls', 'girl', 'grils', 'girsl', 'female', 'females', 'women', 'ladies'].includes(k)) return 'Girls';
  if (['boys', 'boy', 'byos', 'male', 'males', 'men', 'gents'].includes(k)) return 'Boys';
  return null;
}

export function normalizeRoomType(val) {
  if (!val) return null;
  const k = cleanKey(val);
  if (['single', 'singel', 'singleroom', '1room', '1sharing', 'private'].includes(k)) return 'Single';
  if (['double', 'doble', 'doubleroom', '2room', '2sharing', 'twin'].includes(k)) return 'Double';
  if (['triple', 'trippel', 'tripleroom', '3room', '3sharing'].includes(k)) return 'Triple';
  return null;
}

const STOPWORDS = new Set([
  'in', 'at', 'near', 'pg', 'pgs', 'hostel', 'room', 'rooms',
  'for', 'with', 'and', 'ke', 'me', 'pass', 'stay', 'paying', 'guest'
]);

const VERIFIED_TOKENS = new Set([
  'verified', 'verify', 'verfied', 'verification', '14point', '14-point', 'inspected'
]);

const AMENITY_TOKEN_MAP = {
  wifi: 'WiFi',
  internet: 'WiFi',
  wify: 'WiFi',
  food: 'Food',
  mess: 'Food',
  meals: 'Food',
  khana: 'Food',
  ac: 'AC',
  aircon: 'AC',
  cooler: 'AC',
  water: 'Water',
  geyser: 'Water',
  hotwater: 'Water',
  pani: 'Water',
  cctv: 'CCTV',
  camera: 'CCTV',
  security: 'CCTV',
  laundry: 'Laundry',
  washing: 'Laundry',
  dhobi: 'Laundry',
  parking: 'Parking',
  bike: 'Parking',
  car: 'Parking',
  gym: 'Gym',
  fitness: 'Gym',
};

/**
 * Normalizes and extracts categorical filters (Gender, Room Type, Verified, Amenities)
 * and isolates location/general search text from user queries.
 */
export function parseNormalSearchQuery(rawQuery) {
  if (!rawQuery || !rawQuery.trim()) {
    return {
      location: '',
      gender: null,
      roomType: null,
      isVerified: false,
      amenities: [],
      remainingQuery: '',
    };
  }

  const tokens = rawQuery.trim().split(/\s+/);
  let detectedGender = null;
  let detectedRoom = null;
  let detectedVerified = false;
  const detectedAmenities = new Set();
  const remainingTokens = [];

  for (const token of tokens) {
    const cleanT = token.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanT) continue;

    // 1. Check Verified keywords
    if (VERIFIED_TOKENS.has(cleanT) || cleanT.includes('14point') || cleanT.includes('verified')) {
      detectedVerified = true;
      continue;
    }

    // 2. Check Gender
    if (!detectedGender) {
      const g = normalizeGender(cleanT);
      if (g) {
        detectedGender = g;
        continue;
      }
    }

    // 3. Check Room Type
    if (!detectedRoom) {
      const r = normalizeRoomType(cleanT);
      if (r) {
        detectedRoom = r;
        continue;
      }
    }

    // 4. Check Amenities
    if (AMENITY_TOKEN_MAP[cleanT]) {
      detectedAmenities.add(AMENITY_TOKEN_MAP[cleanT]);
      continue;
    }

    // 5. Check Stopwords
    if (!STOPWORDS.has(cleanT)) {
      remainingTokens.push(token);
    }
  }

  const remainingQuery = remainingTokens.join(' ').trim();
  return {
    location: remainingQuery,
    gender: detectedGender,
    roomType: detectedRoom,
    isVerified: detectedVerified,
    amenities: Array.from(detectedAmenities),
    remainingQuery,
  };
}

const CONVERSATIONAL_PATTERNS = [
  'mujhe', 'chahiye', 'pass', 'ke pass', 'under', 'below', 'near',
  'ke sath', 'with food', 'with wifi', 'se kam', 'se jyada', 'tak'
];

export function isConversationalQuery(query) {
  if (!query || !query.trim()) return false;
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/);
  if (tokens.length > 3) return true;
  return CONVERSATIONAL_PATTERNS.some((term) => q.includes(term));
}

/**
 * Sanitizes budget bounds and prevents inverted ranges.
 */
export function sanitizeBudgetBounds(minVal, maxVal) {
  let min = null;
  let max = null;

  if (minVal !== '' && minVal !== null && minVal !== undefined) {
    const p = Number(minVal);
    if (!isNaN(p) && p >= 0) min = p;
  }

  if (maxVal !== '' && maxVal !== null && maxVal !== undefined) {
    const p = Number(maxVal);
    if (!isNaN(p) && p >= 0) max = p;
  }

  if (min !== null && max !== null && min > max) {
    return { minPrice: max, maxPrice: min };
  }
  return { minPrice: min, maxPrice: max };
}

/**
 * 1. NORMAL SEARCH (Relational Query - Bypasses Gemini entirely)
 *
 * Sends raw search query and active UI filters to the backend relational endpoint.
 * Includes direct fallback to Supabase PostgreSQL query if the backend is offline.
 */
export async function executeNormalSearch({
  query = '',
  filters = {},
  page = 1,
  pageSize = 20,
  signal = null,
}) {
  const { minPrice, maxPrice } = sanitizeBudgetBounds(filters.minPrice, filters.maxPrice);
  const gender = normalizeGender(filters.gender);
  const roomType = normalizeRoomType(filters.roomType);
  const locality = filters.location?.trim() || null;
  const amenities = Array.isArray(filters.amenities)
    ? Array.from(new Set(filters.amenities.filter((a) => Boolean(a && a.trim()))))
    : [];
  const verifiedOnly = Boolean(filters.verifiedOnly);

  const payload = {
    query: query?.trim() || null,
    filter_locality: locality,
    filter_min_rent: minPrice,
    filter_max_rent: maxPrice,
    filter_gender: gender,
    filter_room_type: roomType,
    filter_amenities: amenities.length > 0 ? amenities : null,
    filter_is_verified: verifiedOnly,
    page: Math.max(1, Number(page) || 1),
    page_size: Math.min(100, Math.max(1, Number(pageSize) || 20)),
  };

  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/pgs/search/normal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    console.warn('FastAPI normal search unavailable, falling back to direct Supabase relational query:', err.message);
  }

  // Pure Supabase Relational Fallback (Bypasses Gemini & Vector)
  if (isConversationalQuery(query)) {
    return {
      results: [],
      total: 0,
      suggest_ai: true,
      message: "It looks like you're typing a sentence. Click here to use AI Search instead!",
      is_ai: false,
    };
  }

  let dbQuery = supabase
    .from('pg_listings')
    .select('*, profiles(full_name, email, phone, avatar_url, kyc_status, is_active, is_deleted)', { count: 'exact' })
    .eq('status', 'approved')
    .eq('is_available', true)
    .eq('is_deleted', false);

  const parsed = parseNormalSearchQuery(query);
  const finalGender = gender || parsed.gender;
  const finalRoom = roomType || parsed.roomType;
  const finalVerified = verifiedOnly || parsed.isVerified;
  const finalAmenities = (amenities && amenities.length > 0) ? amenities : parsed.amenities;
  const targetText = parsed.location || locality;

  if (targetText && targetText.trim()) {
    const q = targetText.trim();
    dbQuery = dbQuery.or(`title.ilike.%${q}%,locality.ilike.%${q}%,address.ilike.%${q}%,description.ilike.%${q}%`);
  }

  if (minPrice !== null) dbQuery = dbQuery.gte('rent', minPrice);
  if (maxPrice !== null) dbQuery = dbQuery.lte('rent', maxPrice);
  if (finalGender) dbQuery = dbQuery.ilike('gender_preference', finalGender);
  if (finalRoom) dbQuery = dbQuery.ilike('room_type', finalRoom);
  if (finalVerified) dbQuery = dbQuery.eq('is_verified', true);
  if (finalAmenities && finalAmenities.length > 0) dbQuery = dbQuery.contains('amenities', finalAmenities);

  const from = (payload.page - 1) * payload.page_size;
  const to = from + payload.page_size - 1;
  const { data, count, error } = await dbQuery.range(from, to).order('created_at', { ascending: false });

  if (error) throw error;
  return {
    results: (data || []).filter((p) => p.profiles?.is_active !== false && !p.profiles?.is_deleted),
    total: count || (data ? data.length : 0),
    is_ai: false,
  };
}

/**
 * 2. AI VECTOR SEARCH (Gemini Natural Language Filter Extraction + pgvector)
 *
 * Sends the natural query to FastAPI where Gemini extracts structured bounds & categories,
 * then queries Supabase with pgvector cosine similarity and strict metadata pre-filtering.
 */
export async function executeAiSearch({
  query = '',
  filters = {},
  page = 1,
  pageSize = 20,
  similarityThreshold = 0.60,
  signal = null,
}) {
  const { minPrice, maxPrice } = sanitizeBudgetBounds(filters.minPrice, filters.maxPrice);
  const gender = normalizeGender(filters.gender);
  const roomType = normalizeRoomType(filters.roomType);
  const locality = filters.location?.trim() || null;
  const amenities = Array.isArray(filters.amenities)
    ? Array.from(new Set(filters.amenities.filter((a) => Boolean(a && a.trim()))))
    : [];
  const verifiedOnly = Boolean(filters.verifiedOnly);

  const payload = {
    query: query?.trim() || null,
    filter_locality: locality,
    filter_min_rent: minPrice,
    filter_max_rent: maxPrice,
    filter_gender: gender,
    filter_room_type: roomType,
    filter_amenities: amenities.length > 0 ? amenities : null,
    filter_is_verified: verifiedOnly,
    similarity_threshold: Number(similarityThreshold) || 0.60,
    match_count: Math.min(100, Math.max(1, Number(pageSize) || 20)),
    match_offset: (Math.max(1, Number(page) || 1) - 1) * Math.min(100, Math.max(1, Number(pageSize) || 20)),
  };

  const res = await fetch(`${FASTAPI_BASE_URL}/api/pgs/search/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.detail || `AI Search failed with status ${res.status}`);
  }

  return await res.json();
}
