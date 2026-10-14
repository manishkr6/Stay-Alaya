import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Search, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../hooks/useData';
import PGCard from '../components/ui/PGCard';
import { SkeletonCard, EmptyState, Pagination } from '../components/ui/index.jsx';
import { parseSearchQueryWithAI } from '../services/aiService';

const AMENITY_LIST = ['WiFi', 'Food', 'AC', 'Parking', 'Laundry', 'CCTV', 'Water', 'Gym'];
const CITIES = ['Gangtok', 'Singtam', 'Namchi', 'Jorethang', 'Gyalshing', 'Mangan', 'Ravangla', 'Pakyong', 'Rangpo'];
const PER_PAGE = 9;

export default function FindPG() {
  const { getApprovedPGs } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    location: searchParams.get('location') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    roomType: '',
    gender: '',
    amenities: [],
  });

  const [sort, setSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(filters.location || '');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiAppliedTag, setAiAppliedTag] = useState(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const allPGs = getApprovedPGs();

  const filtered = useMemo(() => {
    let result = [...allPGs];

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter(pg =>
        pg.location.city.toLowerCase().includes(loc) ||
        pg.location.area.toLowerCase().includes(loc) ||
        (pg.title && pg.title.toLowerCase().includes(loc))
      );
    }

    if (filters.minPrice) result = result.filter(pg => pg.price >= Number(filters.minPrice));
    if (filters.maxPrice) result = result.filter(pg => pg.price <= Number(filters.maxPrice));
    if (filters.roomType) result = result.filter(pg => pg.roomType === filters.roomType);
    if (filters.gender) result = result.filter(pg => pg.genderPreference === filters.gender);
    if (filters.amenities.length > 0)
      result = result.filter(pg => filters.amenities.every(a => pg.amenities.includes(a)));

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
    setSearchParams({});
    setPage(1);
  };

  const handleNormalSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    setFilter('location', query);
    setAiAppliedTag(null);
    if (query) {
      toast.success(`Showing results for "${query}"`);
    } else {
      toast.success('Showing all listings');
    }
  };

  const handleAiSearch = async (queryOverride) => {
    const textToSearch = (typeof queryOverride === 'string' ? queryOverride : searchQuery).trim();
    if (!textToSearch || isAiSearching) return;

    if (typeof queryOverride === 'string') {
      setSearchQuery(queryOverride);
    }

    setIsAiSearching(true);
    try {
      const parsed = await parseSearchQueryWithAI(textToSearch);

      const newFilters = {
        location: parsed.location || '',
        minPrice: '',
        maxPrice: parsed.maxPrice ? String(parsed.maxPrice) : '',
        roomType: parsed.roomType || '',
        gender: parsed.genderPreference || '',
        amenities: parsed.amenities || [],
      };

      setFilters(newFilters);
      setPage(1);

      const params = new URLSearchParams();
      if (newFilters.location) params.set('location', newFilters.location);
      if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
      setSearchParams(params);

      const summaryParts = [];
      if (parsed.location) summaryParts.push(`📍 ${parsed.location}`);
      if (parsed.genderPreference) summaryParts.push(`👤 ${parsed.genderPreference}`);
      if (parsed.roomType) summaryParts.push(`🛏️ ${parsed.roomType}`);
      if (parsed.maxPrice) summaryParts.push(`💰 Max ₹${parsed.maxPrice.toLocaleString('en-IN')}`);
      if (parsed.amenities?.length) summaryParts.push(`✨ ${parsed.amenities.join(', ')}`);

      setAiAppliedTag(summaryParts.join(' • ') || textToSearch);
      toast.success(parsed.isAi ? 'Gemini AI search applied!' : 'Smart search filters applied!');
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
            <div className="absolute -inset-1.5 bg-gradient-to-r from-primary-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-500 pointer-events-none" />

            {/* Elevated Borderless Search Bar */}
            <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/70 hover:shadow-2xl hover:shadow-indigo-100/50 p-2 sm:p-2.5 transition-all duration-300">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleNormalSearch();
                }}
                className="flex flex-col md:flex-row items-stretch md:items-center gap-2"
              >
                {/* Search Input & Icons */}
                <div className="flex-1 flex items-center gap-3 px-3 py-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 text-primary-600 shadow-xs">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search area (e.g. Majitar), or ask AI: 'Boys PG under 6000 with WiFi'..."
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
                <div className="flex items-center gap-2 shrink-0 px-1 pb-1 md:pb-0">
                  {/* Normal Search Button */}
                  <button
                    type="button"
                    onClick={handleNormalSearch}
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all shadow-xs border-0"
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
                    className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-0"
                    title="Smart Search using Gemini AI"
                  >
                    {isAiSearching ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-white" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-amber-300 animate-pulse" />
                        <span>Search with AI</span>
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
                text: 'Boys PG in Majitar under 6000',
                label: 'Boys PG in Majitar under ₹6k',
                icon: '🎓',
                bg: 'bg-indigo-100 hover:bg-indigo-200/90 text-indigo-900',
              },
              {
                text: 'Girls PG in Tadong with food',
                label: 'Girls PG in Tadong with Food',
                icon: '🌸',
                bg: 'bg-rose-100 hover:bg-rose-200/90 text-rose-900',
              },
              {
                text: 'Single room in Gangtok with WiFi',
                label: 'Single room in Gangtok with WiFi',
                icon: '📶',
                bg: 'bg-amber-100 hover:bg-amber-200/90 text-amber-950',
              },
              {
                text: 'Near SMIT College',
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

                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary-600 flex items-center gap-1">
                    <X size={12} /> Clear
                  </button>
                )}
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

            </div>
          </aside>

          {/* RESULTS */}
          <main className="flex-1">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
              <p className="text-slate-600 text-sm">
                Showing <span className="font-semibold text-slate-900">{filtered.length}</span> properties
              </p>

              <select value={sort} onChange={e => setSort(e.target.value)} className="input-field text-sm w-full sm:w-auto">
                <option value="newest">Newest</option>
                <option value="price_low">Low to High</option>
                <option value="price_high">High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>

            {loading ? (
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