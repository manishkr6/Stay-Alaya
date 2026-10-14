import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  ShieldCheck,
  MapPin,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { login, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (location.search.includes("verified=true") || location.hash.includes("access_token")) {
        toast.success("Email confirmed successfully! Welcome to Stay Alaya.", {
          id: "email-confirmed-toast",
        });
      }
      if (currentUser.role === "admin") navigate("/admin", { replace: true });
      else if (currentUser.role === "owner") navigate("/owner", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate, location]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setError("");
    try {
      const result = await login(email, password);
      const user = result?.user;
      if (!user) return;
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "owner") navigate("/owner");
      else navigate("/dashboard");
    } catch (e) {
      const message = e?.response?.data?.message || e.message || "Login failed";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="relative min-h-screen pt-16 overflow-hidden bg-slate-100">
      <div className="lg:hidden absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/50" />
      </div>

      <div className="relative z-10 min-h-[calc(100svh-4rem)] lg:h-[calc(100svh-4rem)] grid grid-cols-1 lg:grid-cols-2">
        <section className="hidden lg:flex relative p-10 xl:p-14 overflow-hidden lg:h-[calc(100svh-4rem)]">
          <img
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=80"
            alt="Sikkim mountains"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/35 via-slate-900/25 to-slate-900/50" />

          <div className="relative z-10 w-full flex flex-col justify-between">
            <div className="mt-12">
              <h2 className="font-display text-white text-3xl font-semibold">
                Stay Alaya
              </h2>
              <h3 className="mt-14 font-sans text-5xl leading-tight font-bold text-white max-w-md">
                Your Home Away
                <br />
                From Home
              </h3>
              <p className="mt-5 text-slate-100/95 text-lg max-w-md leading-relaxed">
                Discover verified PG accommodations across Sikkim&apos;s most
                beautiful locations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-xl">
              {[
                { n: "500+", l: "Verified PGs", Icon: Building2 },
                { n: "50+", l: "Locations", Icon: MapPin },
                { n: "1000+", l: "Happy Tenants", Icon: ShieldCheck },
                { n: "4.7+", l: "Avg Rating", Icon: Mail },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-white/30 bg-white/15 backdrop-blur-md px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-bold text-white">
                      {s.n}
                    </span>
                    <s.Icon size={16} className="text-white/80" />
                  </div>
                  <div className="text-slate-100 text-sm mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-md rounded-3xl border border-white/70 lg:border-slate-200 bg-white/95 shadow-2xl lg:shadow-xl backdrop-blur-md p-6 sm:p-8">
            <div className="mb-7">
              <h1 className="font-display text-3xl font-bold text-slate-900">
                Welcome Back
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Sign in to your account
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    {...register("email", { required: "Email is required" })}
                    className="input-field pl-10"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    {...register("password", {
                      required: "Password is required",
                    })}
                    className="input-field pr-10"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-sm disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="text-primary-600 font-semibold hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
