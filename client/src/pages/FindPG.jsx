import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Search, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../hooks/useData';
import PGCard from '../components/ui/PGCard';
import { SkeletonCard, EmptyState, Pagination } from '../components/ui/index.jsx';
import { parseSearchQueryWithAI } from '../services/aiService';

const AMENITY_LIST = ['WiFi', 'Food', 'AC', 'Parking', 'Laundry', 'CCTV', 'Water', 'Gym'];
const CITIES = [
  'Gangtok',
  'Tadong',
  'Majitar',
  'Deorali',
  '5th Mile',
  'MG Marg',
  'Singtam',
  'Namchi',
  'Jorethang',
  'Gyalshing',
  'Mangan',
  'Ravangla',
  'Pakyong',
  'Rangpo',
];
const PER_PAGE = 9;

const normalizeLocation = (loc) => {
  if (!loc) return '';
  const l = loc.toLowerCase().trim();
  if (l.includes('icfai')) return 'Gangtok';
  if (l.includes('manipal') || l.includes('smit')) return 'Majitar';
  if (l.includes('smims') || l.includes('crh')) return 'Tadong';
  if (l.includes('sikkim university') || l.includes('su') || l.includes('5th mile') || l.includes('6th mile')) return '5th Mile';
  if (l.includes('mg marg') || l.includes('mall road')) return 'MG Marg';
  if (l.includes('ropeway')) return 'Deorali';
  const match = CITIES.find(c => c.toLowerCase() === l);
  return match || loc;
};

export default function FindPG() {
  const { getApprovedPGs } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const getInitialFilters = (params) => {
    const rawLoc = params.get('location') || params.get('locality') || '';
    const loc = normalizeLocation(rawLoc);
    const minP = params.get('minPrice') || '';
    const maxP = params.get('maxPrice') || '';
    const room = params.get('roomType') || '';
    const gen = params.get('gender') || '';
    return {
      location: loc,
      minPrice: minP,
      maxPrice: maxP,
      roomType: room,
      gender: gen,
      amenities: [],
    };
  };

  const hasIncomingAiQuery = Boolean(searchParams.get('query') || searchParams.get('q'));
  const initialQuery = searchParams.get('query') || searchParams.get('q') || '';
  const initialLoc = normalizeLocation(searchParams.get('location') || searchParams.get('locality') || '');

  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));
  const [sort, setSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(initialQuery || initialLoc || '');
  const [isAiSearching, setIsAiSearching] = useState(hasIncomingAiQuery);
  const [aiAppliedTag, setAiAppliedTag] = useState(null);
  const lastProcessedParamsRef = useRef('');

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Sync with incoming URL parameters on mount or when URL changes
  useEffect(() => {
    const currentParamStr = searchParams.toString();
    if (currentParamStr === lastProcessedParamsRef.current) return;
    lastProcessedParamsRef.current = currentParamStr;

    const rawQuery = searchParams.get('query') || searchParams.get('q');
    const rawLoc = searchParams.get('location') || searchParams.get('locality') || '';
    const loc = normalizeLocation(rawLoc);
    const minP = searchParams.get('minPrice') || '';
    const maxP = searchParams.get('maxPrice') || '';
    const room = searchParams.get('roomType') || '';
    const gen = searchParams.get('gender') || '';

    if (rawQuery && rawQuery.trim()) {
      const decoded = decodeURIComponent(rawQuery).trim();
      setSearchQuery(decoded);
      handleAiSearch(decoded, false);
    } else {
      setIsAiSearching(false);
      setFilters({
        location: loc,
        minPrice: minP,
        maxPrice: maxP,
        roomType: room,
        gender: gen,
        amenities: [],
      });
      setAiAppliedTag(null);
      if (loc) {
        setSearchQuery(loc);
      } else {
        setSearchQuery('');
      }
    }
  }, [searchParams]);

  const allPGs = getApprovedPGs();

  const filtered = useMemo(() => {
    let result = [...allPGs];

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      const isIcfai = loc.includes('icfai');
      const isManipal = loc.includes('manipal') || loc.includes('majitar') || loc.includes('smit');
      result = result.filter(pg => {
        const city = (pg.location?.city || pg.city || '').toLowerCase();
        const area = (pg.location?.area || pg.locality || pg.area || '').toLowerCase();
        const title = (pg.title || '').toLowerCase();
        const addr = (pg.location?.address || pg.address || '').toLowerCase();
        const desc = (pg.description || '').toLowerCase();

        if (isIcfai) {
          if (
            city.includes('gangtok') ||
            area.includes('gangtok') ||
            area.includes('sichey') ||
            area.includes('ranka') ||
            title.includes('icfai') ||
            addr.includes('icfai') ||
            desc.includes('icfai')
          ) {
            return true;
          }
        }

        if (isManipal) {
          if (
            area.includes('majitar') ||
            city.includes('majitar') ||
            title.includes('smit') ||
            title.includes('manipal') ||
            addr.includes('smit') ||
            addr.includes('manipal') ||
            desc.includes('smit') ||
            desc.includes('manipal')
          ) {
            return true;
          }
        }

        return city.includes(loc) || area.includes(loc) || title.includes(loc) || addr.includes(loc) || desc.includes(loc);
      });
    }

    if (filters.minPrice) {
      const min = Number(filters.minPrice);
      if (!isNaN(min) && min > 0) result = result.filter(pg => pg.price >= min);
    }
    if (filters.maxPrice) {
      const max = Number(filters.maxPrice);
      if (!isNaN(max) && max > 0) result = result.filter(pg => pg.price <= max);
    }
    if (filters.roomType) {
      result = result.filter(pg => pg.roomType === filters.roomType);
    }
    if (filters.gender) {
      const target = filters.gender.toLowerCase();
      if (target === 'homestay') {
        result = result.filter(pg => {
          const t = (pg.title || '').toLowerCase();
          const d = (pg.description || '').toLowerCase();
          return t.includes('homestay') || d.includes('homestay');
        });
      } else {
        result = result.filter(pg => {
          const pref = (pg.genderPreference || '').toLowerCase();
          return pref === target || pref === 'co-ed' || target === 'co-ed';
        });
      }
    }
    if (filters.amenities.length > 0) {
      result = result.filter(pg => filters.amenities.every(a => pg.amenities?.includes(a)));
    }

    switch (sort) {
      case 'price_low': result.sort((a, b) => a.price - b.price); break;
      case 'price_high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.averageRating - a.averageRating); break;
      default: result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [allPGs, filters, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const setFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);

    const params = new URLSearchParams(searchParams);
    if (val) params.set(key, val);
    else params.delete(key);
    lastProcessedParamsRef.current = params.toString();
    setSearchParams(params);
  };

  const toggleAmenity = (a) => {
    const updated = filters.amenities.includes(a)
      ? filters.amenities.filter(x => x !== a)
      : [...filters.amenities, a];

    setFilter('amenities', updated);
  };

  const clearFilters = () => {
    setFilters({ location: '', minPrice: '', maxPrice: '', roomType: '', gender: '', amenities: [] });
    setSearchQuery('');
    setAiAppliedTag(null);
    setIsAiSearching(false);
    lastProcessedParamsRef.current = '';
    setSearchParams({});
    setPage(1);
  };

  const handleNormalSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      clearFilters();
      return;
    }

    const isNaturalQuery = /(?:under|below|budget|with|wifi|wi-fi|food|geyser|water|boys|girls|single|double|triple|near|icfai|smit)/i.test(query);
    if (isNaturalQuery) {
      handleAiSearch(query);
      return;
    }

    const loc = normalizeLocation(query);
    setAiAppliedTag(null);
    setIsAiSearching(false);
    setFilters({
      location: loc,
      minPrice: '',
      maxPrice: '',
      roomType: '',
      gender: '',
      amenities: [],
    });
    setPage(1);

    const params = new URLSearchParams();
    if (loc) params.set('location', loc);
    lastProcessedParamsRef.current = params.toString();
    setSearchParams(params);
    toast.success(`Showing results for "${loc || query}"`);
  };

  const handleAiSearch = async (queryOverride, syncParams = true) => {
    const textToSearch = (typeof queryOverride === 'string' ? queryOverride : searchQuery).trim();
    if (!textToSearch) return;

    if (typeof queryOverride === 'string') {
      setSearchQuery(queryOverride);
    }

    setIsAiSearching(true);
    try {
      const parsed = await parseSearchQueryWithAI(textToSearch);
      const loc = normalizeLocation(parsed.location || '');

      const newFilters = {
        location: loc,
        minPrice: '',
        maxPrice: parsed.maxPrice ? String(parsed.maxPrice) : '',
        roomType: parsed.roomType || '',
        gender: parsed.genderPreference || '',
        category: '',
        amenities: parsed.amenities || [],
      };

      setFilters(newFilters);
      setPage(1);

      if (syncParams) {
        const params = new URLSearchParams();
        if (newFilters.location) params.set('location', newFilters.location);
        if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
        if (newFilters.gender) params.set('gender', newFilters.gender);
        if (newFilters.roomType) params.set('roomType', newFilters.roomType);
        lastProcessedParamsRef.current = params.toString();
        setSearchParams(params);
      }

      const summaryParts = [];
      if (loc) summaryParts.push(`📍 ${loc}`);
      if (parsed.genderPreference) summaryParts.push(`👤 ${parsed.genderPreference}`);
      if (parsed.roomType) summaryParts.push(`🛏️ ${parsed.roomType}`);
      if (parsed.maxPrice) summaryParts.push(`💰 Max ₹${Number(parsed.maxPrice).toLocaleString('en-IN')}`);
      if (parsed.amenities?.length) summaryParts.push(`✨ ${parsed.amenities.join(', ')}`);

      setAiAppliedTag(summaryParts.join(' • ') || textToSearch);
    } catch (err) {
      console.error('AI search error:', err);
      toast.error('Could not parse AI search');
    } finally {
      setIsAiSearching(false);
    }
  };

  const clearAiFilters = () => {
    setAiAppliedTag(null);
    clearFilters();
  };

  const activeFilterCount =
    [filters.location, filters.minPrice, filters.maxPrice, filters.roomType, filters.gender].filter(Boolean).length +
    filters.amenities.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 pt-16">

      {/* UNIFIED HERO & BORDERLESS INTERACTIVE SEARCH */}
      <div className="pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Subtle pill badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 text-primary-700 text-xs font-semibold mb-3 shadow-xs">
            <Sparkles size={13} className="text-primary-600 animate-pulse" />
            <span>AI-Powered Smart PG Discovery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Find Your Ideal PG 🏡
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-6">
            Search normally by city or area, or use AI natural language to find verified PGs matching your exact budget & preferences.
          </p>

          {/* SINGLE BORDERLESS INTERACTIVE SEARCH CONTAINER */}
          <div className="relative group max-w-3xl mx-auto">
            {/* Ambient Background Glow */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500/15 via-[#0f2547]/10 to-amber-500/15 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-500 pointer-events-none" />

            {/* Elevated Borderless Search Bar */}
            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/70 hover:shadow-2xl hover:shadow-amber-100/40 p-2 sm:p-2.5 transition-all duration-300">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNormalSearch();
                }}
                className="flex flex-col md:flex-row items-stretch md:items-center gap-2"
              >
                {/* Search Input & Icons */}
                <div className="flex-1 flex items-center gap-3 px-3 py-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 text-[#0f2547] shadow-xs">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search area (e.g. Near ICFAI University), or ask AI: 'Boys PG under 6000 with WiFi'..."
                    style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                    className="w-full bg-transparent text-sm sm:text-base border-0 border-none outline-none focus:outline-none focus:ring-0 focus:border-0 text-slate-800 placeholder:text-slate-400 font-normal shadow-none ring-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilter('location', '');
                        setAiAppliedTag(null);
                      }}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                      title="Clear text"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Dual Search Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0 px-1 pb-1 md:pb-0">
                  {/* Normal Search Button */}
                  <button
                    type="button"
                    onClick={handleNormalSearch}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shadow-xs border-0"
                    title="Normal search by keyword or location"
                  >
                    <Search size={14} className="text-slate-500" />
                    <span>Search</span>
                  </button>

                  {/* AI Search Button */}
                  <button
                    type="button"
                    onClick={() => handleAiSearch()}
                    disabled={!searchQuery.trim() || isAiSearching}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#f5a623] bg-[#0f2547] hover:bg-[#0b192c] border border-amber-400/40 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-0"
                    title="Smart Search using Gemini AI"
                  >
                    {isAiSearching ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-[#f5a623]" />
                        <span>AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-[#f5a623]" />
                        <span>AI Search</span>
                      </>
                    )}
                  </button>

                  {/* Mobile Filters Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className="lg:hidden inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors relative border-0"
                    title="Toggle filters"
                  >
                    <SlidersHorizontal size={14} />
                    <span>Filters</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Interactive Suggestion Chips with Color Badges */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700 font-semibold text-[11px] shadow-xs">
              <Sparkles size={12} className="text-primary-600" />
              Quick prompts:
            </span>
            {[
              {
                text: 'Rooms & PG near ICFAI University',
                label: 'Near ICFAI University',
                icon: '🎓',
                bg: 'bg-blue-100 hover:bg-blue-200/90 text-blue-900',
              },
              {
                text: 'Boys PG in Majitar under 8000',
                label: 'Boys PG in Majitar under ₹8k',
                icon: '🏫',
                bg: 'bg-indigo-100 hover:bg-indigo-200/90 text-indigo-900',
              },
              {
                text: 'Girls PG in 5th Mile with food',
                label: 'Girls PG in 5th Mile with Food',
                icon: '🌸',
                bg: 'bg-rose-100 hover:bg-rose-200/90 text-rose-900',
              },
              {
                text: 'Single room in Tadong with WiFi',
                label: 'Single room in Tadong with WiFi',
                icon: '📶',
                bg: 'bg-amber-100 hover:bg-amber-200/90 text-amber-950',
              },
              {
                text: 'Near SMIT Majitar',
                label: 'Near SMIT Majitar Campus',
                icon: '📍',
                bg: 'bg-emerald-100 hover:bg-emerald-200/90 text-emerald-900',
              },
            ].map((chip) => (
              <button
                key={chip.text}
                type="button"
                onClick={() => {
                  setSearchQuery(chip.text);
                  handleAiSearch(chip.text);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border-0 shadow-xs ${chip.bg}`}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Active AI Applied Filter Tag */}
          {aiAppliedTag && (
            <div className="mt-3.5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-900 text-xs font-medium shadow-xs">
              <Sparkles size={13} className="text-primary-600" />
              <span>
                Active AI Filter: <strong className="text-slate-900">{aiAppliedTag}</strong>
              </span>
              <button
                type="button"
                onClick={clearAiFilters}
                className="ml-1 text-slate-400 hover:text-rose-600 transition-colors"
                title="Clear AI filters"
              >
                <X size={13} />
              </button>
            </div>
          )}

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* SIDEBAR */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-72`}>
            <div className="bg-white rounded-2xl shadow-sm p-6">

              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-900">Filters</h3>

                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-primary-600 flex items-center gap-1 font-medium">
                      <X size={12} /> Clear
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Close filters"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <FilterSection title="Location">
                <select
                  value={filters.location}
                  onChange={e => {
                    setFilter('location', e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  className="input-field text-sm"
                >
                  <option value="">All Locations</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FilterSection>

              <FilterSection title="Price Range">
                <div className="flex gap-2">
                  <input type="number" placeholder="Min ₹" value={filters.minPrice} onChange={e => setFilter('minPrice', e.target.value)} className="input-field text-sm w-1/2" />
                  <input type="number" placeholder="Max ₹" value={filters.maxPrice} onChange={e => setFilter('maxPrice', e.target.value)} className="input-field text-sm w-1/2" />
                </div>
              </FilterSection>

              <FilterSection title="Room Type">
                {['', 'Single', 'Double', 'Triple'].map(rt => (
                  <label key={rt} className="flex items-center gap-2 mb-2">
                    <input type="radio" checked={filters.roomType === rt} onChange={() => setFilter('roomType', rt)} />
                    <span className="text-sm">{rt || 'All'}</span>
                  </label>
                ))}
              </FilterSection>

              <FilterSection title="Gender Preference">
                {['', 'Boys', 'Girls', 'Co-ed'].map(g => (
                  <label key={g} className="flex items-center gap-2 mb-2">
                    <input type="radio" checked={filters.gender === g} onChange={() => setFilter('gender', g)} />
                    <span className="text-sm">{g || 'All'}</span>
                  </label>
                ))}
              </FilterSection>

              <FilterSection title="Amenities" last>
                <div className="grid grid-cols-2 gap-y-2">
                  {AMENITY_LIST.map(a => (
                    <label key={a} className="flex items-center gap-2">
                      <input type="checkbox" checked={filters.amenities.includes(a)} onChange={() => toggleAmenity(a)} />
                      <span className="text-sm">{a}</span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Mobile apply and close button */}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="lg:hidden w-full btn-primary text-sm py-3 mt-4 flex items-center justify-center font-medium"
              >
                Apply & View ({filtered.length} Results)
              </button>
            </div>
          </aside>

          {/* RESULTS */}
          <main className="flex-1">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
              <p className="text-slate-600 text-sm">
                {isAiSearching ? (
                  <span className="inline-flex items-center gap-2 text-[#0f2547] font-bold animate-pulse">
                    <Sparkles size={16} className="text-[#f5a623] animate-spin" />
                    <span>Alaya AI is analyzing Sikkim PG listings...</span>
                  </span>
                ) : (
                  <>Showing <span className="font-semibold text-slate-900">{filtered.length}</span> properties</>
                )}
              </p>

              <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm w-full sm:w-auto">
                <option value="newest">Newest</option>
                <option value="price_low">Low to High</option>
                <option value="price_high">High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {isAiSearching ? (
              <div className="space-y-6">
                {/* Stay-Aalaya Themed AI Searching Effect Banner */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081528] via-[#0f2547] to-[#1c3a66] border border-amber-400/40 p-7 sm:p-9 text-center text-white shadow-2xl">
                  {/* Atmospheric Glow & Shimmer */}
                  <div className="absolute -inset-1.5 bg-radial from-amber-500/20 via-transparent to-transparent opacity-75 blur-2xl animate-pulse pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    {/* Glowing AI Radar Icon */}
                    <div className="relative mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center text-[#f5a623] shadow-xl shadow-amber-500/20">
                        <Sparkles size={32} className="text-[#f5a623] animate-spin" style={{ animationDuration: '6s' }} />
                      </div>
                      <span className="absolute -inset-2 rounded-3xl border-2 border-amber-400/30 animate-ping pointer-events-none" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[#f5a623] text-xs font-extrabold uppercase tracking-wider mb-2.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
                      Stay-Aalaya AI Smart Filter
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                      Matching Verified Sikkim Stays...
                    </h3>

                    <p className="text-slate-300 text-xs sm:text-sm max-w-lg mx-auto mb-5 font-normal">
                      AI is parsing <span className="text-[#f5a623] font-semibold">"{searchQuery || 'your requirements'}"</span> and matching student PGs & homestays across Sikkim.
                    </p>

                    {/* Dynamic Scanning Step Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 font-semibold flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-[#f5a623]" /> Locating Campus / Area
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 font-semibold flex items-center gap-1.5 animate-pulse" style={{ animationDelay: '200ms' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Checking Student Budget
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-200 font-semibold flex items-center gap-1.5 animate-pulse" style={{ animationDelay: '400ms' }}>
                        <span className="w-2 h-2 rounded-full bg-sky-400" /> Verifying Amenities & Food
                      </span>
                    </div>
                  </div>
                </div>

                {/* Themed Skeleton Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm animate-pulse space-y-3">
                      <div className="h-44 bg-slate-200/80 rounded-xl" />
                      <div className="h-4 bg-slate-200/80 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-amber-100/80 rounded w-1/3" />
                        <div className="h-8 bg-slate-200/80 rounded-lg w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : paginated.length === 0 ? (
              <EmptyState
                title="No PGs found"
                message="Try adjusting your filters."
                icon={Search}
                actionLabel="Clear Filters"
                onAction={clearFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginated.map(pg => <PGCard key={pg.id} pg={pg} />)}
                </div>
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
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
    <div className={`${last ? '' : 'border-b border-slate-100 pb-5 mb-5'}`}>
      <button onClick={() => setOpen(!open)} className="flex justify-between w-full mb-3">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown size={15} className={`${open ? 'rotate-180' : ''}`} />
      </button>
      {open && children}
    </div>
  );
}