import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Mail, MailCheck, CheckCircle2, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  const [sentEmail, setSentEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [rateLimitError, setRateLimitError] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (cooldown === 0) {
      setRateLimitError(false);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async ({ email }) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      setRateLimitError(false);
      await forgotPassword(cleanEmail);
      setSentEmail(cleanEmail);
      setIsSent(true);
      setCooldown(60);
      setResendCount(0);
      toast.success('Password reset link sent! Please check your inbox.');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setRateLimitError(true);
        setCooldown(60);
        toast.error('Email rate limit reached. Please wait 60 seconds before trying again.', {
          duration: 6000,
        });
      } else {
        toast.error(msg || 'Could not process request');
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || !sentEmail) return;
    setIsResending(true);
    try {
      await forgotPassword(sentEmail);
      setResendCount((prev) => prev + 1);
      setCooldown(60);
      toast.success('A new password reset link has been resent!');
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setCooldown(60);
        toast.error('Rate limit reached. Please wait a minute before requesting another link.', {
          duration: 6000,
        });
      } else {
        toast.error(msg || 'Could not resend link');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleTryAnotherEmail = () => {
    setIsSent(false);
    setResendCount(0);
    setRateLimitError(false);
    if (sentEmail) {
      setValue('email', sentEmail);
    }
  };

  return (
    <div className="relative min-h-screen pt-16 overflow-hidden bg-slate-100">
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-10 min-h-[calc(100svh-4rem)]">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl p-6 sm:p-8 transition-all">
          {isSent ? (
            <div className="space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
                <MailCheck size={32} />
              </div>

              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Reset Link Sent!
                </h1>
                <p className="text-slate-500 text-sm mt-2">
                  We have sent a secure password reset link to:
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 rounded-full text-slate-900 text-xs sm:text-sm font-semibold max-w-full">
                  <Mail size={13} className="text-primary-600 shrink-0" />
                  <span className="truncate">{sentEmail}</span>
                </div>
              </div>

              {/* Prominent in-front status confirmation message */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-800 space-y-1">
                    <p className="font-semibold text-emerald-900">
                      {resendCount > 0
                        ? `Fresh reset link resent (${resendCount}x)`
                        : 'Instructions sent successfully'}
                    </p>
                    <p className="text-emerald-700 leading-relaxed">
                      Please open the email from <strong>Stay Aalaya</strong> and click the link inside to set your new password.
                    </p>
                  </div>
                </div>
              </div>

              {/* Troubleshooting / Check spam notice */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left">
                <p className="text-xs font-semibold text-slate-700 mb-1">Didn't receive the email?</p>
                <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside leading-relaxed">
                  <li>Check your <strong>Spam</strong>, <strong>Junk</strong>, or <strong>Promotions</strong> tab</li>
                  <li>Verify that your email address is spelled correctly</li>
                  <li>The reset link will remain valid for 1 hour</li>
                </ul>
              </div>

              {/* Resend Action with live countdown */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
                  {isResending
                    ? 'Resending Link...'
                    : cooldown > 0
                    ? `Resend link in ${cooldown}s`
                    : 'Resend Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={handleTryAnotherEmail}
                  className="w-full py-2 text-xs text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Use a different email address
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 font-semibold hover:underline"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-7">
                <h1 className="font-display text-3xl font-bold text-slate-900">Forgot Password</h1>
                <p className="text-slate-500 text-sm mt-1">Enter your email to get a reset link</p>
              </div>

              {rateLimitError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-5 text-xs text-amber-800 flex items-start gap-2.5 leading-relaxed">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 mb-0.5">Email Rate Limit Exceeded</p>
                    <p>
                      Supabase security limits email sending to prevent spam. Please wait{' '}
                      <strong>{cooldown > 0 ? `${cooldown} seconds` : 'a moment'}</strong> before trying again.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                      })}
                      className="input-field pl-10"
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || cooldown > 0}
                  className="btn-primary w-full py-3 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      Sending Link...
                    </>
                  ) : cooldown > 0 ? (
                    `Please wait ${cooldown}s`
                  ) : (
                    'Send Reset Link'
                  )}
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
