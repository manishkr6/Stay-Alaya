import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  MailCheck,
  ArrowRight,
} from "lucide-react";
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

function getStrength(pwd) {
  if (!pwd) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { level: 1, label: "Weak", color: "bg-rose-500" };
  if (score <= 3) return { level: 2, label: "Medium", color: "bg-amber-400" };
  return { level: 3, label: "Strong", color: "bg-emerald-500" };
}

export default function Signup() {
  const { signup, loginWithGoogle, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-change carousel slides every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === "admin") navigate("/admin", { replace: true });
      else if (currentUser.role === "owner")
        navigate("/owner", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const pwd = watch("password", "");
  const strength = getStrength(pwd);

  const onSubmit = async ({ name, email, password }) => {
    setError("");
    try {
      await signup(name, email, password);
      setSubmittedEmail(email);
      toast.success(
        "Verification email sent! Please check your inbox and click the confirm link to activate your account.",
        { duration: 8000 }
      );
    } catch (e) {
      const msg = e?.message || "Signup failed";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists")
      ) {
        toast.error("This email is already registered. Please sign in.");
        navigate("/login");
      } else if (
        msg.toLowerCase().includes("rate limit") ||
        msg.toLowerCase().includes("security purposes")
      ) {
        setSubmittedEmail(email);
        toast.error(
          "Confirmation link was already sent! Please check your inbox or wait a moment before requesting another."
        );
      } else {
        setError(msg);
        toast.error(msg);
      }
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
      setError("Google Sign-In is temporarily unavailable. Please sign up with your email or try again later.");
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
            {submittedEmail ? (
              /* Email Sent Confirmation Card */
              <div className="text-center py-4 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <MailCheck size={32} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                  Welcome to{" "}
                  <span
                    className="font-serif font-black text-[#0f2547]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Stay <span className="text-[#f5a623]">Aalaya</span>
                  </span>
                </h1>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  We have sent a verification email to:
                  <br />
                  <span className="font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg inline-block mt-2 break-all border border-slate-200">
                    {submittedEmail}
                  </span>
                </p>

                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="w-full bg-[#18181b] hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Proceed to Login <ArrowRight size={16} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSubmittedEmail(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors block w-full py-1 cursor-pointer"
                  >
                    Entered the wrong email?{" "}
                    <span className="underline font-semibold text-slate-800">
                      Change email
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome to{" "}
                    <span
                      className="font-serif font-black text-[#0f2547]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      Stay <span className="text-[#f5a623]">Aalaya</span>
                    </span>
                    !
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-normal">
                    Create your account in just a few clicks • ₹0 Brokerage Guaranteed
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-4 py-3 rounded-xl mb-5 animate-fade-in">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                {/* Google OAuth Signup Button (Top Positioned) */}
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
                    or register with email
                  </span>
                </div>

                {/* Custom Signup Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      {...register("name", {
                        required: "Name is required",
                        minLength: {
                          value: 2,
                          message: "At least 2 characters",
                        },
                      })}
                      className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                      placeholder="Manish Kumar"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1 font-medium">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Your Email
                    </label>
                    <input
                      type="email"
                      {...register("email", {
                        required: "Email is required",
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
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        {...register("password", {
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "At least 6 characters",
                          },
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

                    {pwd && (
                      <div className="mt-2">
                        <div className="flex gap-1.5 mb-1">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${
                                i <= strength.level
                                  ? strength.color
                                  : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          Password strength:{" "}
                          <span className="font-semibold text-slate-700">
                            {strength.label}
                          </span>
                        </p>
                      </div>
                    )}
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1 font-medium">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      {...register("confirmPassword", {
                        required: "Please confirm password",
                        validate: (v) =>
                          v === pwd || "Passwords do not match",
                      })}
                      className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1 font-medium">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      {...register("terms", {
                        required: "You must agree to terms",
                      })}
                      className="mt-0.5 w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300 accent-slate-900 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      I agree to the{" "}
                      <Link
                        to="/terms-of-service"
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/privacy-policy"
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-red-500 text-xs font-medium">
                      {errors.terms.message}
                    </p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 bg-[#18181b] hover:bg-black text-white font-semibold py-3.5 px-4 rounded-xl text-sm transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <span>Register</span>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs sm:text-sm text-slate-500 mt-6">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-blue-600 font-semibold hover:underline transition-colors"
                  >
                    Login
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
