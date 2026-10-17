import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Star,
  Phone,
  ArrowRight,
  Users,
  MapPin,
  Building2,
  CheckCircle2,
  Sparkles,
  Search,
  Bed,
  Sliders,
  ChevronDown,
  Zap,
  Utensils,
  Award,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { useData } from '../hooks/useData';
import PGCard from '../components/ui/PGCard';

const SIKKIM_LOCALITIES = [
  { id: '', label: 'All Sikkim (Gangtok, Namchi...)' },
  { id: 'Tadong', label: 'Tadong (SMIMS & Gangtok)' },
  { id: 'Majitar', label: 'Majitar (SMIT Campus)' },
  { id: '5th Mile', label: '5th Mile (Sikkim University)' },
  { id: 'Deorali', label: 'Deorali Bazaar' },
  { id: 'MG Marg', label: 'MG Marg (Central Promenade)' },
  { id: 'Namchi', label: 'Namchi (South Sikkim)' },
];

const RESIDENCE_TYPES = [
  { id: '', label: 'All Types (PG & Rooms)' },
  { id: 'Boys', label: 'Boys PG' },
  { id: 'Girls', label: 'Girls PG' },
  { id: 'Co-ed', label: 'Co-ed Accommodation' },
  { id: 'Homestay', label: 'Traditional Homestay' },
];

const PROMPT_SUGGESTIONS = [
  'Single room near SMIT Majitar with food & wifi under 7000',
  'Girls PG near Sikkim University 5th Mile with winter geyser',
  'Co-ed room in Tadong within 2 mins of taxi stand',
];

const AI_INSTANT_PROMPTS = [
  { icon: '✨', text: 'Sunny room in Tadong under ₹7,000' },
  { icon: '🌸', text: 'Girls PG in 5th Mile under ₹5,000' },
  { icon: '🎓', text: 'Boys PG near SMIT Majitar under ₹8,000' },
  { icon: '🏔️', text: 'Mountain view Homestay near MG Marg' },
];

export default function Home() {
  const { getApprovedPGs } = useData();
  const navigate = useNavigate();

  // Search state
  const [searchTab, setSearchTab] = useState('standard'); // 'standard' | 'ai'
  const [selectedLocality, setSelectedLocality] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [maxBudget, setMaxBudget] = useState(15000);
  const [aiPrompt, setAiPrompt] = useState('');

  // Curated Residences state
  const [activeCategory, setActiveCategory] = useState('All PGs');
  const [activeArea, setActiveArea] = useState('All Sikkim');
  const [includeMess, setIncludeMess] = useState(false);
  const [sortByTaxi, setSortByTaxi] = useState(false);

  // How It Works interactive step selection
  const [activeStep, setActiveStep] = useState(1);

  // Guarantee / Trust modal state
  const [trustModal, setTrustModal] = useState(null);

  // All approved listings from data context
  const approvedPGs = getApprovedPGs() || [];

  // Filter listings for the Featured Residences section (Top 6 highest rated real PGs)
  const filteredPGs = useMemo(() => {
    let list = [...approvedPGs];

    if (activeCategory !== 'All PGs') {
      list = list.filter((p) => {
        if (activeCategory === 'Homestay') {
          const t = (p.title || '').toLowerCase();
          const d = (p.description || '').toLowerCase();
          return t.includes('homestay') || d.includes('homestay');
        }
        const cat = p.category || p.genderPreference || '';
        return cat.toLowerCase() === activeCategory.toLowerCase();
      });
    }

    if (activeArea !== 'All Sikkim') {
      list = list.filter((p) => {
        const area = p.locality || p.location?.area || '';
        return area.toLowerCase().includes(activeArea.toLowerCase());
      });
    }

    if (sortByTaxi) {
      list.sort((a, b) => {
        const distA = typeof a.distance_to_taxi === 'number' ? a.distance_to_taxi : parseInt(a.distance_to_taxi) || 5;
        const distB = typeof b.distance_to_taxi === 'number' ? b.distance_to_taxi : parseInt(b.distance_to_taxi) || 5;
        return distA - distB;
      });
    } else {
      // Sort strictly by highest rating first.
      // If ratings are tied or if PGs have no ratings (rating === 0), fall back to newest created.
      list.sort((a, b) => {
        const ratingA = Number(a.averageRating ?? a.rating ?? 0);
        const ratingB = Number(b.averageRating ?? b.rating ?? 0);

        // Primary: highest rating first
        if (ratingB !== ratingA) {
          return ratingB - ratingA;
        }

        const reviewsA = Number(a.totalReviews ?? a.total_reviews ?? 0);
        const reviewsB = Number(b.totalReviews ?? b.total_reviews ?? 0);

        // Secondary: highest review count
        if (reviewsB !== reviewsA) {
          return reviewsB - reviewsA;
        }

        // Tertiary: newest created (used if ratings are tied or if none have ratings)
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    // Only display the top 6 PGs
    return list.slice(0, 6);
  }, [approvedPGs, activeCategory, activeArea, sortByTaxi]);

  const avgRatingDisplay = useMemo(() => {
    if (!approvedPGs.length) return '4.8';
    const sum = approvedPGs.reduce((acc, p) => acc + Number(p.averageRating || p.rating || 0), 0);
    const avg = sum / approvedPGs.length;
    return avg.toFixed(1);
  }, [approvedPGs]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchTab === 'ai') {
      const q = aiPrompt.trim();
      if (q) {
        navigate(`/find-pg?query=${encodeURIComponent(q)}`);
      } else {
        navigate('/find-pg');
      }
      return;
    }

    const params = new URLSearchParams();
    if (selectedLocality) {
      params.set('location', selectedLocality);
      params.set('locality', selectedLocality);
    }
    if (selectedType) {
      if (['Boys', 'Girls', 'Co-ed', 'Homestay'].includes(selectedType)) {
        params.set('gender', selectedType);
      }
    }
    if (maxBudget && Number(maxBudget) < 15000) {
      params.set('maxPrice', String(maxBudget));
    }

    navigate(`/find-pg?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#f5a623] selection:text-[#0f2547]">
      {/* ========================================================
          1. HERO SECTION (Screenshot 1: Himalayan Sunset Mountain)
          ======================================================== */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden min-h-[90vh] flex flex-col justify-center">
        {/* Mountain Background Photo with Himalayan Atmosphere */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=2000&q=85"
            alt="Kanchenjunga Sikkim Himalayas"
            className="w-full h-full object-cover object-center filter brightness-[0.62] contrast-[1.12]"
          />
          {/* Deep Navy Atmospheric Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b192c]/85 via-[#0f2547]/50 to-[#0b192c]/90" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Top Tagline Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-500/60 backdrop-blur-md border border-white/15 text-[8px] md:text-sm  text-slate-200 mb-6 shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
            <span className="font-semibold text-white">#1 AI-Powered PG & Room Finder in Sikkim</span>
            <span className="text-slate-400">•</span>
            <span className="text-[#f5a623] font-bold">Zero Brokerage</span>
          </div>

          {/* Hero Headline */}
          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Find Your Perfect Rooms & PGs in <br className="hidden sm:inline" />
            <span className="text-[#f5a623]">Sikkim</span>
          </h1>

          {/* Centered Subtitle Translucent Card */}
          <div className="max-w-2xl mx-auto bg-slate-950/40 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 mb-8 text-slate-200 text-sm sm:text-md leading-relaxed shadow-lg">
            Discover verified paying guest accommodations and rooms across{' '}
            <strong className="text-white">Gangtok, Tadong, Deorali, Majitar, and Namchi</strong>. Connect
            directly with owners—zero brokerage.
          </div>

          {/* Frosted Dark Navy Search Console Box */}
          <div className="max-w-4xl mx-auto bg-[#4c5364]/50 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-4 sm:p-6 shadow-2xl text-left">
            {/* Console Header: Tabs + Live Better Tag */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSearchTab('standard')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    searchTab === 'standard'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white hover:text-white bg-slate-800/80 hover:bg-slate-700/80'
                  }`}
                >
                  <Sliders size={14} className="text-[#f5a623]" />
                  <span>Standard Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTab('ai')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    searchTab === 'ai'
                      ? 'bg-[#f5a623] text-slate-950 shadow-sm'
                      : 'text-white bg-slate-800/80 hover:bg-slate-700/80'
                  }`}
                >
                  <Sparkles size={14} className={searchTab === 'ai' ? 'text-slate-950 stroke-[2.5]' : 'text-white'} />
                  <span>AI Smart Finder</span>
                </button>
              </div>

              {/* Tagline right */}
              <div className="text-[11px] font-bold tracking-wider uppercase text-slate-300 flex items-center gap-2.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Search size={12} className="text-slate-400 stroke-[2.5]" /> FIND BETTER
                </span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1.5 text-[#f5a623]">
                  <Bed size={13} className="text-[#f5a623] stroke-[2.5]" /> STAY BETTER
                </span>
                <span className="text-slate-500">•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-red-500 text-xs leading-none">❤️</span> LIVE BETTER
                </span>
              </div>
            </div>

            {/* Standard Search Form */}
            {searchTab === 'standard' ? (
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="bg-white rounded-3xl p-2.5 sm:p-3 shadow-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.15fr)_minmax(0,1fr)_auto] gap-2.5 sm:gap-3 items-center w-full">
                  {/* Segment 1: Sikkim Locality */}
                  <div className="relative border border-slate-200/90 rounded-2xl px-3 py-2.5 flex items-center gap-2 bg-white hover:border-slate-300 transition-colors min-w-0">
                    <MapPin size={20} className="text-[#f5a623] shrink-0 stroke-2" />
                    <div className="flex-1 min-w-0 pr-1">
                      <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-1">
                        SIKKIM LOCALITY
                      </span>
                      <span className="block text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                        {SIKKIM_LOCALITIES.find((loc) => loc.id === selectedLocality)?.label ||
                          'All Sikkim (Gangtok, Namchi...)'}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-slate-600 shrink-0" />
                    <select
                      value={selectedLocality}
                      onChange={(e) => setSelectedLocality(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 border-0 outline-none"
                      aria-label="Sikkim Locality"
                    >
                      {SIKKIM_LOCALITIES.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Segment 2: Residence Type */}
                  <div className="relative border border-slate-200/90 rounded-2xl px-3 py-2.5 flex items-center gap-2 bg-white hover:border-slate-300 transition-colors min-w-0">
                    <Bed size={20} className="text-[#f5a623] shrink-0 stroke-2" />
                    <div className="flex-1 min-w-0 pr-1">
                      <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-1">
                        RESIDENCE TYPE
                      </span>
                      <span className="block text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                        {RESIDENCE_TYPES.find((t) => t.id === selectedType)?.label ||
                          'All Types (PG & Rooms)'}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-slate-600 shrink-0" />
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 border-0 outline-none"
                      aria-label="Residence Type"
                    >
                      {RESIDENCE_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Segment 3: Max Budget Slider */}
                  <div className="px-2 py-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center justify-between text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>MAX BUDGET</span>
                      <span className="text-xs sm:text-sm font-extrabold text-[#0f2547]">
                        {Number(maxBudget) >= 15000 ? 'Any Budget' : `₹${Number(maxBudget).toLocaleString('en-IN')}/mo`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="3500"
                      max="15000"
                      step="500"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(Number(e.target.value))}
                      className="alaya-budget-slider cursor-pointer mt-1.5 w-full"
                      style={{
                        background: `linear-gradient(to right, #f5a623 0%, #f5a623 ${((maxBudget - 3500) / (15000 - 3500)) * 100}%, #334155 ${((maxBudget - 3500) / (15000 - 3500)) * 100}%, #334155 100%)`,
                      }}
                    />
                  </div>

                  {/* Segment 4: Search Action Button */}
                  <div className="w-full lg:w-auto shrink-0 flex items-center justify-end">
                    <button
                      type="submit"
                      className="w-full lg:w-auto shrink-0 bg-[#f5a623] hover:bg-[#e09618] active:scale-95 text-slate-950 font-extrabold text-sm sm:text-base py-3 sm:py-3.5 px-5 sm:px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Search size={18} className="stroke-[2.5]" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* AI Smart Finder Tab (Matches Screenshot Exactly) */
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="bg-white rounded-3xl p-3.5 sm:p-4.5 shadow-xl w-full">
                  {/* Row 1: Search Input & Match Stays Button */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                    {/* Input with Amber Border */}
                    <div className="flex-1 w-full flex items-center gap-3 border border-amber-300 rounded-2xl px-4 py-3 sm:py-3.5 bg-white shadow-2xs focus-within:border-[#f5a623] focus-within:ring-2 focus-within:ring-amber-200/50 transition-all">
                      <Sparkles size={22} className="text-[#f5a623] shrink-0" />
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Try: 'Sunny room in Tadong under ₹6,000 with Wi-Fi and Geyser'..."
                        className="w-full bg-transparent text-slate-800 text-xs sm:text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal outline-none border-0 ring-0 focus:ring-0"
                      />
                    </div>

                    {/* Dark Navy Button with Match Stays and Arrow */}
                    <button
                      type="submit"
                      className="w-full sm:w-auto shrink-0 bg-[#0f2547] hover:bg-[#16335d] active:scale-95 text-[#f5a623] font-extrabold text-sm sm:text-base py-3 sm:py-3.5 px-6 sm:px-7 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <span>Match Stays</span>
                      <ArrowRight size={18} className="text-[#f5a623] stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Row 2: Instant Prompts */}
                  <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-1">
                    <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">
                      Instant Prompts:
                    </span>
                    {AI_INSTANT_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAiPrompt(prompt.text);
                          navigate(`/find-pg?query=${encodeURIComponent(prompt.text)}`);
                        }}
                        className="border border-amber-200/90 bg-amber-50/40 hover:bg-amber-100/70 hover:border-amber-400 text-slate-800 font-bold text-xs rounded-full px-3.5 py-1.5 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <span className="text-sm leading-none">{prompt.icon}</span>
                        <span>{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* Bottom 3 Stats Banner (Exact Match to Target Design) */}
            <div className="grid grid-cols-3 gap-3 pt-6 mt-6 items-center text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-white font-extrabold text-lg sm:text-2xl">
                  <ShieldCheck size={22} className="text-[#f5a623]" />
                  <span>500+</span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  VERIFIED PGS
                </span>
              </div>

              <div className="flex flex-col items-center border border-slate-700/60 rounded-2xl py-2.5 px-3 sm:px-6 bg-slate-800/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-white font-extrabold text-lg sm:text-2xl">
                  <Users size={22} className="text-[#f5a623]" />
                  <span>1,000+</span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  HAPPY STUDENTS
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 text-white font-extrabold text-lg sm:text-2xl">
                  <MapPin size={22} className="text-[#f5a623]" />
                  <span>50+</span>
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  SIKKIM LOCALITIES
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. HOW IT WORKS (Screenshots 2 & 3: Simple Process)
          ======================================================== */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-amber-100 text-amber-900 text-[10.5px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            SIMPLE PROCESS
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0f2547] mb-3"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            How It Works
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto">
            Click any step below to explore how Stay Aalaya eliminates brokerage and guesswork in Sikkim.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Step 1: Search */}
          <div
            onClick={() => setActiveStep(1)}
            className={`bg-white rounded-2xl p-6 sm:p-8 border transition-all duration-300 cursor-pointer flex flex-col items-center text-center shadow-xs ${
              activeStep === 1
                ? 'border-2 border-[#f5a623] shadow-lg shadow-amber-500/10 -translate-y-1'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Step Icon with orange number badge */}
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center shadow-md">
                <Search size={26} className="stroke-[2.5]" />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#f5a623] text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white">
                01
              </span>
            </div>
            <h3
              className="text-xl font-bold text-[#0f2547] mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Search
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
              Filter by Sikkim locality, college walk time, sunlight exposure, or use AI Smart Search.
            </p>
            <span className="mt-auto bg-[#0f2547] text-white text-[11px] font-bold px-4 py-1.5 rounded-full">
              100% Free Search
            </span>
          </div>

          {/* Step 2: Contact */}
          <div
            onClick={() => setActiveStep(2)}
            className={`bg-white rounded-2xl p-6 sm:p-8 border transition-all duration-300 cursor-pointer flex flex-col items-center text-center shadow-xs ${
              activeStep === 2
                ? 'border-2 border-[#f5a623] shadow-lg shadow-amber-500/10 -translate-y-1'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 text-[#0f2547] flex items-center justify-center shadow-xs">
                <Phone size={26} className="stroke-[2.2]" />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#f5a623] text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white">
                02
              </span>
            </div>
            <h3
              className="text-xl font-bold text-[#0f2547] mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Contact
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
              Connect directly with verified Sikkimese property owners via WhatsApp or Call—zero middleman fees.
            </p>
            <span className="mt-auto border border-slate-200 text-slate-600 text-[11px] font-semibold px-4 py-1.5 rounded-full">
              ₹0 Brokerage Guaranteed
            </span>
          </div>

          {/* Step 3: Move In */}
          <div
            onClick={() => setActiveStep(3)}
            className={`bg-white rounded-2xl p-6 sm:p-8 border transition-all duration-300 cursor-pointer flex flex-col items-center text-center shadow-xs ${
              activeStep === 3
                ? 'border-2 border-[#f5a623] shadow-lg shadow-amber-500/10 -translate-y-1'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 text-[#0f2547] flex items-center justify-center shadow-xs">
                <Building2 size={26} className="stroke-[2.2]" />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#f5a623] text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white">
                03
              </span>
            </div>
            <h3
              className="text-xl font-bold text-[#0f2547] mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Move In
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
              Arrive in Sikkim with confidence. Every room matches its verified photos and amenity checklist.
            </p>
            <span className="mt-auto border border-slate-200 text-slate-600 text-[11px] font-semibold px-4 py-1.5 rounded-full">
              Admin Inspected
            </span>
          </div>
        </div>

        {/* Interactive Step Live Preview Box (Screenshot 3) */}
        <div className="bg-[#122b4e] rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
          <div className="space-y-3">
            <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#f5a623] flex items-center gap-1.5">
              <Sparkles size={13} />
              {activeStep === 1
                ? 'STEP 01 LIVE PREVIEW'
                : activeStep === 2
                ? 'STEP 02 LIVE PREVIEW'
                : 'STEP 03 LIVE PREVIEW'}
            </span>
            <h3
              className="text-xl sm:text-2xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {activeStep === 1 && 'Interactive Sikkim Terrain & Amenity Filters'}
              {activeStep === 2 && 'Direct WhatsApp & Call Connect With Verified Hosts'}
              {activeStep === 3 && '14-Point Pre-Move In Guarantee & Room Handover'}
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                <span>Filter by walking time to nearest Taxi Stand (Zero-Stair Access badge)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                <span>Toggle "Include Mess Cost" to see true all-inclusive monthly outgo</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                <span>Check South-Facing Sunlight & Winter Geyser readiness upfront</span>
              </li>
            </ul>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              onClick={() => navigate('/find-pg')}
              className="w-full md:w-auto bg-[#f5a623] hover:bg-[#e09618] active:scale-95 text-[#0f2547] font-extrabold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Try It Now on Live PGs</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. FEATURED RESIDENCES (Screenshot 4: Curated Stays)
          ======================================================== */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#f5a623] block mb-1">
              CURATED STAYS
            </span>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0f2547]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Featured Residences
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Handpicked, physically verified PGs and rooms across Sikkim with transparent monthly rent.
            </p>
          </div>

          {/* Right Controls: Near Me + Mess toggle + View All */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSortByTaxi(!sortByTaxi)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                sortByTaxi
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Zap size={13} className="text-[#f5a623] fill-[#f5a623]" />
              <span>Near Me (Taxi Stand Walk)</span>
            </button>

            {/* Include Mess Food Switch */}
            <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs">
              <Utensils size={13} className="text-[#f5a623]" />
              <span>Include Mess Food</span>
              <input
                type="checkbox"
                checked={includeMess}
                onChange={(e) => setIncludeMess(e.target.checked)}
                className="rounded accent-[#f5a623] cursor-pointer"
              />
            </label>

            <Link
              to="/find-pg"
              className="text-xs font-bold text-[#0f2547] hover:text-[#f5a623] px-2 py-1 flex items-center gap-1 transition-colors"
            >
              <span>View All ({approvedPGs.length})</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-8 pb-3 border-b border-slate-200/80">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {['All PGs', 'Boys', 'Girls', 'Co-ed', 'Homestay'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-[#0f2547] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Localities */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Area:</span>
            {['All Sikkim', 'Tadong', 'Deorali', '5th Mile', 'Majitar', 'MG Marg', 'Namchi'].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setActiveArea(area)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeArea === area
                    ? 'bg-[#f5a623] text-slate-950 shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Column Generous Residences Grid */}
        {filteredPGs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {filteredPGs.map((pg) => (
              <PGCard key={pg.id} pg={pg} includeMess={includeMess} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <p className="text-slate-500 font-medium mb-3">No verified properties found in this filter selection.</p>
            <button
              onClick={() => {
                setActiveCategory('All PGs');
                setActiveArea('All Sikkim');
              }}
              className="text-xs font-bold text-[#0f2547] underline underline-offset-4"
            >
              Reset all filters
            </button>
          </div>
        )}
      </section>

      {/* ========================================================
          4. ABOUT STAY AALAYA SIKKIM & GUARANTEE (Screenshot 5)
          ======================================================== */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main 2-Column Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
          {/* Left Column: Mission & Description */}
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-[10.5px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest">
              <Award size={13} className="text-[#f5a623]" />
              ABOUT STAY AALAYA SIKKIM
            </span>

            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0f2547] leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Built in Gangtok to Make Finding a Home in the Hills Effortless.
            </h2>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              Finding a safe, sunlit room with reliable hot water and Wi-Fi in hilly terrain shouldn't require
              walking up hundreds of stairs or paying hefty broker commissions.{' '}
              <strong className="text-slate-900">Stay Aalaya</strong> connects students at SRM, SMIT, Manipal,
              and working professionals directly with verified Sikkimese homeowners.
            </p>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Link
                to="/find-pg"
                className="bg-[#0f2547] hover:bg-[#16335d] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Explore Verified Stays</span>
                <ArrowRight size={15} />
              </Link>

              <Link
                to="/list-your-pg"
                className="bg-[#f5a623] hover:bg-[#e09618] text-slate-900 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition-all shadow-sm"
              >
                Partner as a Homeowner
              </Link>
            </div>
          </div>

          {/* Right Column: 2x2 Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <span className="text-2xl sm:text-3xl font-black text-[#0f2547] block mb-1">100%</span>
              <h4 className="font-bold text-slate-900 text-sm mb-1">On-Ground Checked</h4>
              <p className="text-xs text-slate-500">Water, geyser & stair access verified.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <span className="text-2xl sm:text-3xl font-black text-[#f5a623] block mb-1">₹0</span>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Brokerage Fee</h4>
              <p className="text-xs text-slate-500">Direct student-to-owner booking.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <span className="text-2xl sm:text-3xl font-black text-[#0f2547] block mb-1">
                {approvedPGs.length || 7} Verified
              </span>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Properties in Sikkim</h4>
              <p className="text-xs text-slate-500">Tadong, Deorali, Majitar, Namchi & MG Marg.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
              <span className="text-2xl sm:text-3xl font-black text-amber-500 block mb-1 flex items-center gap-1">
                {avgRatingDisplay} <Star size={20} className="fill-amber-400 text-amber-400 inline" />
              </span>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Tenant Satisfaction</h4>
              <p className="text-xs text-slate-500">Rated by verified students & interns.</p>
            </div>
          </div>
        </div>

        {/* Why Trust Stay Aalaya Section (Screenshot 1) */}
        <div className="mt-16 pt-8 border-t border-slate-200/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest mb-3 border border-amber-200">
              SIKKIM STANDARD GUARANTEE
            </span>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0f2547] mb-3 tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Why Trust Stay Aalaya?
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto">
              Every listing undergoes a physical 14-point on-ground verification in Gangtok, Tadong, Majitar, and Namchi.
            </p>
          </div>

          {/* 3 Guarantee Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Admin Verified */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#0f2547] text-[#f5a623] flex items-center justify-center mb-5 shadow-xs">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-lg font-bold text-[#0f2547] mb-2.5">Admin Verified</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every PG is physically visited by our Sikkim local team to verify room dimensions, geysers, water storage, and safety before listing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrustModal('check')}
                className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0f2547] hover:text-[#f5a623] transition-colors w-full text-left cursor-pointer"
              >
                <span>View 14-Point Physical Check</span>
                <span className="text-base text-[#f5a623] font-black">+</span>
              </button>
            </div>

            {/* Card 2: Real Reviews */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#f5a623] flex items-center justify-center mb-5 shadow-xs">
                  <Star size={24} className="fill-[#f5a623] text-[#f5a623]" />
                </div>
                <h3 className="text-lg font-bold text-[#0f2547] mb-2.5">Real Reviews</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Honest feedback and ratings exclusively from verified students and working tenants who have actually lived in the property.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrustModal('reviews')}
                className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#f5a623] hover:text-[#0f2547] transition-colors w-full text-left cursor-pointer"
              >
                <span>How We Verify Student Reviews</span>
                <span className="text-base text-[#f5a623] font-black">+</span>
              </button>
            </div>

            {/* Card 3: Direct Contact */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#0f2547] flex items-center justify-center mb-5 shadow-xs">
                  <Phone size={22} />
                </div>
                <h3 className="text-lg font-bold text-[#0f2547] mb-2.5">Direct Contact</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  No middlemen, no hidden commission. Call or WhatsApp verified Sikkimese property owners directly to book your stay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrustModal('savings')}
                className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0f2547] hover:text-[#f5a623] transition-colors w-full text-left cursor-pointer"
              >
                <span>Zero-Brokerage Savings Breakdown</span>
                <span className="text-base text-[#f5a623] font-black">+</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. TESTIMONIALS: What Our Tenants Say (Screenshot 2)
          ======================================================== */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#f5a623] block mb-2">
            TESTIMONIALS
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#0f2547] tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            What Our Tenants Say
          </h2>
        </div>

        {/* 3 Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Testimonial 1 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-[#f5a623]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-[#f5a623] text-[#f5a623]" />
                  ))}
                </div>
                <span className="text-4xl font-serif text-slate-200 select-none leading-none">“</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed mb-6">
                “Moving to Gangtok for my Masters at SRM University was stressful until I used Stay Aalaya. Found a sunny single room in Tadong just 2 minutes from the taxi stand with zero brokerage!”
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                AS
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight">Aarav Sharma</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">M.Sc Student, SRM University Sikkim (Tadong)</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-[#f5a623]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-[#f5a623] text-[#f5a623]" />
                  ))}
                </div>
                <span className="text-4xl font-serif text-slate-200 select-none leading-none">“</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed mb-6">
                “As a female intern at Manipal Hospital, safety and hot water in winter were my biggest priorities. Stay Aalaya's 'Admin Verified' badge is 100% accurate—my Deorali PG feels just like home.”
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                PB
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight">Pema Choden Bhutia</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Medical Intern, SMIMS (5th Mile / Deorali)</p>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-[#f5a623]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-[#f5a623] text-[#f5a623]" />
                  ))}
                </div>
                <span className="text-4xl font-serif text-slate-200 select-none leading-none">“</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed mb-6">
                “We found our off-campus PG opposite SMIT Majitar directly through the owner on Stay Aalaya. The dual Wi-Fi and transparent mess calculator saved me and my roommate ₹12,000 a year!”
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center shrink-0">
                RC
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm leading-tight">Rohan Chatterjee</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">B.Tech CSE, SMIT Majitar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Trust Modal */}
      {trustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-slide-up">
            <button
              onClick={() => setTrustModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {trustModal === 'check' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#0f2547] text-[#f5a623] flex items-center justify-center mb-4">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-xl font-bold text-[#0f2547] mb-2 font-display">
                  14-Point On-Ground Physical Verification
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-4">
                  Before any accommodation gets the verified badge on Stay Aalaya, our Gangtok ground team conducts an on-site inspection:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 max-h-60 overflow-y-auto pr-1">
                  {[
                    '1. Room square footage & window natural sunlight',
                    '2. Winter water geyser heating performance',
                    '3. Dedicated Sintex water storage tank capacity',
                    '4. Road connectivity & uphill stair step count',
                    '5. Tested high-speed Wi-Fi speeds in rooms',
                    '6. Functional plumbing, drainage & clean toilets',
                    '7. Inverter power backup during hill outages',
                    '8. Sturdy bed, mattress, study desk & wardrobe',
                    '9. Secure room lock & building gate safety',
                    '10. Electrical grounding & fire exit clearance',
                    '11. Clean mess kitchen hygiene standards',
                    '12. Filtered RO drinking water availability',
                    '13. Daily garbage disposal system',
                    '14. Verified property owner ID & contact validity',
                  ].map((pt, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-1.5 bg-slate-50 rounded-lg">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trustModal === 'reviews' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#f5a623] flex items-center justify-center mb-4">
                  <Star size={24} className="fill-[#f5a623]" />
                </div>
                <h3 className="text-xl font-bold text-[#0f2547] mb-2 font-display">
                  How We Verify Student Reviews
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-4">
                  Zero fake reviews. Every testimonial on Stay Aalaya comes directly from tenants who have genuinely lived in the property:
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#f5a623] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">Student & Intern ID Matching</strong>
                      <span>Verified with college email domains (SRM, SMU, Sikkim University) or student ID cards.</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#f5a623] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">Minimum 30-Day Stay Validation</strong>
                      <span>Reviews can only be submitted after completing at least one month of residency.</span>
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#f5a623] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900">Unfiltered Host Ratings</strong>
                      <span>Homeowners cannot delete or modify tenant ratings, ensuring complete authenticity.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {trustModal === 'savings' && (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-[#0f2547] flex items-center justify-center mb-4">
                  <Phone size={22} />
                </div>
                <h3 className="text-xl font-bold text-[#0f2547] mb-2 font-display">
                  Zero-Brokerage Direct Host Savings
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-4">
                  In Sikkim, informal room brokers commonly charge students 50% to 100% of one month's rent. Stay Aalaya eliminates all middlemen:
                </p>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between p-2.5 bg-rose-50 rounded-xl text-rose-900 font-medium">
                    <span>Traditional Broker Commission</span>
                    <span className="font-bold line-through">₹4,000 – ₹8,000</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-emerald-50 rounded-xl text-emerald-900 font-bold">
                    <span>Stay Aalaya Platform Fee</span>
                    <span>₹0 (100% Free for Students)</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2 text-slate-600 leading-relaxed">
                    Connect directly on WhatsApp or call with verified Sikkimese homeowners. Schedule physical walk-throughs on your own terms.
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setTrustModal(null)}
              className="mt-6 w-full py-2.5 bg-[#0f2547] text-white rounded-xl text-xs font-bold hover:bg-[#16335d] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          7. FLOATING ASK AALAYA AI WIDGET (Screenshots 1-5 Bottom Right)
          ======================================================== */}
      <aside aria-label="Aalaya AI Assistant Trigger" className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            const aiBtn = document.querySelector('[aria-label="Open AI Assistant"]');
            if (aiBtn) aiBtn.click();
            else navigate('/find-pg');
          }}
          className="bg-[#0f2547] hover:bg-[#16335d] text-[#f5a623] border border-amber-500/40 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-all cursor-pointer"
        >
          <Sparkles size={14} className="text-[#f5a623]" />
          <span className="text-white">Ask Aalaya AI</span>
        </button>
      </aside>
    </div>
  );
}
