import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, Mail, User, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

function getStrength(pwd) {
  if (!pwd) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { level: 1, label: "Weak", color: "bg-red-400" };
  if (score <= 3) return { level: 2, label: "Medium", color: "bg-amber-400" };
  return { level: 3, label: "Strong", color: "bg-emerald-400" };
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const pwd = watch("password", "");
  const strength = getStrength(pwd);

  const onSubmit = async ({ name, email, password }) => {
    try {
      const result = await signup(name, email, password);
      if (result?.requiresOtp) {
        toast.success(result?.message || "OTP sent to your email");
        navigate("/verify-otp", {
          state: {
            email: result.email || email,
            purpose: "signup",
          },
        });
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || "Signup failed");
    }
  };

  return (
    <div className="relative min-h-screen pt-16 overflow-hidden bg-slate-100 -mt-16">
      <div className="lg:hidden absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/55" />
      </div>

      <div className="relative z-10 min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
        <section className="hidden lg:flex relative p-10 xl:p-14 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80"
            alt="Sikkim hills"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/35 via-slate-900/20 to-slate-900/55" />

          <div className="relative z-10 w-full flex flex-col justify-between">
            <div className="mt-12">
              <h2 className="font-display text-white text-3xl font-semibold">
                Stay Alaya
              </h2>
              <h3 className="mt-14 font-sans text-5xl leading-tight font-bold text-white max-w-md">
                Join Our Growing
                <br />
                Community
              </h3>
              <p className="mt-5 text-slate-100/95 text-lg max-w-md leading-relaxed">
                Create your account and start exploring verified PG
                accommodations with confidence.
              </p>
            </div>

            <div className="space-y-3 max-w-xl">
              {[
                "Find and compare PG listings easily",
                "Save your favorite properties",
                "Get direct access to owners",
                "Read real tenant reviews",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-xl border border-white/25 bg-white/10 backdrop-blur-md px-4 py-3 text-slate-100"
                >
                  <CheckCircle2
                    size={17}
                    className="text-emerald-300 shrink-0"
                  />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="w-full max-w-md rounded-3xl border border-white/70 lg:border-slate-200 bg-white/95 shadow-2xl lg:shadow-xl backdrop-blur-md p-6 sm:p-8 mt-12">
            <div className="mb-7">
              <h1 className="font-display text-3xl font-bold text-slate-900">
                Create Account
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Join Stay Alaya today
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    {...register("name", {
                      required: "Name is required",
                      minLength: { value: 2, message: "At least 2 characters" },
                    })}
                    className="input-field pl-10"
                    placeholder="Pema Sherpa"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

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
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: "Invalid email",
                      },
                    })}
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPass ? "text" : "password"}
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "At least 6 characters" },
                    })}
                    className="input-field pl-10 pr-10"
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
                {pwd && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1.5 rounded-full transition-colors ${i <= strength.level ? strength.color : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Password strength:{" "}
                      <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  {...register("confirmPassword", {
                    required: "Please confirm password",
                    validate: (v) => v === pwd || "Passwords do not match",
                  })}
                  className="input-field"
                  placeholder="********"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("terms", {
                    required: "You must agree to terms",
                  })}
                  className="mt-0.5 text-primary-600"
                />
                <span className="text-sm text-slate-600">
                  I agree to the{" "}
                  <Link
                    to="/terms-of-service"
                    className="text-primary-600 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-primary-600 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.terms && (
                <p className="text-red-500 text-xs">{errors.terms.message}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-sm disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary-600 font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
