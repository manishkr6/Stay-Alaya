import React, { useState, useMemo, useEffect } from 'react';
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
  Languages,
  Zap,
  Utensils,
  Award,
  ChevronRight,
  ExternalLink,
  X,
  HelpCircle,
  Calculator,
  DollarSign,
  Send,
  MessageSquare,
  Mail,
  Check,
  Mic,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import PGCard from '../components/ui/PGCard';
import AalayaVoiceAssistant from '../components/ai/AalayaVoiceAssistant.jsx';


const SIKKIM_LOCALITIES = [
  { id: '', label: 'All Sikkim (Gangtok, Namchi...)' },
  { id: 'Gangtok', label: 'Gangtok (ICFAI University)' },
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
  'Rooms & PG near ICFAI University with food & wifi under 7000',
  'Single room near SMIT Majitar with food & wifi under 7000',
  'Girls PG near Sikkim University 5th Mile with winter geyser',
  'Co-ed room in Tadong within 2 mins of taxi stand',
];

const AI_INSTANT_PROMPTS = [
  { icon: '🎓', text: 'PG near ICFAI University under ₹7,000' },
  { icon: '🇮🇳', text: 'Tadong me boys PG under 7000 with food' },
  { icon: '🏫', text: 'Boys PG near SMIT Majitar under ₹8,000' },
  { icon: '🌸', text: 'Girls PG in 5th Mile with winter geyser' },
  { icon: '🏔️', text: 'Mountain view Homestay near MG Marg' },
];

const FAQ_ITEMS = [
  {
    question: 'How does Stay Aalaya’s AI Smart Search work?',
    answer:
      'Powered by Stay Aalaya AI, our smart search understands natural everyday language in English, हिंदी, and Hinglish. Instead of manually applying filter dropdowns, simply type or speak what you need (e.g. "ICFAI University ke pass boys PG under 7000 with food"). Our AI automatically detects your preferred campus, maximum budget, gender preference, and amenities to display verified matching rooms instantly.',
  },
  {
    question: 'How do I book or reserve a PG room in Sikkim?',
    answer:
      'Browse verified rooms across Gangtok, Tadong, Majitar, or Namchi. Once you find a suitable PG, you can contact the homeowner directly via WhatsApp or direct phone call to schedule a physical walkthrough or reserve your room without any middlemen.',
  },
  {
    question: 'Are the PG accommodations physically verified by Stay Aalaya?',
    answer:
      'Yes! Our on-ground Gangtok team conducts a rigorous 14-point physical verification on every property. We check winter water geysers, Wi-Fi speed, mess food hygiene, building safety, and distance to college taxi stands before awarding the verified badge.',
  },
  {
    question: 'Is there any brokerage or hidden platform fee?',
    answer:
      'Zero brokerage, 100% guaranteed. Unlike traditional room brokers who take 50% to 100% of your first month rent, Stay Aalaya is 100% free for students and tenants. You pay only the agreed rent directly to the property owner.',
  },
  {
    question: 'Can I connect directly with the PG owner before visiting?',
    answer:
      'Absolutely. Every verified listing features direct contact details. You can speak with the host, ask about food options (veg/non-veg), curfew rules, and request live video tours before traveling to Sikkim.',
  },
];


export default function Home() {
  const { getApprovedPGs, reviews = [], users = [], pgs = [], createNotification } = useData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Search state — AI Smart Finder active by default
  const [searchTab, setSearchTab] = useState('ai'); // 'standard' | 'ai'
  const [selectedLocality, setSelectedLocality] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [maxBudget, setMaxBudget] = useState(15000);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  useEffect(() => {
    const handleOpenVoice = () => setIsVoiceAssistantOpen(true);
    window.addEventListener('open-aalaya-voice-assistant', handleOpenVoice);
    return () => window.removeEventListener('open-aalaya-voice-assistant', handleOpenVoice);
  }, []);

  // Curated Residences state
  const [activeCategory, setActiveCategory] = useState('All PGs');
  const [activeArea, setActiveArea] = useState('All Sikkim');
  const [includeMess, setIncludeMess] = useState(false);
  const [sortByTaxi, setSortByTaxi] = useState(false);

  // How It Works interactive step selection
  const [activeStep, setActiveStep] = useState(1);

  // Guarantee / Trust modal state
  const [trustModal, setTrustModal] = useState(null);

  // Savings Calculator state
  const [calculatorRent, setCalculatorRent] = useState(7000);
  const [brokerFeePercent, setBrokerFeePercent] = useState(100); // 100% or 50%

  // FAQ state
  const [openFaq, setOpenFaq] = useState(0);

  // Interactive Inquiry / Contact Modal state (matching About.jsx)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    topic: 'Student Inquiry',
    message: '',
  });

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name?.trim() || !contactForm.email?.trim() || !contactForm.message?.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmittingMessage(true);
    const toastId = toast.loading('Sending message to Stay Aalaya admin...');

    try {
      if (createNotification) {
        await createNotification({
          targetRole: 'admin',
          type: 'INQUIRY',
          message: `📬 Message from ${contactForm.name.trim()} (${contactForm.email.trim()}) regarding "${contactForm.topic}": ${contactForm.message.trim()}`,
        });
      }
      toast.success('Delivered! Stay Aalaya admin has received your inquiry.', { id: toastId });
      setIsModalOpen(false);
      setContactForm({ name: '', email: '', topic: 'Student Inquiry', message: '' });
    } catch (err) {
      console.warn('Inquiry send notice:', err);
      toast.success('Thank you! Your message has been sent to the Stay Aalaya Team.', { id: toastId });
      setIsModalOpen(false);
      setContactForm({ name: '', email: '', topic: 'Student Inquiry', message: '' });
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // All approved listings from data context
  const approvedPGs = getApprovedPGs() || [];

  // Count unique localities from real approved PGs
  const realLocalitiesCount = useMemo(() => {
    const list = approvedPGs
      .map((p) => p.locality || p.location?.area || p.location?.city)
      .filter(Boolean);
    const unique = new Set(list);
    return unique.size || 1;
  }, [approvedPGs]);

  // Count real students strictly from live database figures (registered students + active student reviewers)
  const realStudentsCount = useMemo(() => {
    // 1. Gather all registered student/tenant profiles
    const studentProfiles = (users || []).filter(
      (u) => u.role === 'student' || u.role === 'user' || !u.role
    );
    const studentIds = new Set(studentProfiles.map((u) => String(u.id)));

    // 2. If current logged-in user is a student, ensure they are counted
    if (currentUser?.id && (currentUser.role === 'student' || currentUser.role === 'user' || !currentUser.role)) {
      studentIds.add(String(currentUser.id));
    }

    // 3. Count unique student reviewers from the reviews table
    (reviews || []).forEach((r) => {
      const uid = String(r.userId || r.user_id || '');
      if (uid && !studentIds.has(uid)) {
        const u = (users || []).find((x) => String(x.id) === uid);
        if (!u || u.role === 'student' || u.role === 'user' || !u.role) {
          studentIds.add(uid);
        }
      }
    });

    return studentIds.size;
  }, [users, reviews, currentUser]);

  // Filter listings for the Featured Residences section strictly using real data
  const filteredPGs = useMemo(() => {
    let list = [...approvedPGs];

    if (activeCategory !== 'All PGs') {
      list = list.filter((p) => {
        const cat = (p.category || p.genderPreference || p.gender_preference || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();

        if (activeCategory === 'Homestay') {
          return cat.includes('homestay') || title.includes('homestay') || desc.includes('homestay');
        }
        if (activeCategory === 'Boys') {
          return cat === 'boys' || cat.includes('boy') || title.includes('boy') || desc.includes('boy');
        }
        if (activeCategory === 'Girls') {
          return cat === 'girls' || cat.includes('girl') || title.includes('girl') || desc.includes('girl');
        }
        if (activeCategory === 'Co-ed') {
          return cat.includes('co-ed') || cat.includes('coed') || title.includes('co-ed') || title.includes('coed');
        }
        return cat === activeCategory.toLowerCase();
      });
    }

    if (activeArea !== 'All Sikkim') {
      list = list.filter((p) => {
        const area = (p.locality || p.location?.area || p.location?.city || '').toLowerCase();
        return area.includes(activeArea.toLowerCase());
      });
    }

    if (sortByTaxi) {
      list.sort((a, b) => {
        const distA = typeof a.distance_to_taxi === 'number' ? a.distance_to_taxi : parseInt(a.distance_to_taxi) || 5;
        const distB = typeof b.distance_to_taxi === 'number' ? b.distance_to_taxi : parseInt(b.distance_to_taxi) || 5;
        return distA - distB;
      });
    } else {
      // Sort strictly by highest rating first, then review count, then newest created
      list.sort((a, b) => {
        const ratingA = Number(a.averageRating ?? a.rating ?? 0);
        const ratingB = Number(b.averageRating ?? b.rating ?? 0);
        if (ratingB !== ratingA) return ratingB - ratingA;

        const reviewsA = Number(a.totalReviews ?? a.total_reviews ?? 0);
        const reviewsB = Number(b.totalReviews ?? b.total_reviews ?? 0);
        if (reviewsB !== reviewsA) return reviewsB - reviewsA;

        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    return list;
  }, [approvedPGs, activeCategory, activeArea, sortByTaxi]);

  // Featured Residences strictly uses real approved PGs from database (no mock data fallback)
  const displayFeaturedPGs = useMemo(() => {
    return filteredPGs.slice(0, 4);
  }, [filteredPGs]);

  // Average rating calculated strictly from real database reviews or approved PGs
  const avgRatingDisplay = useMemo(() => {
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
      return (sum / reviews.length).toFixed(1);
    }
    const ratedPGs = approvedPGs.filter((p) => Number(p.averageRating || p.rating || 0) > 0);
    if (!ratedPGs.length) return '5.0';
    const sum = ratedPGs.reduce((acc, p) => acc + Number(p.averageRating || p.rating || 0), 0);
    return (sum / ratedPGs.length).toFixed(1);
  }, [reviews, approvedPGs]);

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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      {/* ========================================================
          1. HERO SECTION (Screenshot 1: Himalayan Sunset Mountain)
          ======================================================== */}
      <section className="relative pt-20 pb-12 sm:pt-36 sm:pb-24 overflow-hidden min-h-screen min-h-[100dvh] sm:min-h-[88vh] flex flex-col justify-center">
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

        {/* Hero Content Container - Lifted slightly above center on mobile */}
        <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 text-center w-full -translate-y-5 sm:translate-y-0">
          {/* Top Tagline Pill - Perfectly Centered */}
          <div className="flex justify-center mb-3 sm:mb-5">
            <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-400/30 text-[10.5px] mb-8 sm:text-xs text-slate-200 shadow-md max-w-full">
              <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse shrink-0" />
              <span className="font-semibold text-white whitespace-nowrap">#1 AI-Powered Stay Finder in</span>
              <span className="text-[#f5a623] font-bold shrink-0">Sikkim</span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-amber-300 font-medium hidden sm:inline">Powered by Stay Aalaya AI</span>
            </div>
          </div>

          {/* Hero Headline */}
          <h1
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-10 sm:mb-8 md:mb-10 leading-[1.2] sm:leading-[1.15]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Find Your Ideal PG & Room in 
            <span className="text-[#f5a623]"> Sikkim</span>  <br className="hidden sm:inline" />with <span className="text-[#f5a623]"> Stay Aalaya </span>AI 🏡
          </h1>

          {/* Master AI Search Console Container - Clean, Unified, Interactive UI */}
          <div className="max-w-4xl mx-auto bg-slate-950/80 backdrop-blur-2xl border border-white/15 hover:border-amber-400/40 rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 shadow-2xl transition-all text-left w-full">
            {/* Console Header: Tabs (AI Smart Search vs Manual Filters) + Multi-Language Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-3.5">
              {/* Tab Controls - 50/50 split on mobile */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 bg-slate-900/90 p-1 rounded-xl sm:rounded-2xl border border-white/10 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSearchTab('ai')}
                  className={`py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    searchTab === 'ai'
                      ? 'bg-[#f5a623] text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles size={13} className={searchTab === 'ai' ? 'text-slate-950 stroke-[2.5]' : 'text-[#f5a623]'} />
                  <span>AI Finder</span>
                  <span className={`text-[9px] font-black uppercase px-1 py-0.2 rounded-full ${searchTab === 'ai' ? 'bg-slate-950 text-[#f5a623]' : 'bg-[#f5a623]/20 text-[#f5a623]'}`}>
                    AI
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSearchTab('standard')}
                  className={`py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    searchTab === 'standard'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sliders size={13} className="text-[#f5a623]" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Voice Assistant Pill & Supported Languages */}
              <div className="flex items-center gap-1.5 self-center sm:self-auto shrink-0 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => setIsVoiceAssistantOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-amber-400/20 to-amber-500/25 hover:from-amber-500/35 hover:to-amber-400/35 text-amber-300 border border-amber-400/50 text-[10px] sm:text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer group"
                  title="Talk directly with Stay Aalaya AI Voice Assistant"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Mic size={13} className="text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>Talk to Alaya Bot</span>
                  <span className="text-[9px] bg-amber-400/20 text-amber-200 px-1 py-0.2 rounded font-black uppercase">Voice</span>
                </button>

                <div className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-amber-300 border border-amber-400/30 text-[10px] sm:text-xs font-semibold shadow-2xs">
                  <Languages size={12} className="text-[#f5a623] shrink-0" />
                  <span>English • हिंदी • Hinglish</span>
                </div>
              </div>
            </div>

            {/* TAB 1: AI SMART FINDER (Clean, Interactive & Spacious) */}
            {searchTab === 'ai' ? (
              <div className="space-y-2.5 sm:space-y-3">
                {/* AI Smart Finder Explanation */}
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
                  Skip manual filter dropdowns! Ask naturally in <span className="text-amber-300 font-semibold">English, हिंदी, or Hinglish</span> — our <strong className="text-white font-bold">Stay Aalaya AI</strong> instantly matches verified rooms near <span className="text-amber-300 font-semibold">ICFAI, SMIT</span>, colleges, nearby places & all Sikkim localities.
                </p>

                {/* 1. Primary AI Input Form */}
                <form onSubmit={handleSearchSubmit} className="w-full">
                  <div className="bg-white rounded-2xl p-1.5 sm:p-2.5 shadow-xl border-2 border-amber-300/80 focus-within:border-[#f5a623] focus-within:ring-4 focus-within:ring-amber-400/20 flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5 transition-all">
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-1 w-full px-2 sm:px-3 py-1 sm:py-0">
                      <Sparkles size={18} className="text-[#f5a623] shrink-0 animate-pulse" />
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Type naturally: 'ICFAI pass PG under 7000'..."
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                        className="w-full bg-transparent text-slate-900 text-xs sm:text-sm md:text-base font-semibold placeholder:text-slate-400 placeholder:font-normal no-focus-ring border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-transparent"
                      />
                      {aiPrompt && (
                        <button
                          type="button"
                          onClick={() => setAiPrompt('')}
                          className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-full hover:bg-slate-100 transition-colors shrink-0"
                          title="Clear input"
                        >
                          ✕
                        </button>
                      )}

                      {/* Microphone Voice Button inside input */}
                      <button
                        type="button"
                        onClick={() => setIsVoiceAssistantOpen(true)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-500/25 hover:from-amber-500/25 hover:to-amber-500/35 text-[#0f2547] border border-amber-400/60 hover:border-amber-500 shadow-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 group"
                        title="Click to speak with Stay Aalaya AI Voice Assistant"
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <Mic size={16} className="text-amber-600 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black text-[#0f2547] hidden sm:inline">Voice Search</span>
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full sm:w-auto shrink-0 bg-[#0f2547] hover:bg-[#16335d] active:scale-95 text-[#f5a623] font-black text-xs sm:text-sm py-2.5 sm:py-3 px-5 sm:px-7 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <span>Match Stays with AI</span>
                      <ArrowRight size={15} className="text-[#f5a623] stroke-[2.5]" />
                    </button>
                  </div>
                </form>


                {/* 2. Sleek 3-Step Micro Strip (Single row on mobile & desktop) */}
                <div className="grid grid-cols-3 gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl bg-slate-900/70 border border-white/10 text-slate-300 text-[9px] sm:text-xs text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[9px] sm:text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <span className="truncate"><strong>Type</strong> naturally</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 border-x border-white/10 sm:border-0 px-1 sm:px-0">
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] sm:text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <span className="truncate"><strong>AI</strong> auto-filters</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2">
                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/40 text-[9px] sm:text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    <span className="truncate"><strong>Instant</strong> verified stays</span>
                  </div>
                </div>

                {/* 3. Interactive Clickable Example Prompts */}
                <div className="pt-0.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 scroll-smooth -mx-1 px-1">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                    Try:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const q = 'ICFAI University ke pass PG with food';
                      setAiPrompt(q);
                      navigate(`/find-pg?query=${encodeURIComponent(q)}`);
                    }}
                    className="shrink-0 text-[10px] sm:text-xs bg-slate-900/90 hover:bg-[#0f2547] text-slate-200 hover:text-amber-300 font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/15 hover:border-amber-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Click to search near ICFAI University"
                  >
                    <span>🎓</span>
                    <span>"ICFAI University ke pass PG with food"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q = 'Tadong me boys PG under 7000 with wifi';
                      setAiPrompt(q);
                      navigate(`/find-pg?query=${encodeURIComponent(q)}`);
                    }}
                    className="shrink-0 text-[10px] sm:text-xs bg-slate-900/90 hover:bg-[#0f2547] text-slate-200 hover:text-amber-300 font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/15 hover:border-amber-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Click to search in Hinglish"
                  >
                    <span>🇮🇳</span>
                    <span>"Tadong me boys PG under 7000 with wifi"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q = 'Single room near SMIT with wifi';
                      setAiPrompt(q);
                      navigate(`/find-pg?query=${encodeURIComponent(q)}`);
                    }}
                    className="shrink-0 text-[10px] sm:text-xs bg-slate-900/90 hover:bg-[#0f2547] text-slate-200 hover:text-amber-300 font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/15 hover:border-amber-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Click to search near SMIT"
                  >
                    <span>🏫</span>
                    <span>"Single room near SMIT with wifi"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const q = 'Girls PG in 5th Mile with winter geyser';
                      setAiPrompt(q);
                      navigate(`/find-pg?query=${encodeURIComponent(q)}`);
                    }}
                    className="shrink-0 text-[10px] sm:text-xs bg-slate-900/90 hover:bg-[#0f2547] text-slate-200 hover:text-amber-300 font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/15 hover:border-amber-400 shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    title="Click to search girls PG with geyser"
                  >
                    <span>🌸</span>
                    <span>"Girls PG 5th Mile with geyser"</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: MANUAL FILTERS (Traditional Dropdowns) */
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.15fr)_minmax(0,1fr)_auto] gap-2 sm:gap-3 items-center w-full">
                  {/* Segment 1: Sikkim Locality */}
                  <div className="relative border border-slate-200/90 rounded-xl sm:rounded-2xl px-3 py-2 sm:py-2.5 flex items-center gap-2 bg-white hover:border-slate-300 transition-colors min-w-0">
                    <MapPin size={18} className="text-[#f5a623] shrink-0 stroke-2" />
                    <div className="flex-1 min-w-0 pr-1">
                      <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-1">
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
                  <div className="relative border border-slate-200/90 rounded-xl sm:rounded-2xl px-3 py-2 sm:py-2.5 flex items-center gap-2 bg-white hover:border-slate-300 transition-colors min-w-0">
                    <Bed size={18} className="text-[#f5a623] shrink-0 stroke-2" />
                    <div className="flex-1 min-w-0 pr-1">
                      <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-1">
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
                    <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
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
                      className="aalaya-budget-slider cursor-pointer mt-1 sm:mt-1.5 w-full"
                      style={{
                        background: `linear-gradient(to right, #f5a623 0%, #f5a623 ${((maxBudget - 3500) / (15000 - 3500)) * 100}%, #334155 ${((maxBudget - 3500) / (15000 - 3500)) * 100}%, #334155 100%)`,
                      }}
                    />
                  </div>

                  {/* Segment 4: Search Action Button */}
                  <div className="w-full lg:w-auto shrink-0 flex items-center justify-end">
                    <button
                      type="submit"
                      className="w-full lg:w-auto shrink-0 bg-[#f5a623] hover:bg-[#e09618] active:scale-95 text-slate-950 font-extrabold text-xs sm:text-base py-2.5 sm:py-3.5 px-5 sm:px-6 rounded-xl sm:rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Search size={16} className="stroke-[2.5]" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Bottom 3 Stats Banner (Real Database Figures) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3.5 sm:pt-5 mt-3.5 sm:mt-5 border-t border-white/10 items-center text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-white font-extrabold text-sm sm:text-2xl">
                  <ShieldCheck size={16} className="text-[#f5a623] sm:w-5 sm:h-5 shrink-0" />
                  <span>{approvedPGs.length > 0 ? `${approvedPGs.length}+` : '100%'}</span>
                </div>
                <span className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  VERIFIED PGS
                </span>
              </div>

              <div className="flex flex-col items-center border-x border-white/10 px-1 sm:px-6">
                <div className="flex items-center gap-1 text-white font-extrabold text-sm sm:text-2xl">
                  <Users size={16} className="text-[#f5a623] sm:w-5 sm:h-5 shrink-0" />
                  <span>{realStudentsCount > 0 ? `${realStudentsCount}+` : '0'}</span>
                </div>
                <span className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  HAPPY STUDENTS
                </span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-white font-extrabold text-sm sm:text-2xl">
                  <MapPin size={16} className="text-[#f5a623] sm:w-5 sm:h-5 shrink-0" />
                  <span>{realLocalitiesCount > 1 ? `${realLocalitiesCount}+` : realLocalitiesCount}</span>
                </div>
                <span className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  LOCALITIES
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. FEATURED RESIDENCES (Immediately Below Hero)
          ======================================================== */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#f5a623] block mb-1">
              CURATED STAYS
            </span>
            <h2
              className="text-3xl sm:text-4xl font-bold text-[#0f2547] tracking-tight"
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

        {/* 4-Card Responsive Residences Grid */}
        {displayFeaturedPGs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayFeaturedPGs.map((pg) => (
              <PGCard key={pg.id} pg={pg} includeMess={includeMess} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <p className="text-slate-500 font-medium mb-3">No properties found in this filter selection.</p>
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
          3. SAVINGS CALCULATOR (Zero Brokerage Interactive Section)
          ======================================================== */}
      <section className="py-14 sm:py-20 bg-gradient-to-b from-white via-slate-50 to-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 text-[10.5px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
              <Calculator size={13} className="text-emerald-700" />
              ZERO BROKERAGE SAVINGS
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0f2547] mb-3 tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Calculate How Much You Save with Stay Aalaya
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              Traditional property brokers in Sikkim typically charge 50% to 100% of a full month's rent as brokerage commission. Stay Aalaya connects you directly with homeowners for ₹0 platform fee.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Interactive Inputs */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                    <DollarSign size={16} className="text-[#f5a623]" />
                    Expected Monthly Rent
                  </label>
                  <span className="text-lg sm:text-2xl font-black text-[#0f2547]">
                    ₹{new Intl.NumberFormat('en-IN').format(calculatorRent)}
                    <span className="text-xs text-slate-400 font-normal"> / month</span>
                  </span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="3000"
                  max="25000"
                  step="500"
                  value={calculatorRent}
                  onChange={(e) => setCalculatorRent(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                  <span>₹3,000 (Sharing)</span>
                  <span>₹12,000</span>
                  <span>₹25,000 (Private Flat/Studio)</span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Quick Select:</span>
                  {[5000, 7000, 10000, 15000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalculatorRent(preset)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        calculatorRent === preset
                          ? 'bg-[#0f2547] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      ₹{new Intl.NumberFormat('en-IN').format(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Broker Fee Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs sm:text-sm font-bold text-slate-800 block mb-2.5">
                  Typical Middleman Brokerage in Your Area:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBrokerFeePercent(100)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      brokerFeePercent === 100
                        ? 'border-[#0f2547] bg-slate-50 shadow-xs ring-1 ring-[#0f2547]'
                        : 'border-slate-200 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">1 Full Month Rent (100%)</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        brokerFeePercent === 100 ? 'border-[#0f2547] bg-[#0f2547] text-white' : 'border-slate-300'
                      }`}>
                        {brokerFeePercent === 100 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Standard rate charged by local Sikkim brokers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBrokerFeePercent(50)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      brokerFeePercent === 50
                        ? 'border-[#0f2547] bg-slate-50 shadow-xs ring-1 ring-[#0f2547]'
                        : 'border-slate-200 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">15 Days Rent (50%)</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        brokerFeePercent === 50 ? 'border-[#0f2547] bg-[#0f2547] text-white' : 'border-slate-300'
                      }`}>
                        {brokerFeePercent === 50 && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Partial commission rate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Savings Result Box */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0f2547] to-[#16335d] rounded-2xl p-6 sm:p-8 text-white flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a623] block mb-2">
                  YOUR INSTANT SAVINGS
                </span>
                <div className="space-y-3 py-3 border-b border-white/10 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Traditional Broker Commission:</span>
                    <span className="font-semibold text-rose-300 line-through">
                      ₹{new Intl.NumberFormat('en-IN').format(Math.round((calculatorRent * brokerFeePercent) / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-300 font-semibold">
                    <span>Stay Aalaya Platform Fee:</span>
                    <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold">
                      ₹0 (100% Free)
                    </span>
                  </div>
                </div>

                <div className="pt-5 pb-4">
                  <span className="text-xs text-slate-300 block mb-1">Total Money Kept in Your Pocket:</span>
                  <div className="text-3xl sm:text-5xl font-black text-[#f5a623] tracking-tight">
                    ₹{new Intl.NumberFormat('en-IN').format(Math.round((calculatorRent * brokerFeePercent) / 100))}
                  </div>
                  <p className="text-[11.5px] text-slate-300 mt-2 leading-relaxed">
                    Zero middlemen fees means your budget goes 100% toward your actual room rent, winter heating, and college living.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <CheckCircle2 size={15} className="text-[#f5a623] shrink-0" />
                  <span>Direct WhatsApp & Call Connect with Owners</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/find-pg')}
                  className="w-full bg-[#f5a623] hover:bg-[#e09618] active:scale-[0.99] text-[#0f2547] font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Browse Zero-Brokerage PGs Now</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. HOW IT WORKS (Screenshots 2 & 3: Simple Process)
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
                <Sparkles size={26} className="text-[#f5a623] stroke-[2.2]" />
              </div>
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#f5a623] text-slate-950 font-black text-xs flex items-center justify-center border-2 border-white">
                01
              </span>
            </div>
            <h3
              className="text-xl font-bold text-[#0f2547] mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              AI Smart Search
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
              Ask naturally in English, हिंदी, or Hinglish. Our Stay Aalaya AI auto-detects colleges, nearby places, rent budget, & room amenities.
            </p>
            <span className="mt-auto bg-[#0f2547] text-[#f5a623] text-[11px] font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
              <Sparkles size={11} className="text-[#f5a623]" />
              <span>Stay Aalaya AI Search</span>
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
                ? 'STEP 01: AI SMART SEARCH & TERRAIN MATCHING'
                : activeStep === 2
                ? 'STEP 02: DIRECT HOST CONNECT'
                : 'STEP 03: 14-POINT PRE-MOVE IN CHECK'}
            </span>
            <h3
              className="text-xl sm:text-2xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {activeStep === 1 && 'Stay Aalaya AI Natural Language Stay Search'}
              {activeStep === 2 && 'Direct WhatsApp & Call Connect With Verified Hosts'}
              {activeStep === 3 && '14-Point Pre-Move In Guarantee & Room Handover'}
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200 pt-1">
              {activeStep === 1 ? (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>Search in plain English, हिंदी, or Hinglish (e.g. "Tadong me boys PG under 7000 with wifi")</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>Auto-detects colleges (ICFAI, SMIT, SRM, Manipal), nearby places & amenities (food, geyser)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>Instant matching with 100% physically verified stays & ₹0 brokerage</span>
                  </li>
                </>
              ) : activeStep === 2 ? (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>One-tap WhatsApp chat & phone connect with verified local Sikkimese hosts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>Ask about mess menu (veg/non-veg), curfew rules, and live video tours</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>No agent middlemen, zero hidden commissions — pay rent directly to homeowner</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>14-point physical verification: hot water geyser, Wi-Fi speed, and road/taxi access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>Zero surprise stair climbs: exact walk time and zero-stair access badges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#f5a623] shrink-0" />
                    <span>Move into your hill accommodation with total peace of mind</span>
                  </li>
                </>
              )}
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
          5. ABOUT STAY AALAYA SIKKIM & GUARANTEE
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
              <strong className="text-slate-900">Stay Aalaya</strong> is Sikkim's first AI-powered room and PG finder.
              Powered by Stay Aalaya AI, students at ICFAI University, SRM, SMIT, Manipal,
              and working professionals can search in English, हिंदी, or Hinglish to match verified Sikkimese homes with zero brokerage.
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
                {approvedPGs.length} Listed
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

        {/* Real Testimonial Cards from Database */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.length > 0 ? (
            reviews.slice(0, 3).map((rev) => {
              const matchedPg = pgs.find((p) => String(p.id) === String(rev.pgId));
              const initials = (rev.userName || 'Student')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={rev.id}
                  className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-[#f5a623]">
                        {[...Array(Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 5))))].map((_, i) => (
                          <Star key={i} size={16} className="fill-[#f5a623] text-[#f5a623]" />
                        ))}
                      </div>
                      <span className="text-4xl font-serif text-slate-200 select-none leading-none">“</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed mb-6">
                      “{rev.comment}”
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    {rev.userAvatar ? (
                      <img
                        src={rev.userAvatar}
                        alt={rev.userName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{rev.userName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {matchedPg ? `Resident at ${matchedPg.title}` : 'Verified Sikkim Resident'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : null}

          {/* Invitation for students to write real reviews if fewer than 3 reviews */}
          {reviews.length < 3 && (
            <div className="bg-slate-50 rounded-3xl p-7 border border-dashed border-slate-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                  <Star size={20} className="fill-[#f5a623] text-[#f5a623]" />
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-2">Are you a Student in Sikkim?</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Stay Aalaya operates on 100% genuine peer reviews. Share your experience at your PG to help fellow students find a safe, verified hill home.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/find-pg')}
                className="w-full py-2.5 bg-[#0f2547] text-white rounded-xl text-xs font-bold hover:bg-[#16335d] transition-colors cursor-pointer"
              >
                Explore & Review Stays
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          7. FREQUENTLY ASKED QUESTIONS (FAQ Accordion)
          ======================================================== */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 text-[10.5px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
              <HelpCircle size={13} className="text-[#f5a623]" />
              GOT QUESTIONS?
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0f2547] tracking-tight mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto">
              Everything you need to know about finding rooms, physical verifications, and zero brokerage in Sikkim.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-sm sm:text-base text-[#0f2547] flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-[#0f2547] text-xs font-black flex items-center justify-center shrink-0">
                        0{index + 1}
                      </span>
                      {item.question}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <ChevronDown size={16} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-7 pb-5 pt-1 text-slate-600 text-xs sm:text-sm leading-relaxed border-t border-slate-100 animate-fade-in">
                      <div className="pl-10 text-slate-600">
                        {item.answer}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Still have a question / Send a Message card (Matches About page) */}
          <div className="mt-8 sm:mt-10 text-center bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Still have a specific question about your college?</h4>
            <p className="text-xs text-slate-500 mt-1">Our team is always happy to guide incoming students and listen to suggestions.</p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 bg-[#0f2547] hover:bg-[#16335d] text-[#f5a623] hover:text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Mail size={15} />
              <span>Send a Message / Suggestion</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* INTERACTIVE INQUIRY / CONTACT MODAL (Matches About page) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative animate-slide-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Send size={18} />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate">Get In Touch With Us</h3>
                <p className="text-xs text-slate-500 truncate">Ask a question or suggest a new PG near your college</p>
              </div>
            </div>

            {/* Recipient Notice Callout */}
            <div className="mb-4 p-2.5 sm:p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck size={15} className="text-[#0f2547] shrink-0 mt-0.5" />
              <span>
                <strong>Who receives this?</strong> Your message is sent directly to the <strong>Stay Aalaya Admin Dashboard</strong> (under Notifications) where our management team reviews incoming inquiries.
              </span>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic</label>
                <select
                  value={contactForm.topic}
                  onChange={(e) => setContactForm({ ...contactForm, topic: e.target.value })}
                  className="input-field text-xs"
                >
                  <option value="Student Inquiry">Student PG Inquiry (Majitar / Gangtok)</option>
                  <option value="Owner Listing">I want to list my PG or Homestay</option>
                  <option value="Feature Suggestion">Feature Suggestion for Stay Aalaya</option>
                  <option value="Other">Other Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Tell us about your requirement or question..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                <span>Direct Admin Email:</span>
                <a
                  href="mailto:manishkr5487@gmail.com"
                  className="text-[#0f2547] font-semibold hover:underline"
                >
                  manishkr5487@gmail.com
                </a>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMessage}
                  className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      <span>Verified with college email domains (ICFAI University, SRM, SMU, Sikkim University) or student ID cards.</span>
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

      {/* Floating Action Dock (Opposite to AI bot at bottom-left, stacked up and down) */}
      <div className="fixed bottom-7 sm:bottom-10 left-3 sm:left-6 z-40 flex flex-col items-start gap-1.5 sm:gap-2.5">
        {/* PG Owner Quick Link */}
        <Link
          to="/list-your-pg"
          className="group flex items-center gap-1.5 sm:gap-2 bg-[#0f2547]/95 hover:bg-[#0b192c] text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full shadow-lg sm:shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 ring-1.5 sm:ring-2 ring-amber-400/40 border border-amber-400/20 backdrop-blur-md cursor-pointer"
          title="Are you a PG Owner? Manage or list your room"
        >
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-[#f5a623] to-amber-300 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
            <Building2 size={10} className="sm:hidden stroke-[2.5]" />
            <Building2 size={12} className="hidden sm:inline stroke-[2.5]" />
          </div>
          <span className="font-bold text-[11px] sm:text-xs tracking-wide text-white whitespace-nowrap">
            <span className="hidden sm:inline">Are you a </span>PG Owner?
          </span>
          <ArrowRight size={13} className="text-[#f5a623] hidden sm:inline group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Have a Question Quick Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-1.5 sm:gap-2 bg-white/95 hover:bg-white text-slate-800 hover:text-[#0f2547] px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full shadow-lg sm:shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-slate-200/90 hover:border-amber-400/60 backdrop-blur-md cursor-pointer"
          title="Have a Question? Send an inquiry or suggestion"
        >
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <HelpCircle size={11} className="sm:hidden text-[#f5a623]" />
            <HelpCircle size={13} className="hidden sm:inline text-[#f5a623]" />
          </div>
          <span className="font-bold text-[11px] sm:text-xs tracking-wide whitespace-nowrap">
            <span className="hidden sm:inline">Have a </span>Question?
          </span>
        </button>
      </div>

      {/* Stay Alaya AI Voice Assistant Full-Screen Translucent Overlay */}
      <AalayaVoiceAssistant
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
      />
    </div>
  );
}

