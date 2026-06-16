import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";

function Counter({ to, suffix = "" }) {
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
      { threshold: 0.35 },
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
      setCount(Math.floor(to * progress));
      if (progress >= 1) clearInterval(timer);
    }, frame);

    return () => clearInterval(timer);
  }, [started, to]);

  return (
    <span ref={ref} className="text-3xl md:text-4xl font-bold text-slate-900">
      {count}
      {suffix}
    </span>
  );
}

export default function About() {
  const missionCards = [
    {
      title: "Affordable Living",
      desc: "Helping students and professionals find quality PGs at budget-friendly prices.",
      Icon: CircleDollarSign,
      color: "from-emerald-100 to-teal-100 text-emerald-700",
    },
    {
      title: "Verified Listings",
      desc: "Promoting trust through quality checks and transparent listing information.",
      Icon: ShieldCheck,
      color: "from-indigo-100 to-violet-100 text-indigo-700",
    },
    {
      title: "Easy Booking Experience",
      desc: "Making discovery, comparison, and owner communication simple and quick.",
      Icon: ClipboardCheck,
      color: "from-amber-100 to-orange-100 text-amber-700",
    },
  ];

  const features = [
    { label: "Search PG by location", Icon: MapPin },
    { label: "Filter by price, amenities", Icon: Filter },
    { label: "Contact PG owners directly", Icon: MessageCircle },
    { label: "Add your own PG", Icon: Building2 },
    { label: "View ratings & reviews", Icon: Star },
    { label: "Dashboard for managing listings", Icon: LayoutDashboard },
  ];

  const steps = [
    {
      id: "01",
      title: "Search PG",
      desc: "Enter your preferred city or area and browse suitable PG options.",
      Icon: Search,
    },
    {
      id: "02",
      title: "Compare options",
      desc: "Check prices, amenities, reviews, and room details side by side.",
      Icon: BadgeCheck,
    },
    {
      id: "03",
      title: "Contact owner / Book",
      desc: "Connect directly with owners to confirm availability and details.",
      Icon: UserCheck,
    },
    {
      id: "04",
      title: "Move in",
      desc: "Finalize your stay and move into your preferred PG with confidence.",
      Icon: Users,
    },
  ];

  const developers = [
    {
      name: "Manish Kumar Baitha",
      role: "Full Stack Developer / AI-ML Engineer",
      desc: "Passionate about building useful web apps that solve real-world problems with clean UI and practical user experiences.",
      initials: "MB",
      image: "https://ik.imagekit.io/manishkr5487/My-Photo/manish%20profile.png?updatedAt=1770699074406",
      gradient: "from-primary-500 to-cyan-500",
      social: true,
    },
    {
      name: "Rohit Singh",
      role: "Full Stack Developer",
      desc: "Focused on building reliable full-stack features with clean structure and smooth user flows.",
      initials: "RS",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      name: "Anu Kumari",
      role: "Full Stack Developer",
      desc: "Dedicated to creating practical web experiences with thoughtful design and dependable functionality.",
      initials: "AK",
      gradient: "from-rose-500 to-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.16),transparent_40%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-fade-in">
              <p className="inline-flex items-center rounded-full bg-white/80 border border-slate-200 px-3 py-1 text-xs font-semibold text-primary-700 mb-5">
                About Stay Alaya
              </p>
              <h1 className="font-display text-4xl md:text-6xl font-bold text-slate-900 leading-tight">
                Find Your Perfect PG Stay
              </h1>
              <p className="mt-5 text-slate-600 text-base md:text-lg max-w-xl">
                Connecting students and professionals with safe and verified PG
                accommodations.
              </p>
              <Link
                to="/find-pg"
                className="btn-primary inline-flex items-center gap-2 mt-8"
              >
                Explore PGs <ArrowRight size={16} />
              </Link>
            </div>

            <div className="relative h-[300px] md:h-[380px] rounded-3xl border border-white/70 bg-white/60 backdrop-blur-xl shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(255,255,255,0.8),rgba(56,189,248,0.16))]" />
              <div className="absolute top-10 left-8 w-24 h-24 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center animate-[float_4s_ease-in-out_infinite]">
                <Building2 className="text-primary-600" size={34} />
              </div>
              <div className="absolute top-24 right-10 w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center animate-[float_5s_ease-in-out_infinite]">
                <Search className="text-cyan-600" size={30} />
              </div>
              <div className="absolute bottom-10 left-16 w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
                <ShieldCheck className="text-emerald-600" size={30} />
              </div>
              <div className="absolute bottom-12 right-12 w-28 h-28 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center animate-[float_4.8s_ease-in-out_infinite]">
                <MapPin className="text-violet-600" size={34} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
            Who We Are
          </h2>
          <p className="mt-6 text-slate-600 text-base md:text-lg leading-relaxed">
            Stay Alaya is a modern platform that helps users discover paying
            guest accommodations quickly, compare options with clarity, and
            connect directly with property owners. We also empower owners to
            list and manage their own PGs so the whole process stays
            transparent, efficient, and user-friendly.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
              Our Mission
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {missionCards.map(({ title, desc, Icon, color }) => (
              <div
                key={title}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}
                >
                  <Icon size={26} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
              What We Offer
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ label, Icon }) => (
              <div
                key={label}
                className="rounded-2xl bg-slate-50 border border-slate-200 p-5 hover:border-primary-200 hover:bg-white hover:shadow-md transition-all duration-300"
              >
                <Icon size={20} className="text-primary-600 mb-3" />
                <p className="text-slate-700 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ id, title, desc, Icon }) => (
              <div
                key={id}
                className="relative rounded-3xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <span className="absolute top-4 right-4 text-4xl font-bold text-slate-100">
                  {id}
                </span>
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center hover:bg-white hover:shadow-md transition-all">
              <Counter to={500} suffix="+" />
              <p className="mt-2 text-slate-600 font-medium">PGs listed</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center hover:bg-white hover:shadow-md transition-all">
              <Counter to={1000} suffix="+" />
              <p className="mt-2 text-slate-600 font-medium">Users</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center hover:bg-white hover:shadow-md transition-all">
              <Counter to={50} suffix="+" />
              <p className="mt-2 text-slate-600 font-medium">Owners</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900">
            Built By
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {developers.map(
              ({ name, role, desc, initials, image, gradient, social }) => (
                <div
                  key={name}
                  className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={name}
                      className="w-24 h-24 mx-auto rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                  ) : (
                    <div
                      className={`w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br ${gradient} text-white text-2xl font-bold flex items-center justify-center`}
                    >
                      {initials}
                    </div>
                  )}
                  <h3 className="mt-5 text-2xl font-semibold text-slate-900">
                    {name}
                  </h3>
                  <p className="text-primary-700 font-medium mt-1">{role}</p>
                  <p className="mt-4 text-slate-600 max-w-xl mx-auto">{desc}</p>
                  {social && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <a
                        href="#"
                        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        aria-label="GitHub"
                      >
                        <Github size={18} />
                      </a>
                      <a
                        href="#"
                        className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        aria-label="LinkedIn"
                      >
                        <Linkedin size={18} />
                      </a>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="py-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-slate-900 px-6 py-14 text-center relative overflow-hidden">
            <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full bg-primary-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-500/30 blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
                Start Your PG Search Today
              </h2>
              <Link
                to="/find-pg"
                className="inline-flex mt-7 items-center gap-2 rounded-xl bg-white text-slate-900 font-semibold px-6 py-3 hover:bg-slate-100 transition-all hover:scale-[1.02]"
              >
                Browse PGs <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
