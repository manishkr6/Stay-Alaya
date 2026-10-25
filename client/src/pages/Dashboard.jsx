import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Heart,
  Star,
  Building2,
  ChevronRight,
  Edit2,
  Check,
  X,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  Save,
  Camera,
  Loader2,
  Trash2,
  Maximize2,
  Compass,
  CheckCircle2,
  Eye,
  Sparkles,
  RefreshCw,
  GraduationCap,
  UserCog,
  ExternalLink,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Bookmark,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { uploadFileToCloudinary } from '../utils/cloudinaryUpload';
import { supabase } from '../lib/supabaseClient';
import PGCard from '../components/ui/PGCard';
import { EmptyState, StarRating } from '../components/ui/index.jsx';
import Modal from '../components/ui/Modal';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'saved', label: 'Saved PGs', icon: Heart },
  { id: 'reviews', label: 'My Reviews', icon: Star },
  { id: 'owner', label: 'Become a Host', icon: Building2 },
];

export default function Dashboard() {
  const { currentUser, updateCurrentUser, logout } = useAuth();
  const {
    getSavedPGs,
    getPGReviews,
    pgs,
    createNotification,
    fetchApprovedPgsAndReviews,
    fetchSavedPgs,
  } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('profile');
  const [searchSavedQuery, setSearchSavedQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Full-Screen Photo Lightbox State
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);

  // Update Profile Modal State
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(
    currentUser?.avatar_url || currentUser?.avatar || ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef(null);

  // Sync tab with URL search parameter (?tab=saved) or navigation state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') || location.state?.tab;
    if (tabParam && ['profile', 'saved', 'reviews', 'owner'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search, location.state]);

  // Sync profile details with currentUser
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileAvatar(currentUser.avatar_url || currentUser.avatar || '');
    }
  }, [currentUser]);

  // Welcome / Verification notification toast
  useEffect(() => {
    if (location.search.includes('verified=true') || location.hash.includes('access_token')) {
      toast.success('Email verified successfully! Welcome to Stay Aalaya.', {
        id: 'email-verified-toast',
      });
    }
  }, [location]);

  // Handle keyboard shortcuts (Escape to close modals & lightbox)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isPhotoLightboxOpen) setIsPhotoLightboxOpen(false);
        if (profileOpen && !isSavingProfile && !isUploadingPhoto) setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPhotoLightboxOpen, profileOpen, isSavingProfile, isUploadingPhoto]);

  // Lock body scroll when Lightbox is open
  useEffect(() => {
    if (isPhotoLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPhotoLightboxOpen]);

  // Compute live user stats
  const savedPGs = useMemo(() => {
    return getSavedPGs(currentUser?.id) || [];
  }, [getSavedPGs, currentUser?.id]);

  const myReviews = useMemo(() => {
    return (pgs || [])
      .flatMap((pg) =>
        getPGReviews(pg.id)
          .filter((r) => r.userId === currentUser?.id)
          .map((r) => ({ ...r, pgTitle: pg.title, pgId: pg.id }))
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [pgs, getPGReviews, currentUser?.id]);

  // Filtered Saved PGs by search query
  const displayedSavedPGs = useMemo(() => {
    if (!searchSavedQuery.trim()) return savedPGs;
    const q = searchSavedQuery.toLowerCase().trim();
    return savedPGs.filter((pg) => {
      const titleMatch = (pg.title || '').toLowerCase().includes(q);
      const cityMatch = (pg.location?.city || '').toLowerCase().includes(q);
      const areaMatch = (pg.location?.area || '').toLowerCase().includes(q);
      return titleMatch || cityMatch || areaMatch;
    });
  }, [savedPGs, searchSavedQuery]);

  const ownerStatus = currentUser?.ownerRequestStatus || 'none';
  const currentPhoto = profileAvatar || currentUser?.avatar_url || currentUser?.avatar || '';

  // Refresh handler with live indicators
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (fetchApprovedPgsAndReviews) await fetchApprovedPgsAndReviews();
      if (fetchSavedPgs) await fetchSavedPgs();
      toast.success('Dashboard data refreshed!');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of Stay Aalaya?')) {
      await logout('/');
      toast.success('Logged out successfully');
    }
  };

  // Direct Cloudinary upload & Supabase mutation
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type || !file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setProfileAvatar(objectUrl);
    setIsUploadingPhoto(true);
    const toastId = toast.loading('Uploading profile photo to Cloudinary...');

    try {
      const userName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        profileName ||
        currentUser?.name ||
        currentUser?.full_name ||
        (currentUser?.email ? currentUser.email.split('@')[0] : '') ||
        'student';

      // 1. Upload to Cloudinary under user_profiles/${sanitizedName}
      const secureUrl = await uploadFileToCloudinary(file, 'profile', userName);

      // 2. Real database mutation directly on profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          avatar_url: secureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (dbError) throw dbError;

      // 3. Update auth state and local state
      await updateCurrentUser({
        avatar_url: secureUrl,
        avatar: secureUrl,
      });

      // 4. Role-isolated user notification
      await createNotification({
        userId: currentUser?.id,
        targetRole: currentUser?.role || 'student',
        message: 'Your profile photo has been updated successfully.',
        type: 'PROFILE_UPDATE',
      });

      setProfileAvatar(secureUrl);
      toast.success('Profile photo updated successfully!', { id: toastId });
    } catch (err) {
      console.error('Profile photo upload failed:', err);
      setProfileAvatar(currentUser?.avatar_url || currentUser?.avatar || '');
      toast.error(err?.message || 'Failed to upload photo to Cloudinary', { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Remove profile photo
  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setIsUploadingPhoto(true);
    const toastId = toast.loading('Removing profile photo...');

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (dbError) throw dbError;

      await updateCurrentUser({
        avatar_url: '',
        avatar: '',
      });

      await createNotification({
        userId: currentUser?.id,
        targetRole: currentUser?.role || 'student',
        message: 'Your profile photo was removed.',
        type: 'PROFILE_UPDATE',
      });

      setProfileAvatar('');
      toast.success('Profile photo removed.', { id: toastId });
      setIsPhotoLightboxOpen(false);
    } catch (err) {
      toast.error('Failed to remove profile photo', { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Update profile details (Name, Phone)
  const handleUpdateProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedPhone = profilePhone.trim();
    if (trimmedName.length < 2) {
      toast.error('Please enter a valid name (at least 2 characters)');
      return;
    }
    if (trimmedPhone && !/^[0-9+\s\-()]{7,15}$/.test(trimmedPhone)) {
      toast.error('Please enter a valid contact phone number');
      return;
    }

    setIsSavingProfile(true);
    const toastId = toast.loading('Saving profile changes...');

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          phone: trimmedPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (dbError) throw dbError;

      await updateCurrentUser({
        name: trimmedName,
        phone: trimmedPhone,
      });

      if (trimmedPhone && trimmedPhone !== currentUser?.phone) {
        await createNotification({
          userId: currentUser.id,
          targetRole: currentUser?.role || 'student',
          message: `Your contact phone number was updated to ${trimmedPhone}.`,
          type: 'PHONE_UPDATE',
        });
      } else {
        await createNotification({
          userId: currentUser.id,
          targetRole: currentUser?.role || 'student',
          message: 'Your profile details were updated.',
          type: 'PROFILE_UPDATE',
        });
      }

      setProfileOpen(false);
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (e) {
      console.error('Failed to update profile:', e);
      toast.error(e?.message || 'Failed to update profile', { id: toastId });
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pt-20 pb-14 font-sans">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        {/* Hidden File Input for Profile Photo Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
          aria-hidden="true"
        />

        {/* ── Top Header / Student Showcase Banner (Matches Owner Dashboard) ── */}
        <div className="relative overflow-hidden bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm mb-6 sm:mb-8 transition-all">
          {/* Brand color accent top bar */}
          <div className="h-2 sm:h-2.5 w-full bg-gradient-to-r from-[#0f2547] via-[#1d427b] to-[#f5a623]" />

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
              {/* Left Profile Section */}
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
                {/* Clickable Profile Avatar (Strictly sized on all screens) */}
                <div className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20">
                  <button
                    type="button"
                    onClick={() => setIsPhotoLightboxOpen(true)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-2 ring-slate-200/90 hover:ring-[#f5a623] transition-all cursor-pointer block group focus:outline-none focus:ring-2 focus:ring-amber-400 relative"
                    title="Click to view full photo"
                    aria-label="View profile photo in full screen"
                  >
                    {currentPhoto ? (
                      <img
                        src={currentPhoto}
                        alt={currentUser?.name || 'Student Avatar'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#0f2547] to-[#1e3a6a] text-[#f5a623] flex items-center justify-center font-bold text-2xl sm:text-3xl font-display">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || 'S'}
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white z-20">
                        <Loader2 size={20} className="animate-spin text-amber-400" />
                      </div>
                    )}

                    {/* Hover Cue */}
                    {!isUploadingPhoto && (
                      <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white z-10 backdrop-blur-2xs">
                        <Maximize2 size={16} className="drop-shadow-sm text-white" />
                        <span className="text-[9px] font-bold mt-0.5 text-amber-300 drop-shadow-sm">
                          View
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Corner View Badge */}
                  <div
                    onClick={() => setIsPhotoLightboxOpen(true)}
                    className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#0f2547] text-[#f5a623] border-2 border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                    title="View Photo in full screen"
                  >
                    <Eye size={11} />
                  </div>
                </div>

                {/* Student Identity Information */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate">
                      {currentUser?.name || 'Student Dashboard'}
                    </h1>
                    <span className="text-[9px] sm:text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#0f2547] text-[#f5a623] border border-amber-400/30 flex items-center gap-1 shadow-2xs shrink-0">
                      <GraduationCap size={11} className="text-[#f5a623]" />
                      STUDENT
                    </span>
                    <span className="text-[9px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      Verified
                    </span>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 text-xs text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100/90 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs max-w-full">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{currentUser?.email}</span>
                    </span>
                    {currentUser?.phone ? (
                      <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-100/90 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs shrink-0">
                        <Phone size={12} className="text-emerald-600 shrink-0" />
                        <span>{currentUser.phone}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setProfileOpen(true)}
                        className="text-[11px] sm:text-xs text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      >
                        + Add phone
                      </button>
                    )}
                  </div>

                  {/* Quick Summary Line */}
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-1.5 flex items-center gap-1.5 line-clamp-1">
                    <Sparkles size={12} className="text-amber-500 shrink-0" />
                    <span>
                      <strong className="text-slate-800 font-semibold">{savedPGs.length} Saved PGs</strong> • {myReviews.length} reviews in Sikkim
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {/* Primary Action Button (Full-width on mobile) */}
                <button
                  type="button"
                  onClick={() => navigate('/find-pg')}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0f2547] to-[#1a3c6e] hover:from-[#132f57] hover:to-[#224b86] text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer border border-amber-400/30 order-1 sm:order-last"
                >
                  <Compass size={16} className="text-[#f5a623] stroke-[2.5]" />
                  <span>Explore PGs</span>
                </button>

                {/* Secondary Actions in clean 2-column row on mobile */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:border-slate-300 cursor-pointer"
                  >
                    <UserCog size={15} className="text-slate-600 shrink-0" />
                    <span>Update Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-rose-200/80 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:border-rose-300 cursor-pointer group"
                    title="Log out of Stay Aalaya"
                  >
                    <LogOut size={14} className="text-rose-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Interactive Metric Filter Cards (2x2 on Mobile, 4-col on Desktop) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
          {/* Card 1: Saved PGs */}
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === 'saved'
                ? 'bg-rose-50/60 border-rose-400 shadow-md ring-2 ring-rose-400/20'
                : 'bg-white border-slate-200/80 hover:border-rose-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Saved PGs
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Heart size={15} className="fill-rose-500/20" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-slate-900">
              {savedPGs.length}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              Bookmarked stays
            </div>
          </button>

          {/* Card 2: My Reviews */}
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === 'reviews'
                ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                : 'bg-white border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                My Reviews
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Star size={15} className="fill-amber-500/20" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-slate-900">
              {myReviews.length}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              Verified reviews
            </div>
          </button>

          {/* Card 3: Account Status */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === 'profile'
                ? 'bg-emerald-50/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800 truncate">
                Account Status
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-emerald-700 flex items-center gap-1.5">
              Verified
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] sm:text-xs text-emerald-600 mt-0.5 truncate font-medium">
              Active student profile
            </div>
          </button>

          {/* Card 4: Host Mode */}
          <button
            type="button"
            onClick={() => {
              if (ownerStatus === 'approved') {
                navigate('/owner');
              } else {
                setActiveTab('owner');
              }
            }}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              activeTab === 'owner'
                ? 'bg-indigo-50/70 border-indigo-400 shadow-md ring-2 ring-indigo-400/20'
                : 'bg-white border-slate-200/80 hover:border-indigo-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Host Access
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Building2 size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-[#0f2547] capitalize truncate">
              {ownerStatus === 'approved' ? 'Approved' : ownerStatus === 'pending' ? 'In Review' : 'Become Host'}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              {ownerStatus === 'approved'
                ? 'Owner dashboard active'
                : ownerStatus === 'pending'
                ? 'Verification in progress'
                : 'List your property'}
            </div>
          </button>
        </div>

        {/* ── Main Tab Navigation Bar (Matches Owner Dashboard) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth -mx-1 px-1">
            {TABS.map((t) => {
              const isActive = activeTab === t.id;
              let badge = null;
              if (t.id === 'saved' && savedPGs.length > 0) badge = savedPGs.length;
              if (t.id === 'reviews' && myReviews.length > 0) badge = myReviews.length;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0f2547] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <t.icon size={15} className={isActive ? 'text-[#f5a623]' : 'text-slate-400'} />
                  <span>{t.label}</span>
                  {badge !== null && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-[#f5a623] text-[#0f2547]' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                  {t.id === 'owner' && ownerStatus !== 'none' && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        ownerStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ownerStatus}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Find More Link on Saved PGs tab */}
          {activeTab === 'saved' && savedPGs.length > 0 && (
            <button
              type="button"
              onClick={() => navigate('/find-pg')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline cursor-pointer sm:self-center"
            >
              <Compass size={14} /> Find More PGs
            </button>
          )}
        </div>

        {/* ── Tab Content Areas ── */}

        {/* 1. Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Personal Details Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 lg:p-8">
              <div className="pb-4 mb-4 sm:mb-6 border-b border-slate-100">
                <h3 className="font-display font-bold text-slate-900 text-base sm:text-xl">
                  Personal & Contact Information
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Your verified student details for booking requests and landlord communication
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Full Name */}
                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Full Name
                      </span>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5 truncate">
                        {currentUser?.name || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                      <Phone size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Phone Number
                      </span>
                      {currentUser?.phone ? (
                        <p className="font-semibold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5 truncate">
                          {currentUser.phone}
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            Active
                          </span>
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setProfileOpen(true)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-semibold underline mt-0.5 cursor-pointer block truncate"
                        >
                          + Add Phone Number
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Email Address
                      </span>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5 truncate" title={currentUser?.email}>
                        {currentUser?.email}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={11} /> Verified
                  </span>
                </div>

                {/* Account Role */}
                <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
                      <Shield size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Account Role
                      </span>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5 truncate">
                        {currentUser?.role === 'owner' ? 'Property Owner' : 'Student / Tenant'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded-full">
                    Member
                  </span>
                </div>
              </div>
            </div>

            {/* Safety & Student Benefits Banner */}
            <div className="bg-gradient-to-br from-[#0f2547] to-[#1a3c6e] rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f5a623] text-[#0f2547] uppercase tracking-wider">
                    Verified Sikkim Stays
                  </span>
                  <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                    <ShieldCheck size={13} /> Zero Brokerage
                  </span>
                </div>
                <h4 className="text-base sm:text-xl font-bold font-display">
                  Find your perfect home near campus
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Every PG on Stay Aalaya is physically verified with verified landlord phone numbers and zero hidden booking fees.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/find-pg')}
                className="px-5 py-2.5 rounded-xl bg-[#f5a623] hover:bg-[#ffb43a] active:bg-[#e09418] text-[#0f2547] font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
              >
                <Compass size={15} />
                <span>Search Accommodations</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 2. Saved PGs Tab */}
        {activeTab === 'saved' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="font-bold text-slate-900 text-xl font-display flex items-center gap-2">
                  <span>Saved PGs & Hostels</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    {savedPGs.length}
                  </span>
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Your bookmarked rooms across Sikkim colleges and localities
                </p>
              </div>

              {/* In-tab search if user has saved multiple PGs */}
              {savedPGs.length > 2 && (
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchSavedQuery}
                    onChange={(e) => setSearchSavedQuery(e.target.value)}
                    placeholder="Search saved stays..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 bg-white"
                  />
                  {searchSavedQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchSavedQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {savedPGs.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-10">
                <EmptyState
                  title="No saved PGs yet"
                  message="You haven't bookmarked any stays. Explore verified rooms in Gangtok, Tadong, Majitar, and around Sikkim colleges."
                  icon={Heart}
                  actionLabel="Explore Sikkim PGs"
                  onAction={() => navigate('/find-pg')}
                />
              </div>
            ) : displayedSavedPGs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                <p className="text-sm text-slate-600 font-medium">
                  No saved stays match "{searchSavedQuery}"
                </p>
                <button
                  type="button"
                  onClick={() => setSearchSavedQuery('')}
                  className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {displayedSavedPGs.map((pg) => (
                  <PGCard key={pg.id} pg={pg} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. My Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-slate-900 text-xl font-display flex items-center gap-2">
                  <span>My Reviews</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {myReviews.length}
                  </span>
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Reviews and ratings you shared with the Sikkim student community
                </p>
              </div>
            </div>

            {myReviews.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-10">
                <EmptyState
                  title="No reviews yet"
                  message="Visit any PG detail page to share your experience and write your first verified review for other students."
                  icon={Star}
                  actionLabel="Browse PGs to Review"
                  onAction={() => navigate('/find-pg')}
                />
              </div>
            ) : (
              <div className="space-y-3.5 sm:space-y-4">
                {myReviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-6 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          {currentPhoto ? (
                            <img
                              src={currentPhoto}
                              alt={currentUser?.name || 'User'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-sm">
                              {currentUser?.name?.charAt(0)?.toUpperCase() || 'S'}
                            </div>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/pg/${r.pgId}`)}
                            className="font-bold text-slate-900 hover:text-primary-600 transition-colors flex items-center gap-1 text-sm sm:text-base cursor-pointer"
                          >
                            <span>{r.pgTitle}</span>
                            <ChevronRight size={15} className="text-slate-400" />
                          </button>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {r.createdAt}
                          </p>
                        </div>
                      </div>

                      <div className="self-start sm:self-auto">
                        <StarRating rating={r.rating} size="sm" />
                      </div>
                    </div>

                    <p className="text-slate-700 text-xs sm:text-sm leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      "{r.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Become an Owner / Host Tab */}
        {activeTab === 'owner' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0f2547] text-[#f5a623]">
                Stay Aalaya Host Portal
              </span>
            </div>
            <h2 className="font-bold text-slate-900 text-xl sm:text-2xl font-display mb-1.5">
              Become a Verified Property Owner
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-2xl leading-relaxed">
              List your hostel, homestay, or PG in Sikkim and connect directly with incoming students from SMIT, ICFAI, Sikkim University, SRM, and working professionals.
            </p>

            {ownerStatus === 'none' && (
              <div>
                <div className="bg-gradient-to-br from-amber-50/60 via-slate-50 to-white rounded-2xl p-5 sm:p-6 mb-6 border border-amber-200/80">
                  <h3 className="font-bold text-[#0f2547] text-sm sm:text-base mb-3.5 flex items-center gap-2">
                    <Sparkles size={16} className="text-[#f5a623]" /> Key benefits of listing on Stay Aalaya
                  </h3>
                  <ul className="space-y-2.5">
                    {[
                      'List unlimited PGs and rooms on Sikkim’s dedicated student portal',
                      'Direct inquiries via verified WhatsApp and phone numbers',
                      'Earn a Verified Property Badge after physical room inspection',
                      'Live availability toggle to control vacant vs occupied status',
                      'Zero listing commission or hidden broker charges',
                    ].map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-center gap-2.5 text-slate-700 text-xs sm:text-sm font-medium"
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/list-your-pg')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0f2547] to-[#1a3c6e] hover:from-[#132f57] hover:to-[#224b86] text-white font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 border border-amber-400/30"
                >
                  <span>Apply for Host Access</span>
                  <ChevronRight size={16} className="text-[#f5a623]" />
                </button>
              </div>
            )}

            {ownerStatus === 'pending' && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                    <Clock size={20} className="text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                      Host Application Under Review
                    </h3>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Submitted on your account
                    </p>
                  </div>
                </div>
                <p className="text-amber-800 text-xs sm:text-sm mt-3 leading-relaxed">
                  Your owner access request is being verified by our Sikkim administration team. Once verified, you will receive an in-app notification and instant access to your Property Owner Dashboard.
                </p>
              </div>
            )}

            {ownerStatus === 'approved' && (
              <div>
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 sm:p-6 mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
                        You are an Approved Property Owner!
                      </h3>
                      <p className="text-emerald-700 text-xs mt-0.5">
                        Full owner listing permissions active
                      </p>
                    </div>
                  </div>
                  <p className="text-emerald-800 text-xs sm:text-sm mt-3 leading-relaxed">
                    You can list and manage your rooms, amenities, rent pricing, and student inquiries directly from your Owner Dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/owner')}
                  className="px-6 py-3 rounded-xl bg-[#0f2547] hover:bg-[#16335d] text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer border border-amber-400/30"
                >
                  <span>Go to Owner Dashboard</span>
                  <ChevronRight size={16} className="text-[#f5a623]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── FULL-SCREEN PHOTO LIGHTBOX MODAL (Matches Owner Dashboard) ── */}
      {isPhotoLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
          onClick={() => setIsPhotoLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Profile photo full screen preview"
        >
          <div
            className="relative max-w-xl w-full bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-700/80 shadow-2xl p-4 sm:p-6 flex flex-col items-center animate-slide-up max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="w-full flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 mb-3 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-xs border border-amber-400/40 shrink-0">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base font-display truncate">
                    {currentUser?.name || 'Student Profile Photo'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Verified Student • Stay Aalaya</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsPhotoLightboxOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Close (Esc)"
                aria-label="Close photo preview"
              >
                <X size={16} />
              </button>
            </div>

            {/* Centered Image */}
            <div className="relative w-full max-h-[48vh] sm:max-h-[58vh] flex items-center justify-center my-2 overflow-hidden rounded-xl bg-slate-950/50 p-2">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={currentUser?.name || 'Full Profile'}
                  className="max-h-[44vh] sm:max-h-[54vh] max-w-full object-contain rounded-xl shadow-lg ring-1 ring-white/10"
                />
              ) : (
                <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#0f2547] to-[#1e3a6a] text-[#f5a623] flex items-center justify-center font-bold text-5xl sm:text-6xl font-display shadow-2xl border-4 border-white/10">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
              )}

              {/* Uploading Spinner */}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                  <Loader2 size={28} className="animate-spin text-amber-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-200">
                    Uploading photo to Cloudinary...
                  </span>
                </div>
              )}
            </div>

            {/* Dedicated Lightbox Actions Bar */}
            <div className="w-full pt-3 mt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-[#0f2547] hover:bg-[#1a3d6e] text-white text-xs sm:text-sm font-semibold border border-amber-400/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md disabled:opacity-50"
                >
                  <Camera size={14} className="text-[#f5a623]" />
                  <span>{currentPhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {currentPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {currentPhoto && (
                  <a
                    href={currentPhoto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial text-center px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} /> Original
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsPhotoLightboxOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── UPDATE PROFILE MODAL (Uses shared Modal component) ── */}
      <Modal
        isOpen={profileOpen}
        onClose={() => {
          if (!isSavingProfile && !isUploadingPhoto) setProfileOpen(false);
        }}
        title="Update Profile"
        onConfirm={handleUpdateProfile}
        confirmText={isSavingProfile ? 'Saving...' : 'Save Profile'}
        confirmVariant="primary"
        loading={isSavingProfile}
        confirmDisabled={isSavingProfile || isUploadingPhoto}
      >
        <div className="space-y-3.5 sm:space-y-4">
          {/* Profile Photo Management Section inside Modal */}
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90">
            <div className="relative shrink-0 w-14 h-14 sm:w-16 sm:h-16">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xs border-2 border-white ring-2 ring-slate-200/80 bg-white flex items-center justify-center relative">
                {profileAvatar ? (
                  <img
                    src={profileAvatar}
                    alt={profileName || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-xl sm:text-2xl font-display">
                    {profileName?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                )}

                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white z-20">
                    <Loader2 size={16} className="animate-spin text-amber-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 mb-0.5">Profile Photo</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mb-1.5 line-clamp-1">
                Help Sikkim hosts identify you for bookings. Max 10MB.
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto || isSavingProfile}
                  className="px-2.5 sm:px-3 py-1 rounded-lg bg-white border border-slate-300 hover:border-amber-400 text-slate-800 text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Camera size={11} className="text-[#f5a623]" />
                  <span>{profileAvatar ? 'Change' : 'Upload'}</span>
                </button>
                {profileAvatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto || isSavingProfile}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                disabled={isSavingProfile}
                className="w-full pl-8 pr-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone Number
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                disabled={isSavingProfile}
                className="w-full pl-8 pr-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                placeholder="e.g. +91 9876543210"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Used by verified property owners for booking confirmation.
            </p>
          </div>

          {/* Email (Read-Only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full pl-8 pr-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Email is linked to your login provider.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
