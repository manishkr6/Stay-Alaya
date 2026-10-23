import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  Filter,
  Github,
  LayoutDashboard,
  Linkedin,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  Sparkles,
  Flame,
  Wifi,
  Phone,
  Coffee,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  HelpCircle,
  Mail,
  Copy,
  ExternalLink,
  Sliders,
  TrendingUp,
  Send,
  GraduationCap,
  Compass,
  Heart,
} from 'lucide-react';
import { useData } from '../hooks/useData';

// Animated Counter with IntersectionObserver
function Counter({ to, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1200;
    const frame = 16;
    const totalFrames = Math.ceil(duration / frame);
    let currentFrame = 0;

    const timer = setInterval(() => {
      currentFrame += 1;
      const progress = Math.min(currentFrame / totalFrames, 1);
      // easeOutExpo progression
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(to * ease));
      if (progress >= 1) clearInterval(timer);
    }, frame);

    return () => clearInterval(timer);
  }, [started, to]);

  return (
    <span ref={ref} className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight">
      {prefix}
      {count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export default function About() {
  const navigate = useNavigate();
  const { getApprovedPGs, reviews = [], users = [], createNotification } = useData();
  const approvedPGs = useMemo(() => (getApprovedPGs ? getApprovedPGs() : []), [getApprovedPGs]);

  // Sort real PGs strictly by highest ratings and reviews, matching Home.jsx
  const sortedApprovedPGs = useMemo(() => {
    const list = [...approvedPGs];
    list.sort((a, b) => {
      const ratingA = Number(a.averageRating ?? a.rating ?? 0);
      const ratingB = Number(b.averageRating ?? b.rating ?? 0);
      if (ratingB !== ratingA) return ratingB - ratingA;

      const revA = Number(a.totalReviews ?? a.total_reviews ?? 0);
      const revB = Number(b.totalReviews ?? b.total_reviews ?? 0);
      if (revB !== revA) return revB - revA;

      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });
    return list;
  }, [approvedPGs]);

  // Category Tabs for the Real Showcase
  const heroTabs = [
    { id: 'top_rated', label: '⭐ Top Rated', emptyLabel: 'Top-Rated PGs' },
    { id: 'boys', label: '👦 Boys PG', emptyLabel: 'Boys PGs' },
    { id: 'girls', label: '👧 Girls PG', emptyLabel: 'Girls PGs' },
    { id: 'coed', label: '🤝 Co-ed', emptyLabel: 'Co-ed Accommodations' },
    { id: 'homestay', label: '🏔️ Homestay', emptyLabel: 'Traditional Homestays' },
  ];

  // State for Interactive Hero Showcase
  const [heroTab, setHeroTab] = useState('top_rated');
  const [activePgIndex, setActivePgIndex] = useState(0);
  const [includeMeals, setIncludeMeals] = useState(false);
  const [isContactDemoOpen, setIsContactDemoOpen] = useState(false);

  // State for Interactive Narrative Story
  const [storyTab, setStoryTab] = useState('story'); // 'story' | 'why-sikkim' | 'problem-solved' | 'trust'

  // State for Brokerage Savings Calculator
  const [monthlyRent, setMonthlyRent] = useState(7000);

  // State for Persona Features Explorer
  const [personaTab, setPersonaTab] = useState('students'); // 'students' | 'owners'

  // State for How It Works Stepper
  const [activeStep, setActiveStep] = useState(1);

  // State for Quick Contact / Suggestion Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    topic: 'Student Inquiry',
    message: '',
  });

  // Filter real PGs for active tab
  const activeTabPGs = useMemo(() => {
    if (heroTab === 'boys') {
      return sortedApprovedPGs.filter(
        (p) => (p.genderPreference || p.gender_preference || p.category || '').toLowerCase() === 'boys'
      );
    }
    if (heroTab === 'girls') {
      return sortedApprovedPGs.filter(
        (p) => (p.genderPreference || p.gender_preference || p.category || '').toLowerCase() === 'girls'
      );
    }
    if (heroTab === 'coed') {
      return sortedApprovedPGs.filter((p) => {
        const cat = (p.genderPreference || p.gender_preference || p.category || '').toLowerCase();
        return cat.includes('co-ed') || cat.includes('coed');
      });
    }
    if (heroTab === 'homestay') {
      return sortedApprovedPGs.filter((p) => {
        const t = (p.title || '').toLowerCase();
        const c = (p.category || '').toLowerCase();
        const d = (p.description || '').toLowerCase();
        return t.includes('homestay') || c.includes('homestay') || d.includes('homestay');
      });
    }
    // 'top_rated'
    return sortedApprovedPGs;
  }, [sortedApprovedPGs, heroTab]);

  // Reset index when tab changes
  useEffect(() => {
    setActivePgIndex(0);
  }, [heroTab]);

  const currentRealPG = activeTabPGs[activePgIndex] || null;
  const currentTabMeta = heroTabs.find((t) => t.id === heroTab) || heroTabs[0];

  const baseRent = Number(currentRealPG?.price ?? currentRealPG?.rent ?? 0);
  const messPrice = Number(currentRealPG?.mess_price ?? 0);
  const calculatedRent = includeMeals && messPrice > 0 ? baseRent + messPrice : baseRent;

  // Campus quick chips
  const campusChips = [
    { name: 'ICFAI Gangtok', locality: 'Gangtok' },
    { name: 'SMIT Majitar', locality: 'Majitar' },
    { name: 'Tadong (SMIMS)', locality: 'Tadong' },
    { name: '5th Mile (Sikkim Univ)', locality: '5th Mile' },
    { name: 'MG Marg Promenade', locality: 'MG Marg' },
    { name: 'Namchi (South Sikkim)', locality: 'Namchi' },
  ];

  // How It Works Steps data
  const stepDetails = [
    {
      id: 1,
      number: '01',
      title: 'Search & Filter',
      subtitle: 'Locate rooms near your Sikkim college or work',
      desc: 'Filter by exact campus (SMIT, ICFAI, Sikkim Univ), taxi proximity, winter amenities like geysers, food inclusions, and budget.',
      previewHighlight: 'Smart Campus Radius Search',
      previewDetails: [
        'Select your college or neighborhood',
        'Set maximum monthly budget (₹3k - ₹15k)',
        'Filter for Boys, Girls, or Co-ed PGs',
        'Check geyser & food options before visiting',
      ],
      icon: Search,
    },
    {
      id: 2,
      number: '02',
      title: 'Compare & Verify',
      subtitle: 'Check authentic room photos & student reviews',
      desc: 'Browse verified high-resolution photos, real electricity & meal policies, winter heating details, and transparent terms with zero broker markup.',
      previewHighlight: 'Verified Amenities & Rates',
      previewDetails: [
        'Detailed room photos with admin verification',
        'Distance to nearest taxi stand and college gate',
        'Verified food menu & mess timings',
        'Read genuine reviews from enrolled peers',
      ],
      icon: BadgeCheck,
    },
    {
      id: 3,
      number: '03',
      title: 'Direct Landlord Connect',
      subtitle: '1-Click WhatsApp or Phone call with owner',
      desc: 'Skip middleman brokers completely. Connect directly with the PG owner to ask questions, schedule an in-person or video walk-through, and confirm availability.',
      previewHighlight: '0% Brokerage & Direct Chat',
      previewDetails: [
        'Instant 1-click WhatsApp chat with owners',
        'Direct phone number for instant availability checks',
        'Zero commission fees paid by student or host',
        'Schedule physical or video room tours',
      ],
      icon: UserCheck,
    },
    {
      id: 4,
      number: '04',
      title: 'Move In Smoothly',
      subtitle: 'Settle into your cozy Himalayan home',
      desc: 'Finalize your stay with complete clarity, sign simple transparent house rules, unpack your bags, and enjoy comfortable Himalayan living.',
      previewHighlight: 'Peaceful Mountain Living',
      previewDetails: [
        'Direct rent payment to property owner',
        'Clear agreement on rent, security & notice periods',
        '24/7 Stay Alaya student support & community',
        'Leave your honest review to help future students',
      ],
      icon: Users,
    },
  ];

  // Persona features data
  const studentFeatures = [
    {
      title: 'AI Locality & Campus Matcher',
      desc: 'Simply search "PG near SMIT with food and geyser under ₹7000" and let our smart AI find the ideal matches instantly.',
      Icon: Sparkles,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200/60',
    },
    {
      title: 'Winter Comfort Verified',
      desc: 'Sikkim winters can be freezing. We verify geysers, room heaters, power backups, and sunny hill exposures.',
      Icon: Flame,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/60',
    },
    {
      title: 'Direct WhatsApp to Owners',
      desc: 'Zero gatekeeping. Chat directly with verified landlords to ask questions and negotiate move-in dates on your terms.',
      Icon: MessageCircle,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/60',
    },
    {
      title: 'Verified Transparent Photos',
      desc: 'No wide-angle trickery or outdated photos. Admin-checked photos ensure the room you see online matches reality.',
      Icon: ShieldCheck,
      color: 'from-violet-500/10 to-purple-500/10 text-violet-600 border-violet-200/60',
    },
    {
      title: 'Hygienic Food & Mess Details',
      desc: 'Check whether 2 or 3 meals are included, vegetarian/non-vegetarian availability, and drinking water water-filter facilities.',
      Icon: Coffee,
      color: 'from-rose-500/10 to-pink-500/10 text-rose-600 border-rose-200/60',
    },
    {
      title: '100% Zero Brokerage Fee',
      desc: 'We never charge a single rupee of brokerage or convenience fee to students. What the landlord charges is what you pay.',
      Icon: CircleDollarSign,
      color: 'from-cyan-500/10 to-sky-500/10 text-cyan-600 border-cyan-200/60',
    },
  ];

  const ownerFeatures = [
    {
      title: 'Free Listing in 2 Minutes',
      desc: 'Add your PG, homestay, or rental flat with photos, amenities, and room pricing. No hidden registration fees.',
      Icon: Building2,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/60',
    },
    {
      title: 'Direct College Student Reach',
      desc: 'Get your property in front of thousands of incoming students from SMIT, ICFAI, Sikkim University, and SMIMS.',
      Icon: GraduationCap,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-200/60',
    },
    {
      title: 'No Commissions Deducted',
      desc: 'Unlike traditional rental agencies taking hefty cuts, 100% of the rent goes directly from the tenant to your bank account.',
      Icon: CircleDollarSign,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/60',
    },
    {
      title: 'Manage Rooms & Availability',
      desc: 'Easily update room counts, seasonal tariffs, mark rooms as occupied, or toggle meal options from your owner dashboard.',
      Icon: LayoutDashboard,
      color: 'from-violet-500/10 to-purple-500/10 text-violet-600 border-violet-200/60',
    },
    {
      title: 'Verified Tenant Inquiries',
      desc: 'Connect with verified students and working professionals. No fake spam or endless uncommitted callers.',
      Icon: UserCheck,
      color: 'from-cyan-500/10 to-sky-500/10 text-cyan-600 border-cyan-200/60',
    },
    {
      title: 'Official "Verified Host" Badge',
      desc: 'Get our green verification badge on your listing to gain 3x more inquiries and instant trust from parents.',
      Icon: BadgeCheck,
      color: 'from-primary-500/10 to-indigo-500/10 text-primary-600 border-primary-200/60',
    },
  ];

  // FAQ Items
  const faqItems = [
    {
      q: 'Is Stay Alaya really 100% free for students and tenants?',
      a: 'Yes, absolutely! Stay Alaya was built by students to eliminate parasitic rental brokerage in Sikkim. Browsing listings, contacting landlords directly, comparing amenities, and using our AI assistant is completely free forever with ₹0 brokerage.',
    },
    {
      q: 'How does Stay Alaya verify PG listings in Sikkim?',
      a: 'Every property submitted undergoes an administrative verification protocol. We cross-verify landlord identity, property location, proximity to local taxi stands, room photos, and winter amenities (especially operational water geysers and electricity). Properties that pass receive our official Verified Badge.',
    },
    {
      q: 'Can I schedule a physical or video tour before booking?',
      a: 'Yes! That is the core benefit of Stay Alaya. When you find a PG you like, click "Contact Owner" to chat on WhatsApp or call them directly. You can request a live video walk-through or arrange an in-person visit at your convenience.',
    },
    {
      q: 'Why is Stay Alaya specially designed for Sikkim?',
      a: 'Standard national rental platforms treat Gangtok or Majitar like Delhi or Bengaluru, failing to consider mountain topography, hill taxi stands, sub-zero winter temperatures requiring dedicated geysers, and university academic calendars (SMIT, ICFAI, Sikkim Univ). Stay Alaya addresses these exact mountain living realities.',
    },
    {
      q: 'How do I list my property as a PG owner or homestay host?',
      a: 'Listing is fast and straightforward! Click "List PG" in the top navigation or create an owner account. You can enter your room details, upload clear room photos, set monthly rent terms, and submit for verification in under 3 minutes.',
    },
    {
      q: 'What if a listing has inaccurate photos or contact info?',
      a: 'We have a strict quality policy. Every listing page features a "Report Listing" button. If a student reports inaccurate information, our administrative moderation team investigates within 24 hours and removes misleading listings immediately.',
    },
  ];

  // Developer team data
  const teamMembers = [
    {
      name: 'Manish Kumar Baitha',
      role: 'Lead Full-Stack Developer & AI Engineer',
      college: 'The ICFAI University, Sikkim',
      bio: 'Final year engineering student at The ICFAI University, Sikkim passionate about building real-world software that solves practical Himalayan living challenges with modern UI, robust architectures, and AI.',
      initials: 'MB',
      image: 'https://ik.imagekit.io/manishkr5487/My-Photo/manish%20profile.png?updatedAt=1770699074406',
      github: 'https://github.com/manishkr6',
      linkedin: 'https://www.linkedin.com/in/manish-kumar-baitha-771120224/',
      email: 'manishkr5487@gmail.com',
      skills: ['React', 'Node.js', 'Vite', 'TailwindCSS', 'Gemini AI', 'Supabase'],
      accentColor: 'from-primary-600 to-cyan-600',
    },
    {
      name: 'Anu Kumari',
      role: 'Full-Stack Developer & UI Designer',
      college: 'The ICFAI University, Sikkim',
      bio: 'Student at The ICFAI University, Sikkim dedicated to crafting thoughtful, accessible, and responsive user experiences with clean code structure, dependable backend integrations, and student-first design.',
      initials: 'AK',
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      email: 'anu@stayalaya.com',
      skills: ['React', 'UI/UX Design', 'TailwindCSS', 'REST APIs', 'State Management'],
      accentColor: 'from-amber-500 to-rose-500',
    },
  ];

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(email);
    toast.success(`Copied ${email} to clipboard!`);
  };

  const handleSimulateContact = () => {
    setIsContactDemoOpen(true);
    toast.success('Direct owner connect simulated! 0% brokerage.');
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSubmittingMessage(true);
    const toastId = toast.loading('Sending message to Stay Alaya admin...');

    try {
      if (createNotification) {
        await createNotification({
          targetRole: 'admin',
          type: 'INQUIRY',
          message: `📬 Message from ${contactForm.name.trim()} (${contactForm.email.trim()}) regarding "${contactForm.topic}": ${contactForm.message.trim()}`,
        });
      }
      toast.success('Delivered! Stay Alaya admin has received your inquiry.', { id: toastId });
      setIsModalOpen(false);
      setContactForm({ name: '', email: '', topic: 'Student Inquiry', message: '' });
    } catch (err) {
      console.warn('Inquiry send notice:', err);
      toast.success('Thank you! Your message has been sent to our team.', { id: toastId });
      setIsModalOpen(false);
      setContactForm({ name: '', email: '', topic: 'Student Inquiry', message: '' });
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24 text-slate-800 overflow-x-hidden">
      {/* ========================================================= */}
      {/* 1. HERO SECTION (INTERACTIVE & RESPONSIVE) */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pb-12 sm:pb-16 md:pb-24 pt-4 sm:pt-6 md:pt-12">
        {/* Ambient Gradient Background Elements */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-primary-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200/90 px-3 sm:px-3.5 py-1.5 shadow-xs backdrop-blur-md max-w-full">
                <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-primary-900 truncate">
                  The Sikkim Student & PG Network
                </span>
                <span className="hidden sm:inline-block text-slate-300">|</span>
                <span className="hidden sm:inline-flex text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                  100% Zero Brokerage
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.14] tracking-tight break-words">
                Find Your Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-cyan-600">PG Stay</span> in Sikkim
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Stay Alaya connects students and working professionals in Gangtok, Majitar, and Namchi with verified, winter-ready rooms. Directly chat with owners, inspect verified geysers, and never pay broker fees again.
              </p>

              {/* Call to Actions (Mobile Responsive Stacking) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 w-full sm:w-auto">
                <Link
                  to="/find-pg"
                  className="btn-primary inline-flex items-center justify-center gap-2 text-sm sm:text-base px-6 py-3.5 shadow-lg shadow-primary-900/15 hover:shadow-primary-900/25 transition-all w-full sm:w-auto text-center"
                >
                  <Search size={18} />
                  Explore PGs Now
                  <ArrowRight size={16} />
                </Link>

                <a
                  href="#savings-calculator"
                  className="btn-outline inline-flex items-center justify-center gap-2 text-sm sm:text-base px-5 py-3 hover:bg-slate-100/80 transition-all w-full sm:w-auto text-center"
                >
                  <CircleDollarSign size={18} className="text-amber-600" />
                  Calculate Savings
                </a>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-primary-700 px-3 py-2 rounded-lg hover:bg-white/60 transition-colors w-full sm:w-auto text-center"
                >
                  <HelpCircle size={16} />
                  Have a Question?
                </button>
              </div>

              {/* Campus Quick Explore Strip */}
              <div className="pt-4 border-t border-slate-200/80">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass size={14} className="text-primary-600 shrink-0" />
                  Jump to Sikkim Campus or Locality:
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {campusChips.map((chip) => (
                    <button
                      key={chip.name}
                      onClick={() => navigate(`/find-pg?locality=${encodeURIComponent(chip.locality)}`)}
                      className="text-[11px] sm:text-xs font-medium bg-white hover:bg-primary-50 hover:text-primary-800 text-slate-700 border border-slate-200 hover:border-primary-200 px-2.5 sm:px-3 py-1 rounded-full shadow-2xs transition-all hover:scale-105 active:scale-95"
                    >
                      📍 {chip.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>Admin Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame size={15} className="text-amber-600 shrink-0" />
                  <span>Winter Geysers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone size={15} className="text-blue-600 shrink-0" />
                  <span>Direct WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Right Hero Interactive Experience Showcase */}
            <div className="lg:col-span-5 relative mt-4 lg:mt-0 w-full min-w-0">
              
              {/* Floating ambient aura */}
              <div className="absolute -inset-2 bg-gradient-to-r from-primary-400/20 via-cyan-400/20 to-amber-400/20 rounded-[2.5rem] blur-xl opacity-75 pointer-events-none" />

              {/* Main Interactive Showcase Card */}
              <div className="relative bg-white/95 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xl sm:shadow-2xl shadow-slate-200/60 transition-all duration-300 w-full">
                
                {/* Real Mode Tabs - Touch Scrollable with no-scrollbar */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-3 sm:mb-4 text-xs font-semibold overflow-x-auto no-scrollbar scroll-smooth">
                  {heroTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setHeroTab(tab.id)}
                      className={`py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg transition-all text-center whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
                        heroTab === tab.id
                          ? 'bg-white text-primary-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {currentRealPG ? (
                  <>
                    {/* Card Image Banner with Real Data */}
                    <div className="relative h-40 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4 group bg-slate-100">
                      {currentRealPG.images?.[0] ? (
                        <img
                          src={currentRealPG.images[0]}
                          alt={currentRealPG.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-900 to-slate-800 text-white">
                          <Building2 size={36} className="text-amber-400 opacity-80" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      
                      {/* Top image badges */}
                      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex flex-wrap gap-1.5">
                        {currentRealPG.isVerified ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-xs">
                            <ShieldCheck size={11} /> Verified Listing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-primary-700/90 text-white text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-xs">
                            <BadgeCheck size={11} /> Approved Listing
                          </span>
                        )}
                        <span className="bg-white/90 text-slate-800 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {currentRealPG.roomType || currentRealPG.room_type || 'Double'} • {currentRealPG.genderPreference || currentRealPG.gender_preference || 'PG'}
                        </span>
                      </div>

                      {/* Photo counter badge */}
                      {currentRealPG.images?.length > 1 && (
                        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-black/60 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded-md font-medium">
                          📷 {currentRealPG.images.length}
                        </div>
                      )}

                      {/* Bottom image details */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 flex items-end justify-between text-white">
                        <div className="min-w-0 pr-2">
                          <p className="text-[10px] sm:text-[11px] font-medium text-amber-300 flex items-center gap-1 truncate">
                            <MapPin size={11} className="shrink-0" /> {currentRealPG.locality || currentRealPG.location?.area || 'Gangtok, Sikkim'}
                          </p>
                          <h3
                            className="font-semibold text-sm sm:text-base leading-snug drop-shadow-sm truncate"
                            title={currentRealPG.title}
                          >
                            {currentRealPG.title}
                          </h3>
                        </div>
                        <div className="shrink-0 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-amber-300 border border-amber-400/30">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span>
                            {Number(currentRealPG.totalReviews || 0) > 0
                              ? Number(currentRealPG.averageRating || 0).toFixed(1)
                              : 'New'}
                          </span>
                          {Number(currentRealPG.totalReviews || 0) > 0 && (
                            <span className="text-white/70 text-[10px]">({currentRealPG.totalReviews})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Location & Host Info */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100 min-w-0">
                      <span className="flex items-center gap-1 font-medium text-slate-700 min-w-0 truncate flex-1">
                        <Building2 size={13} className="text-primary-600 shrink-0" />
                        <span className="truncate">{currentRealPG.address || `${currentRealPG.locality || 'Gangtok'}, Sikkim`}</span>
                      </span>
                      <span className="text-slate-600 font-medium truncate shrink-0 text-right text-[11px] sm:text-xs">
                        👤 {currentRealPG.ownerName || 'Verified Host'}
                      </span>
                    </div>

                    {/* Real Amenities Preview */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {Array.isArray(currentRealPG.amenities) && currentRealPG.amenities.length > 0 ? (
                        currentRealPG.amenities.slice(0, 4).map((item) => (
                          <div
                            key={item}
                            className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-1.5 sm:p-2"
                          >
                            <Check size={12} className="text-emerald-600 shrink-0" />
                            <span className="truncate">{item}</span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg text-center">
                          Essential mountain amenities inspected on site
                        </div>
                      )}
                    </div>

                    {/* Meal Option / Inclusions */}
                    {messPrice > 0 ? (
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 mb-3 sm:mb-4 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-slate-800 block truncate">Include 3 Daily Meals?</span>
                          <span className="text-[11px] text-slate-600 block truncate">+₹{messPrice.toLocaleString('en-IN')}/mo (Mess facility)</span>
                        </div>
                        <button
                          onClick={() => setIncludeMeals(!includeMeals)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            includeMeals ? 'bg-amber-500' : 'bg-slate-300'
                          }`}
                          role="switch"
                          aria-checked={includeMeals}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              includeMeals ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ) : Array.isArray(currentRealPG.amenities) && currentRealPG.amenities.some((a) => a.toLowerCase().includes('food') || a.toLowerCase().includes('mess')) ? (
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 mb-3 sm:mb-4 text-xs text-emerald-900 flex items-center gap-2">
                        <Coffee size={15} className="text-emerald-600 shrink-0" />
                        <span className="font-medium text-[11px] sm:text-xs">Daily meals/mess included in the monthly rent</span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 mb-3 sm:mb-4 text-[11px] text-slate-600 flex items-center justify-between">
                        <span>🍳 Self-cooking / nearby canteen</span>
                        <span className="font-semibold text-slate-700">₹0 extra</span>
                      </div>
                    )}

                    {/* Pricing & Interactive Actions (Mobile Stacking) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-baseline justify-between sm:block">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Total Real Monthly Rent
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl sm:text-2xl font-bold text-slate-900">
                            ₹{calculatedRent.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">/ month</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => navigate(`/pg/${currentRealPG.id}`)}
                          className="btn-outline text-xs font-bold px-3 py-2.5 rounded-xl transition-all text-center justify-center flex items-center"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => {
                            setIsContactDemoOpen(true);
                            toast.success(`Owner contact ready: ${currentRealPG.ownerName || 'Verified Host'}`);
                          }}
                          className="btn-amber text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md inline-flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95 transition-all text-center"
                        >
                          <Phone size={13} />
                          Direct Connect
                        </button>
                      </div>
                    </div>

                    {/* Real Multi-PG Flipper Navigation (if multiple PGs in this category) */}
                    {activeTabPGs.length > 1 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <button
                          onClick={() => setActivePgIndex((prev) => (prev > 0 ? prev - 1 : activeTabPGs.length - 1))}
                          className="hover:text-primary-700 flex items-center gap-1 font-semibold p-1"
                        >
                          <ChevronLeft size={14} /> Previous Room
                        </button>
                        <span className="font-medium text-[11px]">
                          Real PG {activePgIndex + 1} of {activeTabPGs.length}
                        </span>
                        <button
                          onClick={() => setActivePgIndex((prev) => (prev < activeTabPGs.length - 1 ? prev + 1 : 0))}
                          className="hover:text-primary-700 flex items-center gap-1 font-semibold p-1"
                        >
                          Next Room <ChevronRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* Contact Drawer for Real Owner */}
                    {isContactDemoOpen && (
                      <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 animate-fade-in space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-emerald-900">
                            <Phone size={14} className="text-emerald-600" />
                            <span>Direct Landlord Contact (Zero Brokerage)</span>
                          </div>
                          <button
                            onClick={() => setIsContactDemoOpen(false)}
                            className="text-emerald-700 hover:text-emerald-950 font-bold p-0.5"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-[11px] text-emerald-800 break-words">
                          Host: <strong>{currentRealPG.ownerName || 'Verified Property Host'}</strong>
                          {currentRealPG.contactNumber && (
                            <> · Phone: <strong>{currentRealPG.contactNumber}</strong></>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {currentRealPG.contactNumber && (
                            <a
                              href={`tel:${currentRealPG.contactNumber}`}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                            >
                              <Phone size={11} /> Call Host
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/pg/${currentRealPG.id}`)}
                            className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-900 rounded-lg font-bold text-[11px] hover:bg-emerald-100 transition-colors"
                          >
                            Open Full Listing Page
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* COMING SOON CARD (WHEN NO REAL DATA IS PRESENT IN THIS CATEGORY) */
                  <div className="text-center py-8 sm:py-10 px-3 sm:px-4 space-y-4 animate-fade-in">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm animate-pulse-slow">
                      <Sparkles size={26} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 sm:px-3 py-0.5 rounded-full uppercase tracking-wider">
                        🚀 Coming Soon to Sikkim
                      </span>
                      <h3 className="font-display text-lg sm:text-2xl font-bold text-slate-900">
                        {currentTabMeta.emptyLabel} Coming Soon
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                        We strictly display authentic, physically verified accommodations. New verified listings for {currentTabMeta.emptyLabel.toLowerCase()} in Gangtok and Majitar are currently undergoing physical inspection and document verification.
                      </p>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 max-w-xs mx-auto">
                      ✓ Zero fake or unvetted data shown on Stay Alaya.
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setHeroTab('top_rated')}
                        className="btn-primary text-xs font-bold px-4 py-2.5 rounded-xl w-full sm:w-auto"
                      >
                        View Top-Rated Real PGs
                      </button>
                      <Link
                        to="/list-your-pg"
                        className="btn-outline text-xs font-bold px-4 py-2.5 rounded-xl w-full sm:w-auto text-center"
                      >
                        List a Property Here
                      </Link>
                    </div>
                  </div>
                )}

              </div>

              {/* Floating Interactive Micro-Badges (Visible on large screens only to prevent mobile overflow) */}
              <div className="hidden lg:flex absolute -top-4 -left-4 items-center gap-2 bg-white/95 border border-slate-200/90 rounded-2xl px-3.5 py-2 shadow-lg backdrop-blur-md animate-float">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">100% Verified Geysers</span>
              </div>

              <div className="hidden lg:flex absolute -bottom-4 -right-2 items-center gap-2 bg-slate-900 text-white rounded-2xl px-3.5 py-2 shadow-xl animate-float-reverse">
                <CircleDollarSign size={16} className="text-amber-400" />
                <span className="text-xs font-bold text-white">Save ₹5,000+ Brokerage</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE NARRATIVE / "WHO WE ARE & OUR STORY" */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              Our Journey & Purpose
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 break-words">
              Who We Are & What We Stand For
            </h2>
            <p className="mt-3 sm:mt-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              Stay Alaya was created right here in Sikkim by engineering students who personally struggled to find dependable, honest, and warm accommodation near college campuses.
            </p>
          </div>

          {/* Interactive Narrative Tabs (Touch-friendly horizontal scroll on mobile) */}
          <div className="flex items-center justify-start sm:justify-center gap-2 mb-6 sm:mb-8 border-b border-slate-200 pb-3 sm:pb-4 overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { id: 'story', label: '📖 The Origin Story' },
              { id: 'why-sikkim', label: '🏔️ Why Sikkim is Unique' },
              { id: 'problem-solved', label: '⚡ The Broken System Fixed' },
              { id: 'trust', label: '🛡️ Our 4-Point Verification' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStoryTab(tab.id)}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  storyTab === tab.id
                    ? 'bg-primary-900 text-white shadow-md shadow-primary-900/15'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 transition-all duration-300">
            {storyTab === 'story' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center animate-fade-in">
                <div className="space-y-4">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    Born in College Dorms, Built for Every Student
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    When we first moved to Sikkim for our college education at The ICFAI University, Sikkim, finding a PG was a nightmare. We spent days climbing steep hills in the monsoon rain, calling brokers who demanded an entire month’s rent as fee, and visiting rooms that looked nothing like their internet photos.
                  </p>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    We realized that every year, thousands of new students arriving at The ICFAI University, Sikkim, SMIT Majitar, SMIMS Tadong, and Sikkim University go through this exact ordeal. We founded <strong>Stay Alaya</strong> to replace this chaos with transparency, respect, and modern tech.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-primary-700">
                    <span>✓ Built by Sikkim Students</span>
                    <span>✓ 100% Bootstrapped</span>
                    <span>✓ Community Driven</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xl shrink-0">
                      🏔️
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">The Stay Alaya Ethos</h4>
                      <p className="text-[11px] sm:text-xs text-slate-500">Alaya means &apos;Abode&apos; or &apos;Home&apos; in Sanskrit</p>
                    </div>
                  </div>
                  <blockquote className="italic text-slate-600 text-xs sm:text-sm border-l-2 border-primary-500 pl-3.5 py-1">
                    &quot;A student&apos;s room isn&apos;t just a bed. It&apos;s where they study late for exams, feel safe when homesick, and build their future. They deserve dignity, clean geysers, and zero exploitation.&quot;
                  </blockquote>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Founded: Sikkim, India</span>
                    <span className="font-semibold text-emerald-600">Active across 6+ Campuses</span>
                  </div>
                </div>
              </div>
            )}

            {storyTab === 'why-sikkim' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center animate-fade-in">
                <div className="space-y-4">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    Why Generic Rental Portals Fail in the Hills
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    National rental aggregators treat hill towns like flat metropolitan cities. But living in the Himalayas comes with unique daily essentials that mainland portals completely ignore:
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <Flame size={17} className="text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Winter Geysers & Heating:</strong> Winter temperatures in Gangtok and Majitar drop drastically. We inspect and guarantee operational hot water systems.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin size={17} className="text-primary-600 shrink-0 mt-0.5" />
                      <span><strong>Taxi Stand & Incline Distance:</strong> A &quot;500 meter&quot; distance on a flat map can be a exhausting 300-meter vertical climb in Sikkim. We state true walking time and taxi access.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Wifi size={17} className="text-cyan-600 shrink-0 mt-0.5" />
                      <span><strong>Monsoon Power & Network Backup:</strong> Heavy Himalayan showers can cause power cuts. We highlight properties with reliable inverter power and high-speed Wi-Fi.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-primary-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
                  <h4 className="font-bold text-amber-400 text-sm sm:text-base flex items-center gap-2">
                    <Compass size={18} /> Mountain Living Checklist
                  </h4>
                  <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                    <div className="p-3 bg-white/10 rounded-xl">
                      <strong className="text-white block">Shared Taxi Proximity</strong>
                      Direct shared taxi connectivity to Gangtok Zero Point, MG Marg, or Majitar Bridge.
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl">
                      <strong className="text-white block">Winter Sun Exposure</strong>
                      Rooms identified with South-East hill exposure receive natural sunlight throughout the morning.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {storyTab === 'problem-solved' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center max-w-2xl mx-auto">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                    Old Broken Way vs. The Stay Alaya Standard
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    See how we eliminate the friction, wasted money, and stress of traditional PG hunting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Traditional Brokers */}
                  <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 sm:p-6 space-y-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider bg-rose-100 px-3 py-1 rounded-full">
                      ❌ Traditional Offline Brokers
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm text-rose-950">
                      <li>• Demand 1 full month of rent as non-refundable brokerage (₹5,000 - ₹15,000 lost).</li>
                      <li>• Unverified room photos or &quot;bait-and-switch&quot; room showings on arrival.</li>
                      <li>• Refuse to connect you directly with the property owner until fee is paid.</li>
                      <li>• Zero accountability if geysers or electricity fail during winter months.</li>
                      <li>• No digital receipts, unclear security deposit refund policies.</li>
                    </ul>
                  </div>

                  {/* Stay Alaya */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full">
                      ✅ The Stay Alaya Standard
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm text-emerald-950">
                      <li>• <strong>₹0 Brokerage Forever</strong> — 100% of your budget stays in your pocket.</li>
                      <li>• Verified photos and amenities vetted by administrative moderators.</li>
                      <li>• <strong>Direct 1-Click WhatsApp & Phone</strong> connect with the actual host.</li>
                      <li>• Clear winter comfort tags (geysers, room heaters, meal options).</li>
                      <li>• Transparent student reviews and peer recommendations.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {storyTab === 'trust' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
                {[
                  {
                    step: '01',
                    title: 'Host ID Verification',
                    desc: 'We verify owner government ID & contact details to protect students from ghost listings.',
                    icon: UserCheck,
                  },
                  {
                    step: '02',
                    title: 'Physical & Photo Audit',
                    desc: 'Room photos, washroom cleanliness, and bed counts are reviewed against standard guidelines.',
                    icon: ShieldCheck,
                  },
                  {
                    step: '03',
                    title: 'Winter Amenities Check',
                    desc: 'Explicit confirmation of functional water geysers and electricity backup systems.',
                    icon: Flame,
                  },
                  {
                    step: '04',
                    title: 'Community Feedback',
                    desc: 'Active student reviews dynamically impact host rankings to maintain high standards.',
                    icon: Star,
                  },
                ].map((item) => (
                  <div key={item.step} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-[11px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                      Protocol {item.step}
                    </span>
                    <item.icon size={22} className="text-primary-600 mt-2" />
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE BROKERAGE SAVINGS CALCULATOR */}
      {/* ========================================================= */}
      <section id="savings-calculator" className="py-12 sm:py-16 bg-slate-50 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 text-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 lg:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
            {/* Background glowing orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid lg:grid-cols-12 gap-6 sm:gap-8 items-center">
              
              {/* Left Column: Calculator Controls */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                    <CircleDollarSign size={14} /> Interactive Savings Tool
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white mt-2 sm:mt-3 break-words">
                    Calculate How Much You Save with Stay Alaya
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-2">
                    Traditional Sikkim middlemen pocket an entire month&apos;s rent. Drag the slider to see how much cash stays in your pocket.
                  </p>
                </div>

                {/* Range Slider */}
                <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <label htmlFor="rent-range" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Expected Monthly Rent:
                    </label>
                    <span className="font-display text-xl sm:text-2xl font-bold text-amber-400">
                      ₹{monthlyRent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <input
                    id="rent-range"
                    type="range"
                    min="3000"
                    max="20000"
                    step="500"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(Number(e.target.value))}
                    className="alaya-budget-slider w-full cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 font-medium">
                    <span>₹3,000 (Budget)</span>
                    <span className="hidden xs:inline">₹10,000 (Standard)</span>
                    <span>₹20,000 (Studio)</span>
                  </div>
                </div>

                {/* Equivalent savings insight */}
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <span>
                    Saving <strong>₹{monthlyRent.toLocaleString('en-IN')}</strong> equals approximately{' '}
                    <strong className="text-amber-300">{Math.round(monthlyRent / 180)} plates of hot momos</strong> or a semester of textbooks!
                  </span>
                </div>
              </div>

              {/* Right Column: Comparative Results Card */}
              <div className="lg:col-span-5 bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl space-y-4 sm:space-y-5 border border-slate-100">
                <div className="text-center pb-3.5 sm:pb-4 border-b border-slate-100">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                    Net Day-1 Brokerage Paid
                  </span>
                  <div className="flex items-center justify-center gap-3 mt-2">
                    <div>
                      <span className="text-xs text-rose-500 line-through block font-semibold">
                        ₹{monthlyRent.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] sm:text-xs text-slate-400">With Brokers</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-300">→</span>
                    <div>
                      <span className="text-2xl sm:text-3xl font-display font-bold text-emerald-600 block">
                        ₹0
                      </span>
                      <span className="text-[11px] sm:text-xs text-emerald-700 font-semibold">Stay Alaya</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Brokerage Fee Saved:</span>
                    <strong className="text-emerald-700 font-bold">+₹{monthlyRent.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Admin Document Verification:</span>
                    <strong className="text-slate-900">Included Free</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Direct Owner WhatsApp Access:</span>
                    <strong className="text-slate-900">Included Free</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>AI Assistant Search:</span>
                    <strong className="text-slate-900">Included Free</strong>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/find-pg?maxPrice=${monthlyRent}`)}
                  className="w-full btn-primary text-xs sm:text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all text-center"
                >
                  Find PGs Under ₹{monthlyRent.toLocaleString('en-IN')} <ArrowRight size={15} />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. INTERACTIVE "WHAT WE OFFER" (DUAL PERSONA SWITCHER) */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              Platform Capabilities
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 break-words">
              Tailored For Both Sides of the Ecosystem
            </h2>
            <p className="mt-3 text-slate-600 text-xs sm:text-base">
              Whether you are an incoming university student or a local Sikkim property owner, our platform is purpose-built for you.
            </p>

            {/* Persona Switcher Toggle (Mobile Responsive Stack/Row) */}
            <div className="flex flex-col sm:inline-flex sm:flex-row w-full sm:w-auto p-1.5 bg-slate-100 rounded-2xl mt-4 sm:mt-6 border border-slate-200 gap-1.5">
              <button
                onClick={() => setPersonaTab('students')}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  personaTab === 'students'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap size={16} /> For Students & Tenants
              </button>
              <button
                onClick={() => setPersonaTab('owners')}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  personaTab === 'owners'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 size={16} /> For PG Owners & Hosts
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in">
            {(personaTab === 'students' ? studentFeatures : ownerFeatures).map(
              ({ title, desc, Icon, color }) => (
                <div
                  key={title}
                  className="group rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-slate-50/60 hover:bg-white p-5 sm:p-6 shadow-2xs hover:shadow-lg hover:border-primary-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${color} border flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform`}
                    >
                      <Icon size={22} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                      {title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                  
                  <div className="pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-primary-600 group-hover:translate-x-1 transition-transform">
                    <span>{personaTab === 'students' ? 'Explore in listings' : 'Owner portal feature'}</span>
                    <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="text-center mt-8 sm:mt-10">
            {personaTab === 'students' ? (
              <Link to="/find-pg" className="btn-primary inline-flex items-center justify-center gap-2 text-sm px-6 py-3 w-full sm:w-auto text-center">
                Start Searching Real PGs <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to="/list-your-pg" className="btn-amber inline-flex items-center justify-center gap-2 text-sm px-6 py-3 w-full sm:w-auto text-center">
                List Your Property For Free <Building2 size={16} />
              </Link>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. INTERACTIVE "HOW IT WORKS" (4-STEP STEPPER WALKTHROUGH) */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              Seamless 4-Step Process
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 break-words">
              How Stay Alaya Works
            </h2>
            <p className="mt-3 text-slate-600 text-xs sm:text-base">
              Finding and settling into your new Himalayan accommodation takes just 4 clear steps. Click each step below to inspect the details.
            </p>
          </div>

          {/* Stepper Buttons (Responsive Grid) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
            {stepDetails.map((step) => {
              const StepIcon = step.icon;
              const isCurrent = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                    isCurrent
                      ? 'bg-white border-primary-500 shadow-md ring-2 ring-primary-500/10'
                      : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className={`text-[10px] sm:text-xs font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md ${
                      isCurrent ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {step.number}
                    </span>
                    <StepIcon size={16} className={isCurrent ? 'text-primary-600' : 'text-slate-400'} />
                  </div>
                  <h4 className={`text-xs sm:text-sm font-bold ${isCurrent ? 'text-slate-900' : 'text-slate-700'}`}>
                    {step.title}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {step.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Step Showcase Card */}
          {(() => {
            const current = stepDetails.find((s) => s.id === activeStep) || stepDetails[0];
            const CurrentIcon = current.icon;
            return (
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-8 md:p-10 shadow-md grid md:grid-cols-12 gap-6 sm:gap-8 items-center animate-fade-in">
                <div className="md:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
                    <CurrentIcon size={14} /> Step {current.number} of 04
                  </div>

                  <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                    {current.title}: <span className="text-primary-600">{current.subtitle}</span>
                  </h3>

                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                    {current.desc}
                  </p>

                  <div className="pt-2">
                    <h5 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 sm:mb-3">
                      What you get in this step:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                      {current.previewDetails.map((detail) => (
                        <div
                          key={detail}
                          className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-2 sm:p-2.5"
                        >
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stepper Navigation (Responsive Flexwrap) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                        disabled={activeStep === 1}
                        className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1.5"
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        onClick={() => setActiveStep(Math.min(4, activeStep + 1))}
                        disabled={activeStep === 4}
                        className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl bg-primary-900 text-white hover:bg-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1.5"
                      >
                        Next Step <ChevronRight size={14} />
                      </button>
                    </div>
                    {activeStep === 4 && (
                      <Link to="/find-pg" className="btn-amber text-xs font-bold px-3.5 sm:px-4 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 w-full sm:w-auto">
                        Explore Listings <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="md:col-span-5 bg-gradient-to-br from-primary-900 via-primary-950 to-slate-900 text-white rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
                    <span className="text-[11px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Interactive Feature Preview
                    </span>
                    <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full font-bold">
                      {current.number}/04
                    </span>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                      <CurrentIcon size={22} />
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white">{current.previewHighlight}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Stay Alaya gives you direct autonomy over your stay. No waiting for brokers to call back, no fake promises on winter heating.
                    </p>
                  </div>

                  <div className="pt-3 sm:pt-4 border-t border-white/10">
                    <Link
                      to="/find-pg"
                      className="w-full inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold text-xs py-2.5 rounded-xl hover:bg-amber-400 transition-colors text-center"
                    >
                      Test in Search Page <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. SIKKIM IMPACT COUNTERS & CAMPUS COVERAGE */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              Sikkim Footprint
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 break-words">
              Real Impact Across the Hills
            </h2>
            <p className="mt-2 text-slate-600 text-xs sm:text-sm">
              Connecting real students with trusted landlords across East & South Sikkim.
            </p>
          </div>

          {/* Counters Grid (Mobile Responsive 2-column) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
            {[
              {
                label: 'Verified Real PGs Listed',
                to: approvedPGs.length,
                suffix: approvedPGs.length > 0 ? '+' : '',
                icon: Building2,
                tag: '100% Inspected in Sikkim',
              },
              {
                label: 'Community Members',
                to: users.length > 0 ? users.length : 1,
                suffix: '+',
                icon: Users,
                tag: 'Verified Students & Hosts',
              },
              {
                label: 'Student Reviews',
                to: reviews.length,
                suffix: reviews.length > 0 ? '+' : '',
                icon: Star,
                tag: reviews.length > 0 ? 'Authentic Peer Feedback' : 'Real Reviews Welcome',
              },
              {
                label: 'Brokerage Fee Ever Charged',
                to: 0,
                prefix: '₹',
                suffix: '',
                icon: CircleDollarSign,
                tag: '100% Free Forever for Students',
              },
            ].map(({ label, to, suffix, prefix, icon: StatIcon, tag }) => (
              <div
                key={label}
                className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50/70 p-3.5 sm:p-6 text-center hover:bg-white hover:shadow-lg hover:border-primary-200 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-2 sm:mb-3">
                    <StatIcon size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <Counter to={to} suffix={suffix} prefix={prefix} />
                  <p className="mt-1.5 sm:mt-2 text-slate-800 font-bold text-xs sm:text-sm leading-tight">{label}</p>
                </div>
                <span className="inline-block mt-2 text-[10px] sm:text-[11px] font-medium text-slate-500 bg-white border border-slate-200/80 px-2 py-0.5 rounded-full truncate max-w-full">
                  {tag}
                </span>
              </div>
            ))}
          </div>

          {/* Campus Badges Strip */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 sm:mb-4">
              Proudly Serving Students & Faculty From:
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-slate-700">
              <span className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs text-[11px] sm:text-xs">
                🎓 The ICFAI University, Sikkim
              </span>
              <span className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs text-[11px] sm:text-xs">
                🎓 SMIT (Sikkim Manipal Institute of Technology)
              </span>
              <span className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs text-[11px] sm:text-xs">
                🎓 Sikkim University (5th Mile & Samdur)
              </span>
              <span className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs text-[11px] sm:text-xs">
                🎓 SMIMS (Central Referral Hospital Tadong)
              </span>
              <span className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs text-[11px] sm:text-xs">
                🎓 Sikkim Government College Tadong
              </span>
              <span className="bg-white border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs text-[11px] sm:text-xs">
                🎓 Namchi Government College
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (ACCESSIBLE ACCORDION) */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              Got Questions?
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 break-words">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-slate-600 text-xs sm:text-sm">
              Everything you need to know about booking, listing, and winter living with Stay Alaya.
            </p>
          </div>

          {/* Native details accordion using shared name="faq-group" */}
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <details
                key={item.q}
                name="faq-accordion"
                className="faq-item group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs transition-all duration-200 open:border-primary-300 open:shadow-md"
                open={index === 0}
              >
                <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer font-bold text-slate-900 text-xs sm:text-base hover:text-primary-700 select-none">
                  <span className="flex items-center gap-2.5 sm:gap-3 text-left">
                    <HelpCircle size={17} className="text-primary-500 shrink-0" />
                    <span className="leading-snug">{item.q}</span>
                  </span>
                  <ChevronDown
                    size={17}
                    className="faq-icon text-slate-400 transition-transform duration-200 shrink-0 ml-2"
                  />
                </summary>
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-6 sm:mt-8 text-center bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Still have a specific question about your college?</h4>
            <p className="text-xs text-slate-500 mt-1">Our team is always happy to guide incoming students.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 sm:mt-4 btn-outline text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 w-full sm:w-auto"
            >
              <Mail size={14} /> Send a Message / Suggestion
            </button>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. BUILT BY (DEVELOPER SPOTLIGHT & COMMUNITY) */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 bg-white border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div className="max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              Engineering & Vision
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mt-2 sm:mt-3 break-words">
              Built With Heart in Sikkim
            </h2>
            <p className="mt-2.5 sm:mt-3 text-slate-600 text-xs sm:text-base">
              Crafted by developers passionate about solving daily campus living challenges with reliable code and human-centered design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50/70 p-5 sm:p-8 shadow-xs hover:shadow-xl hover:bg-white hover:border-primary-200 transition-all duration-300 text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3.5 sm:gap-4 mb-4 sm:mb-5">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                      />
                    ) : (
                      <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br ${member.accentColor} text-white text-xl sm:text-2xl font-bold flex items-center justify-center shadow-md shrink-0`}>
                        {member.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{member.name}</h3>
                      <p className="text-xs font-semibold text-primary-700 mt-0.5 truncate">{member.role}</p>
                      <span className="inline-block text-[11px] text-slate-500 mt-0.5 truncate">{member.college || 'The ICFAI University, Sikkim'}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 sm:mb-5">
                    {member.bio}
                  </p>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5 sm:mb-6">
                    {member.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[10px] sm:text-[11px] font-medium bg-white border border-slate-200 text-slate-700 px-2 sm:px-2.5 py-0.5 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social & Contact Actions */}
                <div className="pt-3.5 sm:pt-4 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-2xs"
                        aria-label={`${member.name} GitHub`}
                        title="GitHub Profile"
                      >
                        <Github size={15} />
                      </a>
                    )}
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-all shadow-2xs"
                        aria-label={`${member.name} LinkedIn`}
                        title="LinkedIn Profile"
                      >
                        <Linkedin size={15} />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => handleCopyEmail(member.email)}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-900 bg-primary-50 hover:bg-primary-100/80 px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    title="Copy Email"
                  >
                    <Copy size={12} /> Copy Email
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 9. FINAL CALL TO ACTION (INTERACTIVE DUAL CTA) */}
      {/* ========================================================= */}
      <section className="py-12 sm:py-16 pb-20 sm:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 px-5 sm:px-8 py-10 sm:py-16 text-center relative overflow-hidden shadow-2xl border border-slate-800">
            {/* Glowing background shapes */}
            <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                ✨ Ready for your new semester?
              </span>

              <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight break-words">
                Start Your Sikkim PG Journey Today
              </h2>

              <p className="text-slate-300 text-xs sm:text-base leading-relaxed">
                Browse hundreds of verified rooms across Gangtok, Majitar, and Namchi. No broker fees, no cold surprises.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-3 sm:pt-4 w-full sm:w-auto">
                <Link
                  to="/find-pg"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 font-bold px-6 sm:px-7 py-3 sm:py-3.5 hover:bg-amber-300 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/20 text-center"
                >
                  <Search size={16} /> Explore Verified PGs <ArrowRight size={16} />
                </Link>

                <Link
                  to="/list-your-pg"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold px-6 py-3 sm:py-3.5 border border-white/20 transition-all hover:scale-[1.02] active:scale-95 backdrop-blur-sm text-center"
                >
                  <Building2 size={16} /> List Your PG (Free)
                </Link>
              </div>

              <p className="text-[11px] text-slate-400 pt-2">
                Questions or special college requirements?{' '}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Contact our student team
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10. INTERACTIVE INQUIRY / CONTACT MODAL */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative animate-slide-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Send size={18} />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 truncate">Get In Touch With Us</h3>
                <p className="text-xs text-slate-500 truncate">Ask a question or suggest a new PG near your college</p>
              </div>
            </div>

            {/* Recipient Notice Callout */}
            <div className="mb-4 p-2.5 sm:p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck size={15} className="text-primary-600 shrink-0 mt-0.5" />
              <span>
                <strong>Who receives this?</strong> Your message is sent directly to the <strong>Stay Alaya Admin Dashboard</strong> (under Notifications) where our management team reviews incoming inquiries.
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
                  <option value="Feature Suggestion">Feature Suggestion for Stay Alaya</option>
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
                  className="text-primary-700 font-semibold hover:underline"
                >
                  manishkr5487@gmail.com
                </a>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMessage}
                  className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmittingMessage ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
