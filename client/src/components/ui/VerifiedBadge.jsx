import { ShieldCheck, ShieldAlert } from 'lucide-react';

export default function VerifiedBadge({ isVerified = false, size = 'md' }) {
  if (isVerified) {
    if (size === 'sm') {
      return (
        <span
          className="inline-flex items-center gap-1 bg-emerald-600/90 text-white text-xs px-2.5 py-0.5 rounded-full font-medium shadow-sm backdrop-blur-sm transition-colors"
          title="Property documents verified by admin"
        >
          <ShieldCheck size={11} className="shrink-0" /> Verified
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm px-3 py-1 rounded-full font-medium shadow-sm"
        title="Property documents verified by admin"
      >
        <ShieldCheck size={15} className="text-emerald-600 shrink-0" /> Verified Listing
      </span>
    );
  }

  // Not Verified badge
  if (size === 'sm') {
    return (
      <span
        className="inline-flex items-center gap-1 bg-amber-500/95 text-white text-xs px-2.5 py-0.5 rounded-full font-medium shadow-sm backdrop-blur-sm transition-colors"
        title="Property documents not submitted for verification"
      >
        <ShieldAlert size={11} className="shrink-0" /> Not Verified
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-sm px-3 py-1 rounded-full font-medium shadow-sm"
      title="Property documents not submitted for verification"
    >
      <ShieldAlert size={15} className="text-amber-600 shrink-0" /> Not Verified
    </span>
  );
}

