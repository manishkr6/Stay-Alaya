import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Search,
  Sparkles,
  RefreshCw,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Languages,
  LayoutGrid,
  List,
  Check,
  RotateCcw,
  Sliders,
  Bed,
  Users,
  DollarSign,
  ArrowUpDown,
  Home,
  Wifi,
  Utensils,
  Wind,
  Droplets,
  Video,
  Shirt,
  Car,
  Dumbbell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../hooks/useData';
import PGCard from '../components/ui/PGCard';
import { SkeletonCard, EmptyState, Pagination } from '../components/ui/index.jsx';
import { parseSearchQueryWithAI } from '../services/aiService';
import {
  isConversationalQuery,
  fetchActiveLocations,
  normalizeGender,
  normalizeRoomType,
  parseNormalSearchQuery,
} from '../services/searchApi';

const AMENITY_LIST = ['WiFi', 'Food', 'AC', 'Water', 'CCTV', 'Laundry', 'Parking', 'Gym'];

const AMENITY_ICONS = {
  WiFi: Wifi,
  Food: Utensils,
  AC: Wind,
  Water: Droplets,
  CCTV: Video,
  Laundry: Shirt,
  Parking: Car,
  Gym: Dumbbell,
};

const PER_PAGE = 9;

const normalizeLocation = (loc) => (loc ? String(loc).trim() : '');

// 100% Real prompts matched directly to existing inventory in Sikkim
const REAL_QUICK_PROMPTS = [
  {
    query: 'Rooms & PG near ICFAI University with food',
    label: 'PG near ICFAI University',
    icon: '🎓',
    badge: 'ICFAI • Food',
  },
  {
    query: 'Single room in Tadong with WiFi',
    label: 'Single Room in Tadong',
    icon: '🛏️',
    badge: '₹6k • WiFi',
  },
  {
    query: 'Tadong me boys PG khana aur wifi ke sath',
    label: 'Boys PG (हिंदी / Hinglish)',
    icon: '🇮🇳',
    badge: 'AI Search',
  },
  {
    query: 'Girls PG with Food in Gangtok',
    label: 'Girls PG with Food',
    icon: '🌸',
    badge: '₹3k • Food',
  },
  {
    query: 'Boys PG with CCTV and Food',
    label: 'Boys PG with CCTV',
    icon: '👦',
    badge: '₹5k • Meals',
  },
  {
    query: 'Co-ed Room under 5000',
    label: 'Co-ed Room under ₹5,000',
    icon: '👥',
    badge: 'Affordable',
  },
  {
    query: '14-point physically verified PGs',
    label: '14-Point Verified Stays',
    icon: '🛡️',
    badge: 'Verified',
  },
];

export default function FindPG() {
  const { getApprovedPGs } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const allPGs = getApprovedPGs();

  // Compute live statistics directly from real database listings
  const realStats = useMemo(() => {
    let minP = Infinity;
    let maxP = 0;
    const roomCounts = { Single: 0, Double: 0, Triple: 0 };
    const genderCounts = { Boys: 0, Girls: 0, 'Co-ed': 0 };
    const amenityCounts = {};
    let verifiedCount = 0;

    AMENITY_LIST.forEach((a) => {
      amenityCounts[a] = 0;
    });

    allPGs.forEach((pg) => {
      const p = Number(pg.price ?? pg.rent ?? 0);
      if (p > 0) {
        if (p < minP) minP = p;
        if (p > maxP) maxP = p;
      }
      if (pg.isVerified) verifiedCount++;
      if (pg.roomType && roomCounts[pg.roomType] !== undefined) {
        roomCounts[pg.roomType]++;
      }
      if (pg.genderPreference && genderCounts[pg.genderPreference] !== undefined) {
        genderCounts[pg.genderPreference]++;
      }
      (pg.amenities || []).forEach((a) => {
        if (amenityCounts[a] !== undefined) {
          amenityCounts[a]++;
        } else {
          amenityCounts[a] = 1;
        }
      });
    });

    return {
      total: allPGs.length,
      minPrice: minP === Infinity ? 3000 : minP,
      maxPrice: maxP === 0 ? 6000 : maxP,
      roomCounts,
      genderCounts,
      amenityCounts,
      verifiedCount,
    };
  }, [allPGs]);

  const getInitialFilters = (params) => {
    const rawAiQuery = params.get('query');
    const rawNormalQuery = params.get('q');
    const rawLoc = params.get('location') || params.get('locality') || '';
    const parsedNormal = rawNormalQuery ? parseNormalSearchQuery(rawNormalQuery) : null;

    const loc = normalizeLocation(parsedNormal ? parsedNormal.location : rawLoc);
    const minP = params.get('minPrice') || '';
    const maxP = params.get('maxPrice') || '';
    const room = params.get('roomType')
      ? (normalizeRoomType(params.get('roomType')) || params.get('roomType'))
      : (parsedNormal?.roomType || '');
    const gen = params.get('gender')
      ? (normalizeGender(params.get('gender')) || params.get('gender'))
      : (parsedNormal?.gender || '');
    const ver = params.get('verified') === 'true' || Boolean(parsedNormal?.isVerified);
    return {
      location: loc,
      minPrice: minP,
      maxPrice: maxP,
      roomType: room,
      gender: gen,
      verifiedOnly: ver,
      amenities: parsedNormal?.amenities || [],
    };
  };

  const hasIncomingAiQuery = Boolean(searchParams.get('query'));
  const initialQuery = searchParams.get('query') || searchParams.get('q') || '';
  const initialLoc = normalizeLocation(searchParams.get('q') || searchParams.get('location') || searchParams.get('locality') || '');

  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));
  const [activeAreas, setActiveAreas] = useState([{ id: '', label: 'All Sikkim' }]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [sort, setSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(initialQuery || initialLoc || '');
  const [isAiSearching, setIsAiSearching] = useState(hasIncomingAiQuery);
  const [aiAppliedTag, setAiAppliedTag] = useState(null);
  const [suggestAiBanner, setSuggestAiBanner] = useState(false);
  const lastProcessedParamsRef = useRef('');

  // Dynamic Location Filter Population - strictly database-driven from real PG listings
  useEffect(() => {
    let isMounted = true;
    const loadLocations = async () => {
      setLoadingLocations(true);
      try {
        const locations = await fetchActiveLocations();
        if (isMounted && Array.isArray(locations) && locations.length > 0) {
          setActiveAreas(locations);
        }
      } catch (err) {
        console.error('Failed to load active locations:', err);
      } finally {
        if (isMounted) setLoadingLocations(false);
      }
    };

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  // Sync with incoming URL parameters on mount or when URL changes
  useEffect(() => {
    const currentParamStr = searchParams.toString();
    if (currentParamStr === lastProcessedParamsRef.current) return;
    lastProcessedParamsRef.current = currentParamStr;

    const rawAiQuery = searchParams.get('query');
    const rawNormalQuery = searchParams.get('q');
    const rawLoc = searchParams.get('location') || searchParams.get('locality') || '';

    if (rawAiQuery && rawAiQuery.trim()) {
      const decoded = decodeURIComponent(rawAiQuery).trim();
      setSearchQuery(decoded);
      handleAiSearch(decoded, false);
    } else {
      const parsedNormal = rawNormalQuery ? parseNormalSearchQuery(rawNormalQuery) : null;
      const loc = normalizeLocation(parsedNormal ? parsedNormal.location : rawLoc);
      const minP = searchParams.get('minPrice') || '';
      const maxP = searchParams.get('maxPrice') || '';
      const room = searchParams.get('roomType')
        ? (normalizeRoomType(searchParams.get('roomType')) || searchParams.get('roomType'))
        : (parsedNormal?.roomType || '');
      const gen = searchParams.get('gender')
        ? (normalizeGender(searchParams.get('gender')) || searchParams.get('gender'))
        : (parsedNormal?.gender || '');
      const ver = searchParams.get('verified') === 'true' || Boolean(parsedNormal?.isVerified);
      const amenities = parsedNormal?.amenities || [];

      setIsAiSearching(false);
      setFilters({
        location: loc,
        minPrice: minP,
        maxPrice: maxP,
        roomType: room,
        gender: gen,
        verifiedOnly: ver,
        amenities,
      });
      setAiAppliedTag(null);
      if (rawNormalQuery) {
        setSearchQuery(rawNormalQuery);
      } else if (loc) {
        setSearchQuery(loc);
      } else {
        setSearchQuery('');
      }
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = [...allPGs];

    if (filters.location) {
      const loc = filters.location.toLowerCase().trim();
      result = result.filter((pg) => {
        const city = (pg.location?.city || pg.city || '').toLowerCase();
        const area = (pg.location?.area || pg.locality || pg.area || '').toLowerCase();
        const title = (pg.title || '').toLowerCase();
        const addr = (pg.location?.address || pg.address || '').toLowerCase();
        const desc = (pg.description || '').toLowerCase();

        return (
          city.includes(loc) ||
          area.includes(loc) ||
          title.includes(loc) ||
          addr.includes(loc) ||
          desc.includes(loc)
        );
      });
    }

    if (filters.verifiedOnly) {
      result = result.filter((pg) => pg.isVerified);
    }

    if (filters.minPrice) {
      const min = Number(filters.minPrice);
      if (!isNaN(min) && min > 0) result = result.filter((pg) => pg.price >= min);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice);
      if (!isNaN(max) && max > 0) result = result.filter((pg) => pg.price <= max);
    }
    if (filters.roomType && filters.roomType.trim()) {
      const targetRoom = normalizeRoomType(filters.roomType) || filters.roomType.trim().toLowerCase();
      result = result.filter((pg) => {
        const pgRoom = normalizeRoomType(pg.roomType || pg.room_type) || (pg.roomType || pg.room_type || '').trim().toLowerCase();
        return pgRoom === targetRoom;
      });
    }
    if (filters.gender && filters.gender.trim()) {
      const target = filters.gender.toLowerCase();
      if (target === 'homestay') {
        result = result.filter((pg) => {
          const t = (pg.title || '').toLowerCase();
          const d = (pg.description || '').toLowerCase();
          return t.includes('homestay') || d.includes('homestay');
        });
      } else {
        const normalizedTarget = normalizeGender(filters.gender);
        if (normalizedTarget) {
          result = result.filter((pg) => {
            const pref = normalizeGender(pg.genderPreference || pg.gender_preference);
            return pref === normalizedTarget;
          });
        } else {
          const targetKey = target.replace(/[-_\s]+/g, '');
          result = result.filter((pg) => {
            const pref = (pg.genderPreference || pg.gender_preference || '').toLowerCase().replace(/[-_\s]+/g, '');
            return pref === targetKey;
          });
        }
      }
    }
    if (filters.amenities && filters.amenities.length > 0) {
      result = result.filter((pg) => {
        const pgAmenities = (pg.amenities || []).map((a) => String(a).toLowerCase().trim());
        return filters.amenities.every((a) =>
          pgAmenities.includes(String(a).toLowerCase().trim())
        );
      });
    }

    switch (sort) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'verified':
        result.sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0));
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [allPGs, filters, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const setFilter = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);

    const params = new URLSearchParams(searchParams);
    if (val) params.set(key, String(val));
    else params.delete(key);
    lastProcessedParamsRef.current = params.toString();
    setSearchParams(params);
  };

  const toggleAmenity = (a) => {
    const updated = filters.amenities.includes(a)
      ? filters.amenities.filter((x) => x !== a)
      : [...filters.amenities, a];

    setFilter('amenities', updated);
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      minPrice: '',
      maxPrice: '',
      roomType: '',
      gender: '',
      verifiedOnly: false,
      amenities: [],
    });
    setSearchQuery('');
    setAiAppliedTag(null);
    setIsAiSearching(false);
    setSuggestAiBanner(false);
    lastProcessedParamsRef.current = '';
    setSearchParams({});
    setPage(1);
    toast.success('All filters reset');
  };

  const handleNormalSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();

    // Strictly bypass Gemini AI on Normal Search
    setAiAppliedTag(null);
    setIsAiSearching(false);
    setPage(1);

    if (!query) {
      setFilters({
        location: '',
        minPrice: '',
        maxPrice: '',
        roomType: '',
        gender: '',
        verifiedOnly: false,
        amenities: [],
      });
      lastProcessedParamsRef.current = '';
      setSearchParams({});
      setSuggestAiBanner(false);
      return;
    }

    // Natural Language & Hindi Detection (Smart Routing prompt)
    if (isConversationalQuery(query)) {
      setSuggestAiBanner(true);
      toast('Sentence detected! Click the AI Search suggestion above for best results.', {
        icon: '✨',
      });
      return;
    }

    setSuggestAiBanner(false);

    // Parse query to extract categories (Gender, Room Type, Verified, Amenities) and isolated Location
    const { location, gender, roomType, isVerified, amenities } = parseNormalSearchQuery(query);

    // 1. Explicitly clear previous stale filters, and apply ONLY the newly extracted filters
    // (Location, plus any detected categorical terms like 'verified', 'Coad', 'Boys', 'Single')
    const freshFilters = {
      location: location || '',
      minPrice: '',
      maxPrice: '',
      roomType: roomType || '',
      gender: gender || '',
      verifiedOnly: Boolean(isVerified),
      amenities: amenities || [],
    };

    setFilters(freshFilters);

    // 2. Wipe out old URL search parameters completely so URL only contains the fresh query
    const newParams = new URLSearchParams();
    newParams.set('q', query);
    if (freshFilters.location) newParams.set('location', freshFilters.location);
    if (freshFilters.gender) newParams.set('gender', freshFilters.gender);
    if (freshFilters.roomType) newParams.set('roomType', freshFilters.roomType);
    if (freshFilters.verifiedOnly) newParams.set('verified', 'true');
    lastProcessedParamsRef.current = newParams.toString();
    setSearchParams(newParams);

    const parts = [];
    if (freshFilters.location) parts.push(`📍 ${freshFilters.location}`);
    if (freshFilters.verifiedOnly) parts.push('🛡️ Verified');
    if (freshFilters.gender) parts.push(`👤 ${freshFilters.gender}`);
    if (freshFilters.roomType) parts.push(`🛏️ ${freshFilters.roomType}`);
    if (freshFilters.amenities.length > 0) parts.push(`✨ ${freshFilters.amenities.join(', ')}`);
    toast.success(`Standard search for ${parts.join(' • ') || `"${query}"`}`);
  };

  const handleAiSearch = async (queryOverride, syncParams = true) => {
    const textToSearch = (typeof queryOverride === 'string' ? queryOverride : searchQuery).trim();
    if (!textToSearch) return;

    if (typeof queryOverride === 'string') {
      setSearchQuery(queryOverride);
    }

    // 1. Explicitly clear/reset all active UI filters & URL parameters BEFORE applying new AI search query
    setSuggestAiBanner(false);
    const RESET_FILTERS = {
      location: '',
      minPrice: '',
      maxPrice: '',
      roomType: '',
      gender: '',
      verifiedOnly: false,
      amenities: [],
    };
    setFilters(RESET_FILTERS);
    setAiAppliedTag(null);
    setPage(1);

    if (syncParams) {
      lastProcessedParamsRef.current = '';
      setSearchParams({});
    }

    setIsAiSearching(true);
    try {
      const parsed = await parseSearchQueryWithAI(textToSearch);
      const loc = normalizeLocation(parsed.location || '');

      const isVerifiedSearch = /verified|verification|14-point/i.test(textToSearch);

      // 2. Construct fresh filters strictly from the new search query (NO stale filters carried over)
      const extractedGender = normalizeGender(parsed.gender || parsed.genderPreference);
      const extractedRoomType = normalizeRoomType(parsed.roomType);

      const freshFilters = {
        location: loc,
        minPrice: parsed.minPrice ? String(parsed.minPrice) : '',
        maxPrice: parsed.maxPrice ? String(parsed.maxPrice) : '',
        roomType: extractedRoomType || '',
        gender: extractedGender || '',
        verifiedOnly: isVerifiedSearch,
        amenities: Array.isArray(parsed.amenities) ? parsed.amenities : [],
      };

      setFilters(freshFilters);
      setPage(1);

      if (syncParams) {
        const params = new URLSearchParams();
        params.set('q', textToSearch);
        if (freshFilters.location) params.set('location', freshFilters.location);
        if (freshFilters.minPrice) params.set('minPrice', freshFilters.minPrice);
        if (freshFilters.maxPrice) params.set('maxPrice', freshFilters.maxPrice);
        if (freshFilters.gender) params.set('gender', freshFilters.gender);
        if (freshFilters.roomType) params.set('roomType', freshFilters.roomType);
        if (freshFilters.verifiedOnly) params.set('verified', 'true');
        lastProcessedParamsRef.current = params.toString();
        setSearchParams(params);
      }

      const summaryParts = [];
      if (loc) summaryParts.push(`📍 ${loc}`);
      if (freshFilters.gender) {
        summaryParts.push(`👤 ${freshFilters.gender}`);
      }
      if (freshFilters.roomType) {
        summaryParts.push(`🛏️ ${freshFilters.roomType}`);
      }
      if (freshFilters.maxPrice) {
        summaryParts.push(`💰 Up to ₹${Number(freshFilters.maxPrice).toLocaleString('en-IN')}`);
      }
      if (freshFilters.minPrice) {
        summaryParts.push(`💰 Above ₹${Number(freshFilters.minPrice).toLocaleString('en-IN')}`);
      }
      if (freshFilters.amenities.length > 0) {
        summaryParts.push(`✨ ${freshFilters.amenities.join(', ')}`);
      }
      if (freshFilters.verifiedOnly) {
        summaryParts.push(`🛡️ Verified`);
      }
      if (freshFilters.minPrice && freshFilters.maxPrice) {
        summaryParts.push(`💰 ₹${Number(freshFilters.minPrice).toLocaleString('en-IN')} - ₹${Number(freshFilters.maxPrice).toLocaleString('en-IN')}`);
      } else if (freshFilters.maxPrice) {
        summaryParts.push(`💰 Max ₹${Number(freshFilters.maxPrice).toLocaleString('en-IN')}`);
      } else if (freshFilters.minPrice) {
        summaryParts.push(`💰 Min ₹${Number(freshFilters.minPrice).toLocaleString('en-IN')}`);
      }
      if (isVerifiedSearch) summaryParts.push(`🛡️ Verified`);
      if (freshFilters.amenities?.length) summaryParts.push(`✨ ${freshFilters.amenities.join(', ')}`);

      setAiAppliedTag(summaryParts.join(' • ') || textToSearch);
    } catch (err) {
      console.error('AI search error:', err);
      toast.error('Could not parse AI search');
    } finally {
      setIsAiSearching(false);
    }
  };

  const activeFilterCount =
    [
      filters.location,
      (filters.minPrice || filters.maxPrice),
      filters.roomType,
      filters.gender,
      filters.verifiedOnly,
    ].filter(Boolean).length + filters.amenities.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-[#f8fafc] to-slate-100/70 pt-16">
      {/* ========================================================
          1. HERO & BORDERLESS SEARCH SECTION (Responsive Mobile-First)
          ======================================================== */}
      <section className="relative pt-3 pb-3 sm:pt-6 sm:pb-6 px-3 sm:px-6 lg:px-8 border-b border-slate-200/60 bg-white/70 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          {/* Real Inventory Status Badge - Visible on tablet/desktop, compact indicator on mobile */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold mb-3 shadow-md border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200">
              Live Sikkim Stays: <strong className="text-white">{realStats.total} properties</strong>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-[#f5a623] font-bold">100% Real Hosts</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">Zero Brokerage</span>
          </div>

          <h1 className="text-lg sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-1.5 sm:mb-2">
            Find Your Ideal PG in <span className="text-[#0f2547]">Sikkim</span> 🏡
          </h1>

          {/* AI Search Multi-Language Guide Banner */}
          <div className="max-w-3xl mx-auto mt-1 sm:mt-2 mb-3 sm:mb-4 px-1">
            <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/10 via-white/95 to-indigo-500/10 border border-amber-300/80 p-2.5 sm:p-4 shadow-xs backdrop-blur-md transition-all hover:border-amber-400">
              {/* Header row: AI Badge + Supported Languages */}
              <div className="flex items-center justify-between gap-1.5 mb-2 flex-nowrap">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0f2547] text-[#f5a623] text-[10px] sm:text-xs font-black shadow-2xs">
                    <Sparkles size={11} className="animate-pulse shrink-0" />
                    <span>AI Smart Search</span>
                  </div>
                  <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500">
                    • Powered by Stay Aalaya AI
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300/80 text-[10px] sm:text-[11px] font-bold shadow-2xs shrink-0">
                  <Languages size={11} className="text-amber-800 shrink-0" />
                  <span>English • हिंदी • Hinglish</span>
                </div>
              </div>

              {/* How AI Search Works Explanation */}
              <div className="text-left mb-2.5">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  Skip manual filter dropdowns! Ask naturally in <span className="text-amber-800 font-bold">English, हिंदी, or Hinglish</span> — our <strong className="text-[#0f2547] font-extrabold">Stay Aalaya AI</strong> instantly matches verified rooms near <span className="text-amber-800 font-semibold">ICFAI, SMIT</span>, colleges, nearby places & all Sikkim localities.
                </p>
              </div>

              {/* 3 Quick How-It-Works Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 mb-2.5 py-1.5 border-y border-amber-200/60 bg-white/70 rounded-xl px-2 sm:px-3 text-left">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span><strong>Type naturally</strong> in English, हिंदी, or mix</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span><strong>AI auto-filters</strong> college, rent, & food</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span><strong>Instant verified stays</strong> matched live</span>
                </div>
              </div>

              {/* Interactive example chips that user can tap - Horizontal swipeable row on mobile */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Try asking:</span>
                <button
                  type="button"
                  onClick={() => {
                    const q = 'ICFAI University ke pass PG with food';
                    setSearchQuery(q);
                    handleAiSearch(q);
                  }}
                  className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] bg-white hover:bg-amber-50 text-slate-700 hover:text-[#0f2547] font-semibold px-2.5 py-1 rounded-full border border-slate-200/90 hover:border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Click to search near ICFAI University"
                >
                  <span className="text-xs">🎓</span>
                  <span>"ICFAI University ke pass PG with food"</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = 'Tadong me boys PG under 7000 with wifi';
                    setSearchQuery(q);
                    handleAiSearch(q);
                  }}
                  className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] bg-white hover:bg-amber-50 text-slate-700 hover:text-[#0f2547] font-semibold px-2.5 py-1 rounded-full border border-slate-200/90 hover:border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Click to search in Hinglish"
                >
                  <span className="text-xs">🇮🇳</span>
                  <span>"Tadong me boys PG under 7000 with wifi"</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = 'Single room near SMIT with wifi';
                    setSearchQuery(q);
                    handleAiSearch(q);
                  }}
                  className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] bg-white hover:bg-amber-50 text-slate-700 hover:text-[#0f2547] font-semibold px-2.5 py-1 rounded-full border border-slate-200/90 hover:border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Click to search in English"
                >
                  <span className="text-xs">🇬🇧</span>
                  <span>"Single room near SMIT with wifi"</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const q = 'Girls PG in 5th Mile with winter geyser';
                    setSearchQuery(q);
                    handleAiSearch(q);
                  }}
                  className="shrink-0 whitespace-nowrap text-[10px] sm:text-[11px] bg-white hover:bg-amber-50 text-slate-700 hover:text-[#0f2547] font-semibold px-2.5 py-1 rounded-full border border-slate-200/90 hover:border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Click to search girls PG with geyser"
                >
                  <span className="text-xs">🌸</span>
                  <span>"Girls PG 5th Mile with geyser"</span>
                </button>
              </div>
            </div>
          </div>

          {/* Elevated Search Container - Responsive Layout (Clean 2-tier on Mobile, Single-Row on Desktop) */}
          <div className="relative group max-w-3xl mx-auto mt-1 sm:mt-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400/20 via-[#0f2547]/15 to-amber-400/20 rounded-2xl sm:rounded-3xl blur-md opacity-70 pointer-events-none" />

            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-md sm:shadow-xl border border-slate-200/80 p-2 sm:p-2.5 transition-all">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNormalSearch();
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                {/* Search Input */}
                <div className="flex-1 flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-0 bg-slate-50/70 sm:bg-transparent rounded-xl sm:rounded-none border border-slate-200/50 sm:border-0 min-w-0">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-[#0f2547]">
                    <Search size={15} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Tadong, Gangtok, or ask AI..."
                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    className="w-full bg-transparent text-xs sm:text-sm border-0 outline-none focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 font-medium truncate py-1 sm:py-1.5"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilter('location', '');
                        setAiAppliedTag(null);
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition-colors shrink-0"
                      title="Clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Normal Keyword Search Button */}
                  <button
                    type="submit"
                    onClick={handleNormalSearch}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Normal search by keyword"
                  >
                    <Search size={14} className="text-slate-500" />
                    <span>Search</span>
                  </button>

                  {/* AI Search Button with Clear Text */}
                  <button
                    type="button"
                    onClick={() => handleAiSearch()}
                    disabled={!searchQuery.trim() || isAiSearching}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-[#f5a623] bg-[#0f2547] hover:bg-[#0b192c] border border-amber-400/40 shadow-xs active:scale-95 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
                    title="Smart Search with Stay Aalaya AI"
                  >
                    {isAiSearching ? (
                      <RefreshCw size={13} className="animate-spin text-[#f5a623]" />
                    ) : (
                      <Sparkles size={13} className="text-[#f5a623]" />
                    )}
                    <span>{isAiSearching ? 'Searching...' : 'AI Search'}</span>
                  </button>

                  {/* Mobile Filters Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className="lg:hidden inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                    title="Open Filters"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 bg-slate-950 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Smart Routing AI Suggestion Prompt (when natural language or sentence is detected in Normal Search) */}
          {suggestAiBanner && (
            <div className="mt-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-indigo-500/15 border border-amber-400 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0f2547] text-[#f5a623] flex items-center justify-center shrink-0 shadow-2xs font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                    It looks like you're typing a sentence!
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                    Standard search matches location keywords. Use <strong className="text-[#0f2547]">AI Search</strong> for natural conversational queries in English, Hindi & Hinglish.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuggestAiBanner(false);
                  handleAiSearch();
                }}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <span>Click here to use AI Search instead!</span>
                <Sparkles size={14} />
              </button>
            </div>
          )}

          {/* Quick Prompts - Horizontal Scrollable Carousel */}
          <div className="mt-2.5 sm:mt-3.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth">
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700 font-bold text-[10px] sm:text-[11px]">
              <Sparkles size={11} className="text-[#0f2547]" />
              Quick:
            </span>
            {REAL_QUICK_PROMPTS.map((chip) => (
              <button
                key={chip.query}
                type="button"
                onClick={() => {
                  setSearchQuery(chip.query);
                  handleAiSearch(chip.query);
                }}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] sm:text-xs border border-slate-200 shadow-2xs hover:shadow-xs transition-all active:scale-95"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
                <span className="hidden sm:inline text-[10px] text-slate-400 font-normal ml-0.5">({chip.badge})</span>
              </button>
            ))}
          </div>

          {/* Active AI Applied Filter Tag */}
          {aiAppliedTag && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium shadow-xs">
              <Sparkles size={12} className="text-[#f5a623]" />
              <span className="truncate max-w-xs text-[11.5px]">
                Active AI: <strong className="text-slate-900">{aiAppliedTag}</strong>
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="ml-1 text-slate-400 hover:text-rose-600 transition-colors"
                title="Clear filters"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          2. MAIN CONTENT (Sidebar Filters + Results Grid)
          ======================================================== */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-7 pb-24 sm:pb-12">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-7 items-start">
          {/* ================= SIDEBAR (Full height on desktop, Bottom-Sheet on mobile) ================= */}
          <aside
            className={`${
              filtersOpen
                ? 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4'
                : 'hidden'
            } lg:block w-full lg:w-72 shrink-0`}
          >
            <div
              className={`bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200/90 shadow-2xl lg:shadow-sm p-4 sm:p-5 w-full sm:max-w-md max-h-[85vh] lg:max-h-none overflow-y-auto lg:overflow-visible`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={17} className="text-[#0f2547]" />
                  <h3 className="font-bold text-slate-900 text-base">Filters</h3>
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 bg-[#0f2547] text-[#f5a623] text-xs rounded-full flex items-center justify-center font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold transition-colors"
                    >
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 1. Verified Only Toggle */}
              <div className="pb-4 mb-4 border-b border-slate-100">
                <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        Verified Only
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        14-Point Inspected ({realStats.verifiedCount})
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => setFilter('verifiedOnly', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-emerald-300"
                  />
                </label>
              </div>

              {/* 2. Location Section */}
              <FilterSection title="Location">
                <div className="space-y-1">
                  <select
                    value={filters.location}
                    onChange={(e) => {
                      setFilter('location', e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-400/40 focus:border-[#f5a623] outline-none"
                    disabled={loadingLocations && activeAreas.length <= 1}
                  >
                    {activeAreas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} {c.count !== undefined ? `(${c.count})` : (c.id === '' ? `(${realStats.total})` : '')}
                      </option>
                    ))}
                  </select>
                </div>
              </FilterSection>

              {/* 3. Real Price Range Slider & Presets */}
              <FilterSection title="Monthly Budget (Rent)">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Selected Budget:
                    </span>
                    <span className="font-extrabold text-[#0f2547] text-sm">
                      {filters.minPrice && filters.maxPrice
                        ? `₹${Number(filters.minPrice).toLocaleString('en-IN')} - ₹${Number(filters.maxPrice).toLocaleString('en-IN')}`
                        : filters.maxPrice
                        ? `Below ₹${Number(filters.maxPrice).toLocaleString('en-IN')}`
                        : filters.minPrice
                        ? `Above ₹${Number(filters.minPrice).toLocaleString('en-IN')}`
                        : 'Any Budget'}
                    </span>
                  </div>

                  {/* Range Slider with Guaranteed Visible Dynamic Progress Rail */}
                  <div className="relative py-2 flex items-center">
                    {/* Underlying Track Rail - Always visible in all browsers */}
                    <div className="absolute inset-x-0 h-2 bg-slate-200 rounded-full overflow-hidden pointer-events-none border border-slate-300">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-[#f5a623] transition-all"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, (((Number(filters.maxPrice || 10000)) - 3000) / 7000) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min="3000"
                      max="10000"
                      step="500"
                      value={filters.maxPrice || '10000'}
                      onChange={(e) => setFilter('maxPrice', e.target.value === '10000' ? '' : e.target.value)}
                      style={{ background: 'transparent', border: 'none' }}
                      className="aalaya-budget-slider relative z-10 w-full"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold px-0.5 -mt-1">
                    <span>₹3,000 (Min)</span>
                    <span>₹10,000+ (Max)</span>
                  </div>

                  {/* Budget Presets using "Below" and "Above" instead of <= , >= */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'All Budgets', minVal: '', maxVal: '' },
                      { label: 'Below ₹3.5k', minVal: '', maxVal: '3500' },
                      { label: 'Below ₹5k', minVal: '', maxVal: '5000' },
                      { label: 'Above ₹5k', minVal: '5000', maxVal: '' },
                      { label: 'Below ₹6k', minVal: '', maxVal: '6000' },
                      { label: 'Above ₹6k', minVal: '6000', maxVal: '' },
                    ].map((tier) => {
                      const isSelected =
                        (tier.minVal === '' && tier.maxVal === '' && !filters.minPrice && !filters.maxPrice) ||
                        (tier.maxVal && filters.maxPrice === tier.maxVal && !filters.minPrice) ||
                        (tier.minVal && filters.minPrice === tier.minVal && !filters.maxPrice);

                      return (
                        <button
                          key={tier.label}
                          type="button"
                          onClick={() => {
                            setFilters((prev) => ({
                              ...prev,
                              minPrice: tier.minVal,
                              maxPrice: tier.maxVal,
                            }));
                            setPage(1);
                            const params = new URLSearchParams(searchParams);
                            if (tier.minVal) params.set('minPrice', tier.minVal);
                            else params.delete('minPrice');
                            if (tier.maxVal) params.set('maxPrice', tier.maxVal);
                            else params.delete('maxPrice');
                            lastProcessedParamsRef.current = params.toString();
                            setSearchParams(params);
                          }}
                          className={`text-[11px] py-1.5 px-2 rounded-lg font-semibold border transition-all ${
                            isSelected
                              ? 'bg-[#0f2547] text-[#f5a623] border-[#0f2547] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tier.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Min / Max Inputs */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => setFilter('minPrice', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#f5a623]"
                      />
                    </div>
                    <span className="text-slate-400 text-xs">to</span>
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilter('maxPrice', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#f5a623]"
                      />
                    </div>
                  </div>
                </div>
              </FilterSection>

              {/* 4. Room Type Segmented Chips */}
              <FilterSection title="Room Type">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '', label: 'All', count: realStats.total },
                    { id: 'Single', label: 'Single', count: realStats.roomCounts.Single },
                    { id: 'Double', label: 'Double', count: realStats.roomCounts.Double },
                    { id: 'Triple', label: 'Triple', count: realStats.roomCounts.Triple },
                  ].map((rt) => {
                    const isSelected = rt.id === ''
                      ? !filters.roomType
                      : (filters.roomType === rt.id || normalizeRoomType(filters.roomType) === rt.id);

                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setFilter('roomType', rt.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#0f2547] text-[#f5a623] border-[#0f2547] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{rt.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {rt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* 5. Gender Preference Segmented Chips */}
              <FilterSection title="Gender Preference">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '', label: 'All', count: realStats.total },
                    { id: 'Boys', label: 'Boys 👨', count: realStats.genderCounts.Boys },
                    { id: 'Girls', label: 'Girls 👩', count: realStats.genderCounts.Girls },
                    { id: 'Co-ed', label: 'Co-ed 👥', count: realStats.genderCounts['Co-ed'] },
                  ].map((g) => {
                    const isSelected = g.id === ''
                      ? !filters.gender
                      : (filters.gender === g.id || normalizeGender(filters.gender) === g.id);

                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setFilter('gender', g.id)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-[#0f2547] text-[#f5a623] border-[#0f2547] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{g.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {g.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* 6. Amenities with Live Counts & Real Icons */}
              <FilterSection title="Amenities & Facilities" last>
                <div className="grid grid-cols-2 gap-1.5">
                  {AMENITY_LIST.map((a) => {
                    const isChecked = filters.amenities.includes(a);
                    const Icon = AMENITY_ICONS[a];
                    const count = realStats.amenityCounts[a] || 0;

                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAmenity(a)}
                        className={`flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                          isChecked
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {Icon && (
                            <Icon
                              size={13}
                              className={isChecked ? 'text-amber-600' : 'text-slate-500'}
                            />
                          )}
                          <span className="text-[11.5px] truncate">{a}</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isChecked
                              ? 'bg-amber-200/70 text-amber-900 font-bold'
                              : 'bg-slate-200 text-slate-600 font-medium'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="lg:hidden w-full btn-primary text-xs py-2.5 mt-4 flex items-center justify-center font-bold"
              >
                Apply Filters ({filtered.length} Results)
              </button>
            </div>
          </aside>

          {/* ================= RESULTS CONTENT ================= */}
          <main className="flex-1 min-w-0 w-full">
            {/* Results Toolbar */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-4 mb-3 sm:mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-slate-700 text-xs sm:text-sm font-semibold truncate">
                  {isAiSearching ? (
                    <span className="inline-flex items-center gap-1.5 text-[#0f2547] font-bold animate-pulse">
                      <Sparkles size={13} className="text-[#f5a623] animate-spin" />
                      <span>Matching Sikkim listings...</span>
                    </span>
                  ) : (
                    <>
                      Showing <strong className="text-slate-900 font-extrabold">{filtered.length}</strong> stays
                    </>
                  )}
                </p>

                {/* Mobile Quick Verified Checkbox Filter */}
                <label
                  className={`lg:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-extrabold transition-all cursor-pointer select-none shadow-2xs ${
                    filters.verifiedOnly
                      ? 'bg-emerald-600 border-emerald-600 text-white ring-1 ring-emerald-400/50'
                      : 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
                  }`}
                  title="Filter verified stays only"
                >
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => setFilter('verifiedOnly', e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-400 cursor-pointer accent-emerald-600"
                  />
                  <ShieldCheck
                    size={13}
                    className={filters.verifiedOnly ? 'text-white' : 'text-emerald-600'}
                  />
                  <span className={filters.verifiedOnly ? 'text-white font-extrabold' : 'text-emerald-900 font-extrabold'}>
                    Verified
                  </span>
                  <span
                    className={`text-[9.5px] px-1 py-0.2 rounded-full font-extrabold ${
                      filters.verifiedOnly
                        ? 'bg-emerald-800 text-white'
                        : 'bg-emerald-200/90 text-emerald-900'
                    }`}
                  >
                    {realStats.verified}
                  </span>
                </label>
              </div>

              {/* Right Controls: View Switcher & Sort Dropdown */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* View Switcher (Grid / List) */}
                <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-[#0f2547] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-[#0f2547] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="List view"
                  >
                    <List size={15} />
                  </button>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg sm:rounded-xl px-2.5 py-1 sm:py-1.5 transition-colors">
                  <ArrowUpDown size={12} className="text-slate-500 shrink-0 pointer-events-none" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 border-none outline-none focus:ring-0 py-0 pl-0.5 pr-6 cursor-pointer"
                  >
                    <option value="newest">Newest</option>
                    <option value="verified">Verified</option>
                    <option value="price_low">Price: Low</option>
                    <option value="price_high">Price: High</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filters Removable Pills Bar */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-4 px-1">
                <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>

                {filters.location && (
                  <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full shadow-2xs font-medium">
                    <MapPin size={11} className="text-[#0f2547]" />
                    {filters.location}
                    <button
                      onClick={() => setFilter('location', '')}
                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {filters.verifiedOnly && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-2.5 py-1 rounded-full shadow-2xs font-semibold">
                    <ShieldCheck size={11} className="text-emerald-600" />
                    Verified Only
                    <button
                      onClick={() => setFilter('verifiedOnly', false)}
                      className="text-emerald-600 hover:text-rose-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {(filters.minPrice || filters.maxPrice) && (
                  <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full shadow-2xs font-medium">
                    {filters.minPrice && filters.maxPrice
                      ? `₹${Number(filters.minPrice).toLocaleString('en-IN')} - ₹${Number(filters.maxPrice).toLocaleString('en-IN')}`
                      : filters.maxPrice
                      ? `Below ₹${Number(filters.maxPrice).toLocaleString('en-IN')}`
                      : `Above ₹${Number(filters.minPrice).toLocaleString('en-IN')}`}
                    <button
                      onClick={() => {
                        setFilters((prev) => ({ ...prev, minPrice: '', maxPrice: '' }));
                        const params = new URLSearchParams(searchParams);
                        params.delete('minPrice');
                        params.delete('maxPrice');
                        lastProcessedParamsRef.current = params.toString();
                        setSearchParams(params);
                      }}
                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {filters.roomType && (
                  <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full shadow-2xs font-medium">
                    {filters.roomType} Room
                    <button
                      onClick={() => setFilter('roomType', '')}
                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {filters.gender && (
                  <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full shadow-2xs font-medium">
                    {filters.gender}
                    <button
                      onClick={() => setFilter('gender', '')}
                      className="text-slate-400 hover:text-rose-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {filters.amenities.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-950 text-xs px-2.5 py-1 rounded-full shadow-2xs font-medium"
                  >
                    {a}
                    <button
                      onClick={() => toggleAmenity(a)}
                      className="text-amber-700 hover:text-rose-500 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                <button
                  onClick={clearFilters}
                  className="text-xs text-rose-600 hover:underline font-semibold ml-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* AI Scanning Visual Feedback */}
            {isAiSearching ? (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081528] via-[#0f2547] to-[#1c3a66] border border-amber-400/40 p-7 sm:p-9 text-center text-white shadow-2xl">
                  <div className="absolute -inset-1.5 bg-radial from-amber-500/20 via-transparent to-transparent opacity-75 blur-2xl animate-pulse pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center text-[#f5a623] shadow-xl shadow-amber-500/20">
                        <Sparkles
                          size={32}
                          className="text-[#f5a623] animate-spin"
                          style={{ animationDuration: '6s' }}
                        />
                      </div>
                      <span className="absolute -inset-2 rounded-3xl border-2 border-amber-400/30 animate-ping pointer-events-none" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[#f5a623] text-xs font-extrabold uppercase tracking-wider mb-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
                      Stay-Aalaya AI Smart Filter
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                      Matching Real Sikkim Listings...
                    </h3>

                    <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto mb-5 font-normal">
                      Parsing <span className="text-[#f5a623] font-semibold">"{searchQuery || 'your requirements'}"</span> against real host inventory in Sikkim.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 font-semibold flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-[#f5a623]" /> Locating Campus / Area
                      </span>
                      <span
                        className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 font-semibold flex items-center gap-1.5 animate-pulse"
                        style={{ animationDelay: '200ms' }}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Checking Real Rent
                      </span>
                      <span
                        className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 font-semibold flex items-center gap-1.5 animate-pulse"
                        style={{ animationDelay: '400ms' }}
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-400" /> Verifying Amenities
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#f5a623] flex items-center justify-center mx-auto mb-4 border border-amber-200/60 shadow-xs">
                  <Search size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Matching PGs Found</h3>
                <p className="text-slate-600 text-sm max-w-md mx-auto mb-5">
                  We couldn't find any listings matching your current search. Normal Search looks for exact keywords.
                </p>

                {/* AI Search Suggestion Box */}
                <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0f2547]/5 via-amber-500/10 to-[#0f2547]/5 border border-amber-300/80 max-w-lg mx-auto text-left shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0f2547] text-[#f5a623] flex items-center justify-center shrink-0 shadow-xs font-bold">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                        Try Stay Aalaya AI Search!
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5">
                        Our AI understands conversational English, Hindi, Hinglish, college landmarks (ICFAI, SMIT), and handles typos effortlessly.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAiSearch(searchQuery || undefined)}
                        disabled={isAiSearching}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-[#f5a623] bg-[#0f2547] hover:bg-[#0b192c] transition-all shadow-xs active:scale-95 cursor-pointer border border-amber-400/50"
                      >
                        <Sparkles size={13} className="text-[#f5a623]" />
                        <span>Search with AI {searchQuery ? `for "${searchQuery}"` : 'instead'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={clearFilters}
                    className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5"
                  >
                    <RotateCcw size={14} />
                    <span>Reset All Filters</span>
                  </button>
                  <button
                    onClick={() => {
                      clearFilters();
                      setFilter('location', 'Gangtok');
                    }}
                    className="btn-outline inline-flex items-center gap-1 text-xs py-2.5 px-4"
                  >
                    <MapPin size={14} />
                    <span>View All Gangtok PGs ({realStats.total})</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'list'
                      ? 'space-y-3 sm:space-y-4'
                      : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-5'
                  }
                >
                  {paginated.map((pg) => (
                    <PGCard key={pg.id} pg={pg} viewMode={viewMode} />
                  ))}
                </div>

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children, last = false }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={`${last ? '' : 'border-b border-slate-100 pb-4 mb-4'}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-2.5 group text-left"
      >
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider group-hover:text-[#0f2547] transition-colors">
          {title}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && children}
    </div>
  );
}