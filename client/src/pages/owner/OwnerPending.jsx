import { Clock, ShieldAlert, CheckCircle2, Phone, Mail, LogOut, ArrowRight, FileCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function OwnerPending() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout('/');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
        {/* Status Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-500 mb-5 shadow-sm">
            <Clock size={36} className="animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldAlert size={14} /> Verification Under Review
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Host Application Pending Approval
          </h1>
          <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-lg mx-auto">
            Thank you for registering as a PG Owner on Stay Aalaya. Your onboarding documents and details are currently being reviewed by our Sikkim ground verification team.
          </p>
        </div>

        {/* User Application Overview */}
        <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-200 mb-8 space-y-3.5">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted Host Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 block text-xs">Registered Name</span>
              <span className="font-semibold text-slate-900">{currentUser?.name || 'Valued Host'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Email Address</span>
              <span className="font-semibold text-slate-900 truncate block">{currentUser?.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Contact Phone</span>
              <span className="font-semibold text-slate-900">{currentUser?.phone || 'Provided during submission'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">Onboarding Form</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs mt-0.5">
                <CheckCircle2 size={14} /> Submitted &amp; Recorded
              </span>
            </div>
          </div>
        </div>

        {/* Verification Timeline / Steps */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">What Happens Next?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="w-7 h-7 rounded-full bg-[#0f2547] text-white flex items-center justify-center text-xs font-bold mb-2.5">
                1
              </div>
              <h4 className="font-bold text-xs text-slate-900 mb-1">Document Check</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Verification of property deed and government ID authenticity.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold mb-2.5">
                2
              </div>
              <h4 className="font-bold text-xs text-amber-900 mb-1">Admin Approval</h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Approvals are processed within 12–24 business hours.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold mb-2.5">
                3
              </div>
              <h4 className="font-bold text-xs text-slate-900 mb-1">Publish Listings</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gain full access to the Owner Dashboard and listing tools.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <a
            href="https://wa.me/919876543210?text=Hello%20Stay%20Aalaya%20Team%2C%20I%20have%20submitted%20my%20PG%20owner%20verification%20request%20and%20would%20like%20to%20check%20the%20status."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer"
          >
            <Phone size={15} /> Fast-Track via WhatsApp
          </a>

          <button
            onClick={handleLogout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#0f2547] hover:bg-[#1a3a6b] text-white transition-all shadow-sm cursor-pointer"
          >
            <LogOut size={15} /> Sign Out to Guest Browsing
          </button>
        </div>
      </div>
    </div>
  );
}

