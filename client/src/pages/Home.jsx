import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  Star,
  Phone,
  ArrowRight,
  Users,
  MapPin,
  Building2,
  CheckCircle2,
  Quote,
  Sparkles,
} from "lucide-react";
import { useData } from "../hooks/useData";
import PGCard from "../components/ui/PGCard";
import { SearchBar } from "../components/shared/index.jsx";

export default function Home() {
  const { getApprovedPGs } = useData();
  const navigate = useNavigate();
  const featured = getApprovedPGs().slice(0, 4);
  const featuredWithPlaceholders = [
    ...featured,
    ...Array.from({ length: Math.max(0, 4 - featured.length) }, (_, i) => ({
      id: `placeholder-${i}`,
      isPlaceholder: true,
    })),
  ];

  const stats = [
    { icon: Building2, value: "500+", label: "Verified PGs" },
    { icon: Users, value: "1,000+", label: "Happy Tenants" },
    { icon: MapPin, value: "50+", label: "Locations" },
  ];

  const steps = [
    {
      step: "01",
      icon: "🔍",
      title: "Search",
      desc: "Find PGs by location, budget, and preferences using our smart filters.",
    },
    {
      step: "02",
      icon: "📞",
      title: "Contact",
      desc: "Directly call or WhatsApp the owner. No middlemen, no hidden fees.",
    },
    {
      step: "03",
      icon: "🏠",
      title: "Move In",
      desc: "Every PG is admin-verified before listing. Stay with confidence.",
    },
  ];

  const features = [
    {
      Icon: Shield,
      title: "Admin Verified",
      desc: "Every PG is reviewed and approved by our admin team before going live.",
      bg: "bg-violet-100/50",
      color: "text-violet-600",
      border: "group-hover:border-violet-200",
    },
    {
      Icon: Star,
      title: "Real Reviews",
      desc: "Honest ratings and reviews from actual tenants who have stayed.",
      bg: "bg-amber-100/50",
      color: "text-amber-500",
      border: "group-hover:border-amber-200",
    },
    {
      Icon: Phone,
      title: "Direct Contact",
      desc: "Talk directly to property owners without any broker involvement.",
      bg: "bg-emerald-100/50",
      color: "text-emerald-500",
      border: "group-hover:border-emerald-200",
    },
  ];

  const testimonials = [
    {
      name: "Karma Bhutia",
      role: "Student, Sikkim University",
      quote:
        "Found my perfect PG in Tadong within hours. The platform is so easy to use and all listings are genuine!",
      rating: 5,
      initials: "KB",
    },
    {
      name: "Pema Sherpa",
      role: "IT Professional, Gangtok",
      quote:
        "After shifting to Gangtok for work, Stay Alaya saved me a lot of time and hassle. Highly recommend!",
      rating: 5,
      initials: "PS",
    },
    {
      name: "Anjali Rai",
      role: "Teacher, Namchi",
      quote:
        "The verified badge gave me confidence. The room was exactly as shown in the photos. Great service!",
      rating: 5,
      initials: "AR",
    },
  ];

  return (
    <div className="min-h-screen selection:bg-violet-200 selection:text-violet-900 bg-slate-50/30">
      {/* 1. HERO SECTION (Glassmorphism & Floating Elements) */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        {/* Background Image with animated scale */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80"
            // src="https://images.unsplash.com/photo-1721539151779-e6dc7f9de376?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Y2l0eSUyMGhvdGVsfGVufDB8fDB8fHww"
            alt="Sikkim mountains"
            className="w-full h-full object-cover scale-105 animate-[pulse_30s_ease-in-out_infinite_alternate]"
          />
          {/* Complex Gradient Overlay for better text readability */}
          {/* <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/10 to-slate-50" /> */}
          <div className="absolute inset-0 bg-black/45"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 mt-6 sm:mt-10 w-full flex flex-col items-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 py-1 px-3 sm:py-1.5 sm:px-4 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-sm text-slate-100 text-[11px] sm:text-xs font-semibold tracking-wider uppercase mb-6 sm:mb-8">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>Sikkim's #1 Trusted PG Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-center font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.15] mb-5 sm:mb-6 tracking-tight drop-shadow-md">
            Find Your Perfect PG in <br />
            <span className="relative inline-block mt-1 sm:mt-2">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-violet-300 to-indigo-200">
                Sikkim
              </span>
              {/* Highlight stroke behind text */}
              <span className="absolute bottom-1 sm:bottom-2 left-0 w-full h-3 sm:h-4 bg-violet-500/30 -z-10 rounded-full blur-sm"></span>
            </span>
          </h1>

          <p className="text-center text-slate-100 text-sm sm:text-base md:text-lg mb-8 sm:mb-12 max-w-2xl font-medium tracking-wide drop-shadow-[0_2px_12px_rgba(15,23,42,0.6)] bg-slate-900/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3">
            Discover verified paying guest accommodations, hostels, and rooms
            for rent without any broker fees.
          </p>

          {/* Glassmorphic Search & Stats Container */}
          <div className="w-full max-w-4xl bg-white/80 sm:bg-white/70 backdrop-blur-xl border border-white/60 p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] shadow-2xl shadow-violet-900/15">
            <div className="mb-5 sm:mb-8">
              <SearchBar />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-200/60">
              {stats.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center text-center px-1"
                >
                  <div className="flex items-center gap-1.5 text-slate-900 mb-0.5 sm:mb-1">
                    <Icon
                      size={18}
                      className="text-violet-600 hidden sm:block"
                    />
                    <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold">
                      {value}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[9px] sm:text-[10px] md:text-xs font-bold tracking-wider sm:tracking-widest uppercase">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (Refined with subtle connecting line) */}
      <section className="py-24 relative overflow-hidden bg-white">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <p className="text-violet-600 text-xs font-bold mb-3 uppercase tracking-widest">
              Simple Process
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Connecting Line (Desktop only) */}
            <div className="hidden md:block absolute top-[45px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-violet-200 to-transparent"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {steps.map((s) => (
                <div key={s.step} className="text-center group">
                  <div className="relative inline-flex items-center justify-center mb-8">
                    {/* Icon Circle */}
                    <div className="w-[90px] h-[90px] bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 flex items-center justify-center text-4xl relative z-10 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_8px_30px_rgb(124,58,237,0.15)]">
                      {s.icon}
                    </div>
                    {/* Floating Step Number Badge */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white z-20">
                      {s.step}
                    </div>
                  </div>
                  <h3 className="font-serif font-bold text-slate-900 text-xl mb-3">
                    {s.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed px-4">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED PGs (Interactive modern block) */}
      <section className="py-24 bg-slate-50/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_0%_100%,rgba(16,185,129,0.10),transparent_35%)]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div className="max-w-2xl">
              <p className="text-violet-600 text-xs font-bold mb-3 uppercase tracking-widest">
                Top Picks
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                Featured Residences
              </h2>
              <p className="text-slate-500 text-sm mt-3">
                Curated places with verified owners, transparent pricing, and
                fast move-in support.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
                <Sparkles size={14} className="text-amber-500" />
                <span>{featured.length} live picks</span>
              </div>
              <Link
                to="/find-pg"
                className="bg-white border border-slate-200 text-slate-700 hover:text-violet-700 hover:border-violet-200 px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 group transition-all shadow-sm hover:shadow-md"
              >
                View All{" "}
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2 mb-8">
            {["Under Rs5k", "Girls", "Boys", "Co-ed", "WiFi + Food"].map(
              (label) => (
                <button
                  key={label}
                  onClick={() => navigate("/find-pg")}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  {label}
                </button>
              ),
            )}
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredWithPlaceholders.map((pg) =>
              pg.isPlaceholder ? (
                <div
                  key={pg.id}
                  className="rounded-3xl border border-dashed border-slate-300 bg-white/70 backdrop-blur-sm p-6 flex flex-col justify-between min-h-[360px]"
                >
                  <div>
                    <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mb-4">
                      <Building2 size={18} />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-slate-900">
                      More verified PGs coming in this zone
                    </h3>
                    <p className="text-slate-500 text-sm mt-3">
                      List your property now and get discovered by students and
                      professionals.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/list-your-pg")}
                    className="mt-6 inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                  >
                    List Your PG <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div
                  key={pg.id}
                  className="transition-transform duration-300 hover:-translate-y-2"
                >
                  <PGCard pg={pg} />
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* 4. WHY TRUST US (Modern Bento-box style cards) */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Why Trust Stay Alaya?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ Icon, title, desc, bg, color, border }) => (
              <div
                key={title}
                className={`bg-white rounded-3xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100 group transition-all duration-500 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] ${border}`}
              >
                <div
                  className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`}
                >
                  <Icon size={24} className={color} />
                </div>
                <h3 className="font-serif font-bold text-slate-900 text-xl mb-3">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS (Quotes with elegant styling) */}
      <section className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-violet-600 text-xs font-bold mb-3 uppercase tracking-widest">
              Real Stories
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              What Our Tenants Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative group hover:shadow-xl hover:shadow-violet-900/5 transition-all duration-300"
              >
                <Quote className="absolute top-8 right-8 text-slate-100 w-12 h-12 group-hover:text-violet-50 transition-colors" />
                <div className="flex gap-1 mb-6 relative z-10">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-8 relative z-10 font-medium">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4 border-t border-slate-50 pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-violet-700 font-bold text-sm shadow-inner">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MODERN CALL TO ACTION (Floating Card Style) */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-[2.5rem] relative overflow-hidden py-20 px-6 text-center shadow-2xl shadow-slate-900/20">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Own a Property in Sikkim?
              </h2>
              <p className="text-slate-300 mb-10 text-lg font-light leading-relaxed">
                Join hundreds of owners who are finding verified tenants
                directly through our platform. No brokers, no fuss.
              </p>
              <Link
                to="/list-your-pg"
                className="bg-white text-slate-900 font-bold px-8 py-4 rounded-full hover:bg-violet-50 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] hover:scale-105 inline-flex items-center gap-2 group"
              >
                List Your PG For Free{" "}
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
