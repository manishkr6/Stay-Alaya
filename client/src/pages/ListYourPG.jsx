import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, ShieldCheck, ShieldAlert, Upload, Sparkles, Building2, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { uploadFileToCloudinary } from '../utils/cloudinaryUpload';
import { supabase } from '../lib/supabaseClient';

export default function ListYourPG() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, updateCurrentUser } = useAuth();
  const { requestOwner } = useData();

  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [propertyDocument, setPropertyDocument] = useState(null);
  const [identityDocument, setIdentityDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.name && !fullName) {
      setFullName(currentUser.name);
    }
    if (currentUser?.phone && !phoneNumber) {
      setPhoneNumber(currentUser.phone);
    }
  }, [currentUser]);

  const ownerStatus =
    currentUser?.role === 'owner' || currentUser?.role === 'admin'
      ? 'approved'
      : (currentUser?.ownerRequestStatus || 'none');

  const onSubmitRequest = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please login first');
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
      // Extract logged-in user's name from form input, Supabase auth session, or user metadata
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

      // Upload owner documents calling uploadFileToCloudinary(docFile, 'document', userName)
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
        kyc_status: 'pending',
        ownerRequestStatus: 'pending',
        ...(safePropUrl ? { kyc_doc_url: safePropUrl } : {}),
        ...(safeIdUrl ? { kyc_id_doc_url: safeIdUrl } : {}),
      });

      const hasUploadedAny = Boolean(propertyDocument || identityDocument);
      toast.success(
        hasUploadedAny
          ? 'Owner request submitted with documents! Properties will show as Verified upon admin approval.'
          : 'Owner request submitted! (Properties will show as Not Verified until documents are uploaded)'
      );
    } catch (e2) {
      toast.error(e2?.response?.data?.message || e2.message || 'Could not submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24 lg:pt-28 pb-12">
      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10">
        <section className="bg-gradient-to-r from-indigo-950 via-blue-950 to-indigo-900 rounded-2xl sm:rounded-[2.2rem] px-4 sm:px-10 py-8 sm:py-14 text-center text-white shadow-xl">
          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight">Own a Property in Sikkim?</h1>
          <p className="mt-3 sm:mt-5 text-slate-200 text-sm sm:text-lg max-w-2xl mx-auto">
            Submit your details to request owner access and list your PG on our platform.
          </p>
          {ownerStatus === 'approved' && (
            <button
              onClick={() => navigate('/owner')}
              className="mt-6 sm:mt-8 bg-white text-slate-900 font-bold px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-slate-100 transition-all inline-flex items-center gap-2 text-sm sm:text-base"
            >
              Go to Owner Dashboard <ArrowRight size={18} />
            </button>
          )}
        </section>

        <section className="mt-6 sm:mt-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8">
          <h2 className="font-semibold text-slate-900 text-lg sm:text-xl mb-1 sm:mb-2">Request Owner Access</h2>
          <p className="text-slate-500 text-xs sm:text-sm mb-5 sm:mb-7">
            Enter your contact details below to apply for owner access. Uploading verification documents is optional.
          </p>

          {ownerStatus === 'approved' ? (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-7">
              <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-emerald-200/30 blur-2xl" />
              <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-teal-200/30 blur-2xl" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  <Sparkles size={13} /> OWNER ACCESS ACTIVE
                </div>

                <h3 className="mt-4 text-2xl font-bold text-slate-900">You have Property Owner Access</h3>
                <p className="mt-2 text-slate-600 max-w-2xl">
                  Your owner account is active. You can create listings, manage your PGs, and receive tenant interest directly from your dashboard.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/owner')}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Building2 size={16} /> Open Owner Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/owner/add')}
                    className="btn-outline inline-flex items-center gap-2"
                  >
                    List New PG <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : ownerStatus === 'pending' ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <CheckCircle2 size={18} />
                Request Already Submitted
              </div>
              <p className="mt-2 text-sm text-amber-700">
                Your request is under review by admin. You will get owner access after approval.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmitRequest} className="space-y-6">
              {ownerStatus === 'rejected' && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 mb-4">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                    <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                    Previous Request Declined
                  </div>
                  <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                    Your previous owner request was declined by an admin. Please check the notification received in your notification center for specific feedback, update your information/documents as needed, and re-submit your application below.
                  </p>
                </div>
              )}

              {/* Full Name (Mandatory) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="input-field"
                />
              </div>

              {/* Phone Number (Mandatory) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone Number <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your mobile number (e.g. 9876543210)"
                  className="input-field"
                />
              </div>

              {/* Informative Notice Box Above Documents */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-sky-50/50 to-white p-3.5 sm:p-5 shadow-sm">
                <div className="flex items-start gap-3 sm:gap-3.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={20} className="text-indigo-600 sm:w-[22px] sm:h-[22px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                        Property & Identity Documents
                      </h3>
                      <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                        Optional
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600 text-xs sm:text-sm leading-relaxed">
                      Uploading documents is <strong>not mandatory</strong> to submit your request. However, uploading documents determines whether your property shows as <strong>Verified</strong> or <strong>Not Verified</strong>:
                    </p>

                    <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                      <div className="flex items-start gap-2 sm:gap-2.5 bg-white/95 border border-emerald-200 p-2.5 sm:p-3 rounded-xl shadow-xs">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck size={13} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-900 text-xs sm:text-sm">With Documents Uploaded</p>
                          <p className="text-slate-600 mt-0.5 leading-snug text-[11px] sm:text-xs">
                            Once approved, your property will be marked with the green <strong className="text-emerald-700">"Verified"</strong> badge (🛡️ Verified), giving students and tenants higher trust.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 sm:gap-2.5 bg-white/95 border border-amber-200 p-2.5 sm:p-3 rounded-xl shadow-xs">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldAlert size={13} className="text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-900 text-xs sm:text-sm">Without Documents (Skipped)</p>
                          <p className="text-slate-600 mt-0.5 leading-snug text-[11px] sm:text-xs">
                            You can still list your PG immediately, but it will be displayed as <strong className="text-amber-700">"Not Verified"</strong> until documents are verified.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Uploads (Optional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="rounded-2xl border border-slate-200 p-3.5 sm:p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Property Document</label>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-normal">Optional</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mb-3">Upload property paper / electricity bill / rent agreement (PDF/Image)</p>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer text-xs sm:text-sm shadow-xs transition-colors">
                      <Upload size={14} /> <span>Choose File</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => setPropertyDocument(e.target.files?.[0] || null)}
                      />
                    </label>
                    {propertyDocument && (
                      <button
                        type="button"
                        onClick={() => setPropertyDocument(null)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-2 break-all font-mono">
                    {propertyDocument ? propertyDocument.name : 'No file selected (optional)'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-3.5 sm:p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">Identity Document</label>
                    <span className="text-[11px] sm:text-xs text-slate-400 font-normal">Optional</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mb-3">Upload Aadhaar card / Voter ID / Passport (PDF/Image)</p>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer text-xs sm:text-sm shadow-xs transition-colors">
                      <FileText size={14} /> <span>Choose File</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => setIdentityDocument(e.target.files?.[0] || null)}
                      />
                    </label>
                    {identityDocument && (
                      <button
                        type="button"
                        onClick={() => setIdentityDocument(null)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove file"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-2 break-all font-mono">
                    {identityDocument ? identityDocument.name : 'No file selected (optional)'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3.5 sm:p-4 text-xs sm:text-sm text-blue-700 flex items-start gap-2.5">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-blue-600" />
                <span>Documents are stored securely and used solely for owner verification.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto btn-primary px-8 py-3.5 disabled:opacity-60 text-sm sm:text-base font-semibold shadow-lg shadow-primary-500/20"
              >
                {isSubmitting ? 'Submitting Request...' : 'Request Owner Access'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

