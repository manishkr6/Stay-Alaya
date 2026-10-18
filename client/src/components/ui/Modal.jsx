import { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  confirmDisabled = false,
  loading = false,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, loading]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const btnStyles = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up mx-2">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-base sm:text-lg">{title}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
        {onConfirm && (
          <div className="flex gap-2.5 sm:gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmDisabled || loading}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${btnStyles[confirmVariant]}`}
            >
              {loading && <Loader2 size={16} className="animate-spin text-white" />}
              <span>{confirmText}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
