import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

const SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1600&q=80",
    badge: "Sikkim Ground Team Verified",
    title: "Find Your Ideal Stay in Sikkim",
    subtitle:
      "100% physically inspected rooms & PGs near SMIT Majitar, Sikkim University, Gangtok & Namchi with verified amenities.",
    highlights: ["100% Verified", "Zero Middlemen", "Direct Owner Connect"],
  },
  {
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1600&q=80",
    badge: "100% Zero Brokerage Fee",
    title: "Zero Brokerage Guaranteed",
    subtitle:
      "Never pay 50-100% rent to middlemen. Connect directly with trusted local landlords via WhatsApp or direct call.",
    highlights: ["₹0 Platform Fee", "Transparent Rents", "Direct Landlord Contact"],
  },
  {
    image:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80",
    badge: "Student & Intern Living",
    title: "Comfort & Community",
    subtitle:
      "Study-friendly accommodations equipped with winter geysers, high-speed Wi-Fi, and nutritious wholesome mess meals.",
    highlights: ["Winter Geysers", "High-Speed Wi-Fi", "Nutritious Meals"],
  },
  {
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&q=80",
    badge: "Prime Campus Locations",
    title: "Majitar, Gangtok & Tadong",
    subtitle:
      "Close to SMIT campus, ICFAI, SRM & Manipal Hospital. Save commute time with stays near verified taxi stands.",
    highlights: ["SMIT Opposite PGs", "Tadong Taxi Stand", "Safe Neighborhoods"],
  },
];

export default function Login() {
  const { login, loginWithGoogle, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Remember Me: Load saved email from localStorage (or redirected state)
  const savedEmail =
    location.state?.email ||
    localStorage.getItem("stayaalaya_remember_email") ||
    localStorage.getItem("stayalaya_remember_email") ||
    "";
  const savedRemember =
    (localStorage.getItem("stayaalaya_remember_me") ||
      localStorage.getItem("stayalaya_remember_me")) !== "false";

  // Auto-change carousel slides every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (
        location.search.includes("verified=true") ||
        location.hash.includes("access_token")
      ) {
        toast.success(
          `Welcome to Stay Aalaya, ${currentUser.name?.split(" ")[0] || "User"}!`,
          { id: "auth-success-toast" }
        );
      }
      if (currentUser.role === "admin") navigate("/admin", { replace: true });
      else if (currentUser.role === "owner")
        navigate("/owner", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, location]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: savedEmail,
      password: "",
      remember: Boolean(savedEmail) ? savedRemember : false,
    },
  });

  // Ensure remembered email and checkbox state are pre-filled on initial mount
  useEffect(() => {
    if (savedEmail) {
      setValue("email", savedEmail);
      setValue("remember", savedRemember);
    }
  }, [savedEmail, savedRemember, setValue]);

  const onSubmit = async ({ email, password, remember }) => {
    setError("");
    try {
      // Manage Remember Me email persistence
      if (remember) {
        localStorage.setItem("stayaalaya_remember_email", email.trim().toLowerCase());
        localStorage.setItem("stayaalaya_remember_me", "true");
        localStorage.removeItem("stayalaya_remember_email");
        localStorage.removeItem("stayalaya_remember_me");
      } else {
        localStorage.removeItem("stayaalaya_remember_email");
        localStorage.setItem("stayaalaya_remember_me", "false");
        localStorage.removeItem("stayalaya_remember_email");
        localStorage.removeItem("stayalaya_remember_me");
      }

      const result = await login(email, password, remember);
      const user = result?.user;
      if (!user) return;
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "owner") navigate("/owner");
      else navigate("/dashboard");
    } catch (e) {
      const message =
        e?.response?.data?.message || e.message || "Invalid email or password";
      setError(message);
      toast.error(message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      // When enabled in Supabase, redirects to Google consent
    } catch (e) {
      setIsGoogleLoading(false);
      console.error("Google sign in error:", e);
      setError("Google Sign-In is temporarily unavailable. Please sign in with your email or try again later.");
      toast.error("Google Sign-In is currently unavailable");
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* ================= LEFT AUTO-CHANGING CAROUSEL HERO ================= */}
        <section className="relative hidden lg:block overflow-hidden bg-slate-950 select-none min-h-screen">
          {/* Slides Images with crossfade */}
          {SLIDES.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                currentSlide === idx
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-105 pointer-events-none"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ))}

          {/* Cinematic Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/20" />

          {/* Auto-changing information at the bottom left */}
          <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
            <div className="max-w-lg transition-all duration-500 transform">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-amber-300 mb-3.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-pulse" />
                <span>{SLIDES[currentSlide].badge}</span>
              </div>

              <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-black tracking-tight leading-tight drop-shadow-md">
                {SLIDES[currentSlide].title}
              </h2>
              <p className="mt-3 text-slate-200/95 text-sm xl:text-base leading-relaxed drop-shadow-sm font-normal">
                {SLIDES[currentSlide].subtitle}
              </p>

              {/* Highlights */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {SLIDES[currentSlide].highlights.map((highlight, hIdx) => (
                  <span
                    key={hIdx}
                    className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg bg-black/45 backdrop-blur-sm border border-white/10 text-slate-200"
                  >
                    <span className="text-[#f5a623] mr-1.5 font-bold">✓</span> {highlight}
                  </span>
                ))}
              </div>
            </div>

            {/* Slider Dots & Active Progress Bar (matching the design — • •) */}
            <div className="flex items-center gap-2 mt-6">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === idx
                      ? "w-8 bg-white shadow-sm"
                      : "w-2 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ================= RIGHT FORM SECTION ================= */}
        <section className="flex flex-col justify-start lg:justify-center items-center pt-[76px] sm:pt-[88px] lg:pt-12 pb-8 sm:pb-10 px-6 sm:px-10 lg:px-14 bg-white min-h-screen">
          <div className="w-full max-w-[430px]">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome Back to{" "}
                <span
                  className="font-serif font-black text-[#0f2547]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Stay <span className="text-[#f5a623]">Aalaya</span>
                </span>
                !
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-normal">
                Sign in to your account • Sikkim&apos;s Verified Room &amp; PG Finder
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-4 py-3 rounded-xl mb-5 animate-fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Google OAuth Login Button (Top Positioned) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white text-slate-700 font-semibold py-3 px-4 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-2xs active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-600" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-5 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-xs text-slate-400 font-medium">
                or sign in with email
              </span>
            </div>

            {/* Custom Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Your Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  {...register("email", {
                    required: "Please enter your email",
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: "Please enter a valid email",
                    },
                  })}
                  className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                  placeholder="example786@gmail.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password", {
                      required: "Please enter your password",
                    })}
                    className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-1">
                <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="remember-me"
                    type="checkbox"
                    {...register("remember")}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 accent-slate-900 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    Remember Me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-blue-600 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-[#18181b] hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs sm:text-sm text-slate-500 mt-6">
              Don&apos;t have any account?{" "}
              <Link
                to="/signup"
                className="text-blue-600 font-semibold hover:underline transition-colors"
              >
                Register
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
