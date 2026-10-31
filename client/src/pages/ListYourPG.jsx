import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileText,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  Sparkles,
  Building2,
  X,
  AlertTriangle,
  User,
  Phone,
  Lock,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  Sliders,
  Send,
  Zap,
  LogIn,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { uploadFileToCloudinary } from '../utils/cloudinaryUpload';
import { supabase } from '../lib/supabaseClient';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function ListYourPG() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading, updateCurrentUser } = useAuth();
  const { requestOwner } = useData();

  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [propertyDocument, setPropertyDocument] = useState(null);
  const [identityDocument, setIdentityDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Drag-and-drop state
  const [isDraggingProp, setIsDraggingProp] = useState(false);
  const [isDraggingId, setIsDraggingId] = useState(false);

  // Previews for image documents
  const propPreview = useMemo(() => {
    if (propertyDocument && propertyDocument.type?.startsWith('image/')) {
      return URL.createObjectURL(propertyDocument);
    }
    return null;
  }, [propertyDocument]);

  const idPreview = useMemo(() => {
    if (identityDocument && identityDocument.type?.startsWith('image/')) {
      return URL.createObjectURL(identityDocument);
    }
    return null;
  }, [identityDocument]);

  useEffect(() => {
    return () => {
      if (propPreview) URL.revokeObjectURL(propPreview);
      if (idPreview) URL.revokeObjectURL(idPreview);
    };
  }, [propPreview, idPreview]);

  useEffect(() => {
    if (currentUser?.name && !fullName) {
      setFullName(currentUser.name);
    }
    if (currentUser?.phone && !phoneNumber) {
      setPhoneNumber(currentUser.phone);
    }
  }, [currentUser]);

  const isPhoneValid = /^[0-9]{10}$/.test(phoneNumber.replace(/[\s\-+()]/g, ''));
  const isNameValid = fullName.trim().length >= 2;

  const ownerStatus =
    currentUser?.role === 'owner' || currentUser?.role === 'admin'
      ? 'approved'
      : currentUser?.ownerRequestStatus || 'none';

  const onSubmitRequest = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please login to request owner access');
      navigate('/login');
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error('Please enter your full name (minimum 2 characters)');
      return;
    }
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      toast.error('Phone number is required');
      return;
    }
    if (!/^[0-9+\s\-()]{7,15}$/.test(cleanPhone)) {
      toast.error('Please enter a valid phone number (e.g. 9876543210)');
      return;
    }

    setIsSubmitting(true);
    try {
      let userName =
        fullName?.trim() ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.name ||
        currentUser?.full_name ||
        (currentUser?.email ? currentUser.email.split('@')[0] : '');

      if (!userName || userName.toLowerCase() === 'user' || userName.toLowerCase() === 'owner') {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const authUser = sessionData?.session?.user;
          if (authUser) {
            userName =
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email?.split('@')[0] ||
              userName;
          }
        } catch (e) {
          console.warn('Could not fetch Supabase session for document upload name:', e);
        }
      }

      if (!userName) userName = 'owner';

      let propUrl = '';
      let idUrl = '';

      if (propertyDocument) {
        toast.loading('Uploading property document...', { id: 'doc-upload' });
        propUrl = await uploadFileToCloudinary(propertyDocument, 'document', userName);
      }
      if (identityDocument) {
        toast.loading('Uploading identity document...', { id: 'doc-upload' });
        idUrl = await uploadFileToCloudinary(identityDocument, 'document', userName);
      }
      toast.dismiss('doc-upload');

      const userAvatar = currentUser?.avatar_url || currentUser?.avatar || '';
      const safePropUrl = propUrl && propUrl !== userAvatar && !propUrl.includes('/user_profiles/') ? propUrl : '';
      const safeIdUrl = idUrl && idUrl !== userAvatar && !idUrl.includes('/user_profiles/') ? idUrl : '';

      await requestOwner({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        propertyDocument: safePropUrl || null,
        identityDocument: safeIdUrl || null,
      });

      await updateCurrentUser({
        name: fullName.trim(),
        full_name: fullName.trim(),
        phone: cleanPhone,
        role: 'owner',
        owner_form_submitted: true,
        admin_approved: false,
        kyc_status: safePropUrl || safeIdUrl ? 'pending' : 'none',
        ownerRequestStatus: 'pending',
        ...(safePropUrl ? { kyc_doc_url: safePropUrl } : {}),
        ...(safeIdUrl ? { kyc_id_doc_url: safeIdUrl } : {}),
      });

      toast.success(
        'Owner onboarding details submitted! Your account is now under review by our administration team.'
      );
      navigate('/owner/pending', { replace: true });
    } catch (e2) {
      toast.error(e2?.response?.data?.message || e2.message || 'Could not submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const FAQS = [
    {
      q: 'Do I need a commercial trade license to list?',
      a: 'No. Private room hosts, student paying guest homes, and family-run accommodations across Gangtok, Majitar, and Namchi are eligible.',
    },
    {
      q: 'How do students reach out to me?',
      a: 'Once your listing is approved, verified students connect with you directly via phone call or WhatsApp.',
    },
    {
      q: 'What is the "Verified" host shield?',
      a: 'Uploading basic ID or property ownership documents grants your listing the green Verified badge, giving students higher confidence to book.',
    },
    {
      q: 'Can I update rent, photos, or house rules later?',
      a: 'Yes, you can edit room descriptions, rent amounts, photos, and rules anytime directly from your Host Dashboard.',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center pt-20">
        <div className="w-8 h-8 border-3 border-[#0f2547]/20 border-t-[#0f2547] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pt-20 sm:pt-24 pb-28 sm:pb-16">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-6">
        {/* ========================================================
            TOP COMPACT HEADER: Form visible immediately without scrolling!
            ======================================================== */}
        <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-6">
          {/* Free Registration Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs mb-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>100% Free Owner Registration</span>
            <span className="text-emerald-400">•</span>
            <span className="text-emerald-700">Zero Charges</span>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight mb-1.5"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Own a Property in <span className="text-[#f5a623]">Sikkim?</span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed px-2">
            {isAuthenticated
              ? 'Fill out the quick form below to request owner access and list your PG or rooms on Stay Aalaya. Direct student contacts with zero middleman.'
              : 'Join Stay Aalaya to list your PG or rooms across Sikkim. Log in or create your owner account to request hosting access.'}
          </p>
        </div>

        {/* ========================================================
            MAIN LAYOUT: Form immediately at top!
            ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* FORM CONTAINER (Main Column) */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl p-4 sm:p-7">
            {!isAuthenticated ? (
              /* ========================================================
                  FALLBACK UI: Centered Empty-State Card for Guests
                  ======================================================== */
              <div className="text-center py-10 sm:py-14 px-4 sm:px-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#0f2547]/5 border border-[#0f2547]/10 text-[#0f2547] flex items-center justify-center mx-auto mb-5 shadow-xs">
                  <div className="relative">
                    <Building2 size={34} className="text-[#0f2547]" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f5a623] text-slate-950 flex items-center justify-center text-[10px] shadow-xs">
                      <Lock size={11} className="stroke-[2.5]" />
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold mb-3 shadow-2xs">
                  <Sparkles size={13} className="text-[#f5a623]" />
                  <span>Host Authentication Required</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                  Login Required
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto mb-7 leading-relaxed font-medium">
                  Please login or register as an owner to list your property.
                </p>

                {/* Styled Call to Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full sm:w-auto flex-1 bg-[#0f2547] hover:bg-[#16335d] text-white py-2.5 sm:py-3 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20"
                  >
                    <LogIn size={15} className="text-[#f5a623]" />
                    <span>Log In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/signup')}
                    className="w-full sm:w-auto flex-1 bg-[#f5a623] hover:bg-[#e09618] text-slate-950 py-2.5 sm:py-3 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={15} className="text-slate-950" />
                    <span>Register</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 mt-6 flex items-center justify-center gap-1.5">
                  <Lock size={12} className="text-slate-400" />
                  <span>Free host onboarding • Zero middleman commissions</span>
                </p>
              </div>
            ) : (
              <>
                {/* Form Top Header */}
                <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building2 size={18} className="text-[#f5a623]" /> Request Owner Access
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Enter your contact details below to apply. Uploading verification documents is optional.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Free Registration
                  </span>
                </div>

                {/* CASE 1: ALREADY APPROVED */}
                {ownerStatus === 'approved' ? (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-5 sm:p-7 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3">
                  <Sparkles size={13} className="text-emerald-600" /> OWNER ACCESS ACTIVE
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">You have Property Owner Access</h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
                  Your owner account is live and active. You can create listings, manage your PGs, and receive tenant interest directly from your dashboard.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => navigate('/owner')}
                    className="bg-[#0f2547] hover:bg-[#16335d] text-white px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md hover:scale-105 transition-all cursor-pointer"
                  >
                    <Building2 size={15} /> Open Owner Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/owner/add')}
                    className="bg-[#f5a623] hover:bg-[#e09618] text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md hover:scale-105 transition-all cursor-pointer"
                  >
                    List New PG <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : ownerStatus === 'pending' ? (
              /* CASE 2: UNDER REVIEW */
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-7">
                <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm sm:text-base mb-2">
                  <div className="w-7 h-7 rounded-full bg-amber-200/80 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-amber-800 animate-spin-slow" />
                  </div>
                  <span>Request Already Submitted</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed mb-4">
                  Your request is under review by admin. You will get owner access after approval.
                </p>
                <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs text-slate-700 flex items-center justify-between">
                  <span>Need help with your request?</span>
                  <a
                    href="mailto:support@stayaalaya.in"
                    className="text-[#0f2547] font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Contact Support →
                  </a>
                </div>
              </div>
            ) : (
              /* CASE 3: STANDARD APPLICATION FORM */
              <form onSubmit={onSubmitRequest} className="space-y-4 sm:space-y-5">
                {ownerStatus === 'rejected' && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm">
                      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                      Previous Request Declined
                    </div>
                    <p className="mt-1 text-[11px] sm:text-xs text-rose-700 leading-relaxed">
                      Your previous owner request was declined by an admin. Please review the notification in your notification center for feedback, update your information/documents, and re-submit below.
                    </p>
                  </div>
                )}

                {/* Full Name & Phone Number in Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Full Name Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      {isNameValid && (
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={15} />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone Number Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      {isPhoneValid && (
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                          <Check size={11} /> Valid
                        </span>
                      )}
                    </div>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#f5a623] focus-within:border-transparent transition-all overflow-hidden">
                      <div className="pl-3 pr-2.5 py-2.5 flex items-center gap-1.5 bg-slate-100/90 border-r border-slate-200 text-xs font-bold text-slate-700 shrink-0 select-none">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2.5 bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 text-xs sm:text-sm font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    EXACT DOCUMENT INFO BANNER (From User Screenshot)
                    ======================================================== */}
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-sky-50/50 to-white p-3.5 sm:p-4 shadow-xs">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={18} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">
                          Property & Identity Documents
                        </h3>
                        <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                          Optional
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 text-[11px] sm:text-xs leading-relaxed">
                        Uploading documents is <strong>not mandatory</strong> to submit your request. However, uploading documents determines whether your property shows as <strong>Verified</strong> or <strong>Not Verified</strong>:
                      </p>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        <div className="flex items-start gap-2 bg-white/95 border border-emerald-200 p-2.5 sm:p-3 rounded-xl shadow-xs">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldCheck size={11} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-emerald-900 text-xs">With Documents Uploaded</p>
                            <p className="text-slate-600 mt-0.5 leading-snug text-[10px] sm:text-[11px]">
                              Once approved, your property will be marked with the green <strong className="text-emerald-700">"Verified"</strong> badge (🛡️ Verified), giving students and tenants higher trust.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 bg-white/95 border border-amber-200 p-2.5 sm:p-3 rounded-xl shadow-xs">
                          <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <ShieldAlert size={11} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-amber-900 text-xs">Without Documents (Skipped)</p>
                            <p className="text-slate-600 mt-0.5 leading-snug text-[10px] sm:text-[11px]">
                              You can still list your PG immediately, but it will be displayed as <strong className="text-amber-700">"Not Verified"</strong> until documents are verified.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    DOCUMENT UPLOADS (Drag & Drop Zones)
                    ======================================================== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* Property Document Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingProp(true);
                    }}
                    onDragLeave={() => setIsDraggingProp(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingProp(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) setPropertyDocument(file);
                    }}
                    className={`rounded-xl border-2 transition-all p-3 sm:p-3.5 ${
                      isDraggingProp
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : propertyDocument
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-xs font-bold text-slate-700">Property Document</label>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mb-2.5">
                      Electricity bill / rent agreement / tax receipt (PDF/Image)
                    </p>

                    {propertyDocument ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 min-w-0">
                          {propPreview ? (
                            <img
                              src={propPreview}
                              alt="Property Document Preview"
                              className="w-9 h-9 object-cover rounded-md border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{propertyDocument.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(propertyDocument.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPropertyDocument(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                          title="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer text-xs font-bold shadow-xs transition-colors">
                          <UploadCloud size={13} className="text-[#f5a623]" /> <span>Choose File</span>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={(e) => setPropertyDocument(e.target.files?.[0] || null)}
                          />
                        </label>
                        <span className="text-[10px] text-slate-400">No file selected (optional)</span>
                      </div>
                    )}
                  </div>

                  {/* Identity Document Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingId(true);
                    }}
                    onDragLeave={() => setIsDraggingId(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingId(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) setIdentityDocument(file);
                    }}
                    className={`rounded-xl border-2 transition-all p-3 sm:p-3.5 ${
                      isDraggingId
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : identityDocument
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-xs font-bold text-slate-700">Identity Document</label>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mb-2.5">
                      Aadhaar card / Voter ID / Passport (PDF/Image)
                    </p>

                    {identityDocument ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 min-w-0">
                          {idPreview ? (
                            <img
                              src={idPreview}
                              alt="Identity Document Preview"
                              className="w-9 h-9 object-cover rounded-md border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                              <FileCheck2 size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{identityDocument.name}</p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(identityDocument.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIdentityDocument(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                          title="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer text-xs font-bold shadow-xs transition-colors">
                          <FileText size={13} className="text-[#f5a623]" /> <span>Choose File</span>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={(e) => setIdentityDocument(e.target.files?.[0] || null)}
                          />
                        </label>
                        <span className="text-[10px] text-slate-400">No file selected (optional)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Privacy & Security Note */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-[11px] sm:text-xs text-blue-700 flex items-start gap-2">
                  <Lock size={14} className="mt-0.5 shrink-0 text-blue-600" />
                  <span>Documents are stored securely and used solely for owner verification.</span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0f2547] hover:bg-[#16335d] text-white py-3 sm:py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} className="text-[#f5a623]" />
                      <span>Submit Free Owner Request</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>

          {/* SIDEBAR COLUMN: Compact Host Perks & FAQ */}
          <div className="lg:col-span-4 space-y-4">
            {/* Host Advantages Box */}
            <div className="bg-gradient-to-br from-slate-900 to-[#0f2547] text-white rounded-2xl p-5 shadow-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-[#f5a623] text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles size={14} /> Free Owner Benefits
              </div>
              <h3 className="text-base font-bold text-white mb-3">Why List on Stay Aalaya?</h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <strong className="text-white block font-semibold">100% Free Registration</strong>
                    <span className="text-slate-300">
                      Zero registration fees or hidden charges to become an approved host.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-amber-400/20 text-[#f5a623] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <strong className="text-white block font-semibold">Direct Calls & WhatsApp</strong>
                    <span className="text-slate-300">
                      Students reach out straight to your phone with zero intermediary interference.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-sky-400/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <div>
                    <strong className="text-white block font-semibold">Full House Autonomy</strong>
                    <span className="text-slate-300">
                      You set your room rules, rent amounts, sharing types, and gate timings.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Host FAQ Accordion */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-2.5 flex items-center gap-1.5">
                <HelpCircle size={15} className="text-[#f5a623]" /> Host FAQs
              </h4>

              <div className="space-y-1.5">
                {FAQS.map((faq, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full p-2.5 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {openFaq === idx ? (
                        <ChevronUp size={13} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown size={13} className="text-slate-400 shrink-0" />
                      )}
                    </button>
                    {openFaq === idx && (
                      <div className="px-2.5 pb-2.5 text-[11px] text-slate-600 leading-relaxed border-t border-slate-50 pt-1.5 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
