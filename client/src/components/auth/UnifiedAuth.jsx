import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  GraduationCap,
  Building2,
  ArrowRight,
  MailCheck,
  ShieldCheck,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

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

export default function UnifiedAuth({ initialMode = "login" }) {
  const { login, signup, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode Toggle: 'login' | 'signup'
  const [mode, setMode] = useState(
    location.pathname === "/signup" ? "signup" : initialMode
  );

  // Role Toggle: 'student' | 'owner'
  const [selectedRole, setSelectedRole] = useState("student");

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [error, setError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [submittedEmail, setSubmittedEmail] = useState(null);

  // Remember email preference
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

  // Update mode based on location pathname if user clicks browser back/forward
  useEffect(() => {
    if (location.pathname === "/signup" && mode !== "signup") {
      setMode("signup");
    } else if (location.pathname === "/login" && mode !== "login") {
      setMode("login");
    }
  }, [location.pathname, mode]);

  // Handle redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (currentUser.role === "owner") {
        if (!currentUser.owner_form_submitted) {
          navigate("/list-your-pg", { replace: true });
        } else if (!currentUser.admin_approved) {
          navigate("/owner/pending", { replace: true });
        } else {
          navigate("/owner", { replace: true });
        }
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, currentUser, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      email: savedEmail,
      password: "",
      confirmPassword: "",
      remember: Boolean(savedEmail) ? savedRemember : false,
      terms: false,
    },
  });

  const pwd = watch("password", "");
  const strength = getStrength(pwd);

  // Switch mode handler
  const handleModeSwitch = (newMode) => {
    setError("");
    setSubmittedEmail(null);
    setMode(newMode);
    navigate(newMode === "login" ? "/login" : "/signup", { replace: true });
  };

  const onSubmit = async (values) => {
    setError("");

    if (mode === "login") {
      try {
        const { email, password, remember } = values;
        if (remember) {
          localStorage.setItem("stayaalaya_remember_email", email.trim().toLowerCase());
          localStorage.setItem("stayaalaya_remember_me", "true");
        } else {
          localStorage.removeItem("stayaalaya_remember_email");
          localStorage.setItem("stayaalaya_remember_me", "false");
        }

        const result = await login(email, password, remember);
        const user = result?.user;
        if (!user) return;

        toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);

        // Strict role routing
        if (user.role === "admin") {
          navigate("/admin", { replace: true });
        } else if (user.role === "owner") {
          if (!user.owner_form_submitted) {
            navigate("/list-your-pg", { replace: true });
          } else if (!user.admin_approved) {
            navigate("/owner/pending", { replace: true });
          } else {
            navigate("/owner", { replace: true });
          }
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (e) {
        const message =
          e?.response?.data?.message || e.message || "Invalid email or password";
        setError(message);
        toast.error(message);
      }
    } else {
      // Sign Up Flow
      const { name, email, password, confirmPassword } = values;
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      try {
        await signup(name, email, password, selectedRole);
        setSubmittedEmail(email);
        toast.success(
          "Verification email sent! Please check your inbox to confirm your account.",
          { duration: 8000 }
        );
      } catch (e) {
        const msg = e?.message || "Signup failed";
        if (
          msg.toLowerCase().includes("already registered") ||
          msg.toLowerCase().includes("already exists")
        ) {
          toast.error("This email is already registered. Please sign in.");
          handleModeSwitch("login");
        } else if (
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("security purposes")
        ) {
          setSubmittedEmail(email);
          toast.error(
            "Confirmation link was already sent! Please check your inbox or wait a moment."
          );
        } else {
          setError(msg);
          toast.error(msg);
        }
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* ================= LEFT AUTO-CHANGING CAROUSEL HERO ================= */}
        <section className="relative hidden lg:block overflow-hidden bg-slate-950 select-none min-h-screen">
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

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/20" />

          <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
            <div className="max-w-lg transition-all duration-500 transform">
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
        <section className="flex flex-col justify-start lg:justify-center items-center pt-[76px] sm:pt-[88px] lg:pt-10 pb-8 sm:pb-10 px-6 sm:px-10 lg:px-14 bg-white min-h-screen">
          <div className="w-full max-w-[430px]">
            {/* Brand Header */}
            <div className="mb-5 sm:mb-6 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {mode === "login" ? "Welcome Back to " : "Join "}
                <span
                  className="font-serif font-black text-[#0f2547]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Stay <span className="text-[#f5a623]">Aalaya</span>
                </span>
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-normal">
                {mode === "login"
                  ? "Sign in to access your verified account"
                  : "Create an account to discover or list accommodations"}
              </p>
            </div>

            {/* 1. MODE TOGGLE: Log In vs Sign Up */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center mb-5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleModeSwitch("login")}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "login"
                    ? "bg-[#0f2547] text-[#f5a623] shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("signup")}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "signup"
                    ? "bg-[#0f2547] text-[#f5a623] shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* 2. ROLE TOGGLE: Student/Tenant vs PG Owner */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Select Your Account Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRole("student")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedRole === "student"
                      ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        selectedRole === "student"
                          ? "bg-[#0f2547] text-[#f5a623]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <GraduationCap size={16} />
                    </div>
                    {selectedRole === "student" && (
                      <span className="w-2 h-2 rounded-full bg-[#f5a623]" />
                    )}
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      Student / Tenant
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {mode === "login" ? "Tenant Login" : "Browse & Book"}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole("owner")}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedRole === "owner"
                      ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/40 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                        selectedRole === "owner"
                          ? "bg-[#0f2547] text-[#f5a623]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Building2 size={16} />
                    </div>
                    {selectedRole === "owner" && (
                      <span className="w-2 h-2 rounded-full bg-[#f5a623]" />
                    )}
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      PG Owner
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {mode === "login" ? "Host Login" : "List Stays & Manage"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm px-4 py-3 rounded-xl mb-5 animate-fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Signup Success Confirmation Card */}
            {submittedEmail ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 text-center space-y-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <MailCheck size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Verify Your Email Address
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    We sent a verification link to{" "}
                    <span className="font-semibold text-slate-900">
                      {submittedEmail}
                    </span>
                    . Click the link inside to activate your {selectedRole === "owner" ? "Owner" : "Student"} account.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedEmail(null);
                      handleModeSwitch("login");
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#0f2547] text-white hover:bg-[#1a3a6b] transition-all cursor-pointer shadow-xs"
                  >
                    Proceed to Log In <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* Email/Password Form */
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Full Name (Sign Up only) */}
                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      {...register("name", {
                        required: mode === "signup" ? "Please enter your name" : false,
                        minLength: {
                          value: 2,
                          message: "Name must be at least 2 characters",
                        },
                      })}
                      className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                      placeholder="e.g. Tenzing Norbu"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1 font-medium">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    {...register("email", {
                      required: "Please enter your email",
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                    className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                    placeholder="example@gmail.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 font-medium">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPass ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      {...register("password", {
                        required: "Please enter your password",
                        minLength:
                          mode === "signup"
                            ? {
                                value: 6,
                                message: "Password must be at least 6 characters",
                              }
                            : undefined,
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

                  {/* Password Strength Indicator (Signup only) */}
                  {mode === "signup" && pwd && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1.5 h-1">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              strength.level >= step
                                ? strength.color
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Strength:{" "}
                        <span className="font-semibold text-slate-700">
                          {strength.label}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password (Signup only) */}
                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="auth-confirm-password"
                      className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-confirm-password"
                        type={showConfirmPass ? "text" : "password"}
                        autoComplete="new-password"
                        {...register("confirmPassword", {
                          required: mode === "signup" ? "Please confirm your password" : false,
                          validate: (val) => {
                            if (mode === "signup" && watch("password") !== val) {
                              return "Passwords do not match";
                            }
                            return true;
                          },
                        })}
                        className="w-full rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 py-3 pl-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1 font-medium">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Remember Me & Forgot Password (Login only) */}
                {mode === "login" ? (
                  <div className="flex items-center justify-between pt-1">
                    <label
                      htmlFor="remember-me"
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
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
                      className="text-xs text-[#0f2547] hover:underline font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>
                ) : (
                  /* Terms of Service (Signup only) */
                  <div className="pt-1">
                    <label
                      htmlFor="auth-terms"
                      className="flex items-start gap-2.5 cursor-pointer select-none"
                    >
                      <input
                        id="auth-terms"
                        type="checkbox"
                        {...register("terms", {
                          required: mode === "signup" ? "You must agree to the Terms of Service" : false,
                        })}
                        className="w-4 h-4 mt-0.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300 accent-slate-900 cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed font-normal">
                        I agree to Stay Aalaya&apos;s{" "}
                        <Link
                          to="/terms-of-service"
                          className="text-[#0f2547] font-semibold hover:underline"
                        >
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                          to="/privacy-policy"
                          className="text-[#0f2547] font-semibold hover:underline"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="text-red-500 text-xs mt-1 font-medium">
                        {errors.terms.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0f2547] hover:bg-[#1a3a6b] text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      <span>
                        {mode === "login" ? "Authenticating..." : "Creating Account..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === "login"
                          ? `Sign In as ${selectedRole === "owner" ? "PG Owner" : "Student"}`
                          : `Create ${selectedRole === "owner" ? "PG Owner" : "Student"} Account`}
                      </span>
                      <ArrowRight size={16} className="text-[#f5a623]" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom Footer Note */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Secured via Supabase PostgreSQL Authentication</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

