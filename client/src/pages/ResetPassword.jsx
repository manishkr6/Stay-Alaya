import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword, logout } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const password = watch('password', '');

  const onSubmit = async ({ password: nextPassword }) => {
    try {
      await resetPassword(token, nextPassword);
      setIsSuccess(true);
      // Cleanly sign out recovery session so user can re-login with their new password
      await logout(null);
      toast.success('Password updated successfully! Please log in with your new password.', {
        duration: 5000,
      });
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1800);
    } catch (e) {
      toast.error(
        e?.response?.data?.message ||
          e.message ||
          'Could not reset password. Your reset link may have expired.'
      );
    }
  };

  return (
    <div className="relative min-h-screen pt-16 overflow-hidden bg-slate-100">
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10 min-h-[calc(100svh-4rem)]">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl p-6 sm:p-8 transition-all">
          {isSuccess ? (
            <div className="space-y-6 text-center animate-fade-in py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Password Updated!
                </h1>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Your password has been changed successfully. You can now log in with your new password.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="btn-primary w-full py-3 text-sm inline-flex items-center justify-center gap-2"
                >
                  Sign In Now <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-7">
                <h1 className="font-display text-3xl font-bold text-slate-900">Reset Password</h1>
                <p className="text-slate-500 text-sm mt-1">Set your new password below</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' },
                      })}
                      className="input-field pl-10 pr-10"
                      placeholder="••••••••"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      {...register('confirmPassword', {
                        required: 'Please confirm password',
                        validate: (v) => v === password || 'Passwords do not match',
                      })}
                      className="input-field pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-60"
                >
                  {isSubmitting ? 'Updating Password...' : 'Reset Password'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Back to{' '}
                <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
