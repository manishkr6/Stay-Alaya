import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  Clock,
  Home,
  UserCog,
  Camera,
  Loader2,
  User,
  Maximize2,
  Eye,
  ExternalLink,
  Share2,
  Check,
  Search,
  LayoutGrid,
  ListFilter,
  IndianRupee,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  RefreshCw,
  Star,
  X,
  ShieldCheck,
  MapPin,
  Users,
  Bed,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import StatusPill from '../../components/ui/StatusPill';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import Modal from '../../components/ui/Modal';
import { uploadFileToCloudinary } from '../../utils/cloudinaryUpload';
import { supabase } from '../../lib/supabaseClient';

export default function OwnerDashboard() {
  const { currentUser, updateCurrentUser, logout } = useAuth();
  const {
    getOwnerPGs,
    deletePG,
    createNotification,
    togglePGAvailability,
    fetchOwnerPgs,
    reviews,
  } = useData();
  const navigate = useNavigate();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState('properties'); // 'properties' | 'reviews' | 'tips'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'rejected'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Action States
  const [deleteId, setDeleteId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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

  // Sync profile details with currentUser
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileAvatar(currentUser.avatar_url || currentUser.avatar || '');
    }
  }, [currentUser]);

  // Handle keyboard shortcuts (Escape to close modals & lightbox)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isPhotoLightboxOpen) setIsPhotoLightboxOpen(false);
        if (profileOpen && !isSavingProfile && !isUploadingPhoto) setProfileOpen(false);
        if (deleteId && !isDeleting) {
          setDeleteId(null);
          setDeleteReason('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPhotoLightboxOpen, profileOpen, isSavingProfile, isUploadingPhoto, deleteId, isDeleting]);

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

  // Owner PGs list
  const myPGs = useMemo(() => {
    return getOwnerPGs(currentUser?.id) || [];
  }, [getOwnerPGs, currentUser?.id]);

  // Calculate live statistics
  const stats = useMemo(() => {
    const total = myPGs.length;
    const approved = myPGs.filter((p) => p.status === 'approved').length;
    const pending = myPGs.filter(
      (p) =>
        p.status === 'pending' ||
        p.status === 'pending_delete' ||
        p.status === 'pending_update'
    ).length;
    const rejected = myPGs.filter((p) => p.status === 'rejected').length;
    const activeMonthlyRent = myPGs
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + (Number(p.price || p.rent) || 0), 0);

    return {
      total,
      approved,
      pending,
      rejected,
      activeMonthlyRent,
    };
  }, [myPGs]);

  // Collect all student reviews for owner's properties
  const ownerReviews = useMemo(() => {
    if (!myPGs.length) return [];
    const pgMap = new Map(myPGs.map((p) => [String(p.id), p]));
    return (reviews || [])
      .filter((r) => pgMap.has(String(r.pgId)))
      .map((r) => {
        const pg = pgMap.get(String(r.pgId));
        return {
          ...r,
          pgTitle: pg?.title || 'Your Property',
          pgArea: pg?.location?.area || pg?.location?.city || 'Gangtok',
        };
      })
      .sort((a, b) => new Date(b.rawCreatedAt || b.createdAt) - new Date(a.rawCreatedAt || a.createdAt));
  }, [myPGs, reviews]);

  // Filtered & Sorted PGs
  const displayedPGs = useMemo(() => {
    let result = [...myPGs];

    // Status Filter
    if (statusFilter === 'approved') {
      result = result.filter((p) => p.status === 'approved');
    } else if (statusFilter === 'pending') {
      result = result.filter(
        (p) =>
          p.status === 'pending' ||
          p.status === 'pending_delete' ||
          p.status === 'pending_update'
      );
    } else if (statusFilter === 'rejected') {
      result = result.filter((p) => p.status === 'rejected');
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const cityMatch = (p.location?.city || '').toLowerCase().includes(q);
        const areaMatch = (p.location?.area || '').toLowerCase().includes(q);
        const addressMatch = (p.location?.address || '').toLowerCase().includes(q);
        const roomMatch = (p.roomType || '').toLowerCase().includes(q);
        const genderMatch = (p.genderPreference || '').toLowerCase().includes(q);
        return titleMatch || cityMatch || areaMatch || addressMatch || roomMatch || genderMatch;
      });
    }

    // Sort newest first by default
    result.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    return result;
  }, [myPGs, statusFilter, searchQuery]);

  // Refresh handler with visual indicator
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (fetchOwnerPgs) {
        await fetchOwnerPgs();
      }
      toast.success('Properties up to date!');
    } catch (err) {
      toast.error('Failed to refresh properties');
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

  // Profile Modal Handlers
  const handleOpenProfileModal = () => {
    setProfileName(currentUser?.name || '');
    setProfilePhone(currentUser?.phone || '');
    setProfileAvatar(currentUser?.avatar_url || currentUser?.avatar || '');
    setProfileOpen(true);
  };

  const handleCloseProfileModal = () => {
    if (isSavingProfile || isUploadingPhoto) return;
    setProfileName(currentUser?.name || '');
    setProfilePhone(currentUser?.phone || '');
    setProfileAvatar(currentUser?.avatar_url || currentUser?.avatar || '');
    setProfileOpen(false);
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
        'owner';

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
        targetRole: 'owner',
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
        targetRole: 'owner',
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
          targetRole: 'owner',
          message: `Your contact phone number was updated to ${trimmedPhone}.`,
          type: 'PHONE_UPDATE',
        });
      } else {
        await createNotification({
          userId: currentUser.id,
          targetRole: 'owner',
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

  // Live Availability Toggle
  const handleToggleAvailability = async (pg) => {
    setTogglingId(pg.id);
    const currentAvail = pg.isAvailable !== false;
    try {
      if (togglePGAvailability) {
        await togglePGAvailability(pg.id, currentAvail);
      } else {
        await supabase
          .from('pg_listings')
          .update({
            is_available: !currentAvail,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pg.id);
        if (fetchOwnerPgs) await fetchOwnerPgs();
      }

      toast.success(
        !currentAvail
          ? `"${pg.title}" marked as Available for booking!`
          : `"${pg.title}" marked as Full / Occupied.`
      );
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      toast.error('Failed to update property status');
    } finally {
      setTogglingId(null);
    }
  };

  // Copy Public Share Link
  const handleCopyShareLink = (pgId) => {
    const url = `${window.location.origin}/pg/${pgId}`;
    navigator.clipboard.writeText(url).then(
      () => {
        setCopiedId(pgId);
        toast.success('Public listing link copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2500);
      },
      () => {
        toast.error('Failed to copy link');
      }
    );
  };

  // Delete Request Submission
  const handleDelete = async () => {
    if (deleteReason.trim().length < 10) {
      toast.error('Please enter a deletion reason (at least 10 characters)');
      return;
    }
    setIsDeleting(true);
    try {
      await deletePG(deleteId, deleteReason.trim());
      setDeleteId(null);
      setDeleteReason('');
      toast.success('Deletion request submitted to admin for approval');
    } catch (e) {
      toast.error(e?.message || 'Failed to send deletion request');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentPhoto = profileAvatar || currentUser?.avatar_url || currentUser?.avatar || '';

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

        {/* ── Top Header / Owner Showcase Banner ── */}
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
                        alt={currentUser?.name || 'Owner Avatar'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#0f2547] to-[#1e3a6a] text-[#f5a623] flex items-center justify-center font-bold text-2xl sm:text-3xl font-display">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || 'O'}
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

                {/* Owner Identity Information */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate">
                      {currentUser?.name || 'Host Dashboard'}
                    </h1>
                    <span className="text-[9px] sm:text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#0f2547] text-[#f5a623] border border-amber-400/30 flex items-center gap-1 shadow-2xs shrink-0">
                      <ShieldCheck size={11} className="text-[#f5a623]" />
                      PG OWNER
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
                        onClick={handleOpenProfileModal}
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
                      <strong className="text-slate-800 font-semibold">{stats.total} PGs</strong> in Sikkim • {stats.approved} live
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {/* Primary Add New PG button is full-width on mobile */}
                <button
                  type="button"
                  onClick={() => navigate('/owner/add')}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0f2547] to-[#1a3c6e] hover:from-[#132f57] hover:to-[#224b86] text-white text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer border border-amber-400/30 order-1 sm:order-last"
                >
                  <Plus size={16} className="text-[#f5a623] stroke-[3]" />
                  <span>Add New PG</span>
                </button>

                {/* Secondary Actions in clean 2-column row on mobile */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1">
                  <button
                    type="button"
                    onClick={handleOpenProfileModal}
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

        {/* ── Interactive Metric Filter Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
          {/* Total Properties */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('properties');
              setStatusFilter('all');
            }}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              statusFilter === 'all' && activeTab === 'properties'
                ? 'bg-white border-[#0f2547] shadow-md ring-2 ring-[#0f2547]/10'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Total Properties
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Building2 size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-slate-900">
              {stats.total}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              All registered listings
            </div>
          </button>

          {/* Active / Approved */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('properties');
              setStatusFilter('approved');
            }}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              statusFilter === 'approved' && activeTab === 'properties'
                ? 'bg-emerald-50/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-white border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800 truncate">
                Live / Active
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-emerald-700 flex items-center gap-1.5">
              {stats.approved}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] sm:text-xs text-emerald-600 mt-0.5 truncate font-medium">
              Visible to students
            </div>
          </button>

          {/* Pending Approval / Delete */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('properties');
              setStatusFilter('pending');
            }}
            className={`p-3 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
              statusFilter === 'pending' && activeTab === 'properties'
                ? 'bg-amber-50/70 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                : 'bg-white border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800 truncate">
                In Review
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Clock size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-amber-700">
              {stats.pending}
            </div>
            <div className="text-[10px] sm:text-xs text-amber-600 mt-0.5 truncate font-medium">
              Pending admin check
            </div>
          </button>

          {/* Potential Monthly Revenue */}
          <div className="p-3 sm:p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                Active Rent Volume
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                <IndianRupee size={15} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-[#0f2547] truncate">
              ₹{stats.activeMonthlyRent.toLocaleString('en-IN')}
              <span className="text-[11px] font-sans font-medium text-slate-400 ml-1">/mo</span>
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <TrendingUp size={11} className="text-emerald-600 shrink-0" />
              <span>Active listings total</span>
            </div>
          </div>
        </div>

        {/* ── Main Tab Navigation Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth -mx-1 px-1">
            <button
              type="button"
              onClick={() => setActiveTab('properties')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'properties'
                  ? 'bg-[#0f2547] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <Building2 size={15} className={activeTab === 'properties' ? 'text-[#f5a623]' : ''} />
              <span>Properties</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'properties' ? 'bg-[#f5a623] text-[#0f2547]' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {myPGs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-[#0f2547] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <Star size={15} className={activeTab === 'reviews' ? 'text-[#f5a623]' : ''} />
              <span>Student Reviews</span>
              {ownerReviews.length > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'reviews'
                      ? 'bg-[#f5a623] text-[#0f2547]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ownerReviews.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tips')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                activeTab === 'tips'
                  ? 'bg-[#0f2547] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <Sparkles size={15} className={activeTab === 'tips' ? 'text-[#f5a623]' : ''} />
              <span>Host Guide</span>
            </button>
          </div>

          {/* Quick active filter indicator badge */}
          {statusFilter !== 'all' && activeTab === 'properties' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filtered:</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                <span>{statusFilter.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-red-700 cursor-pointer"
                  title="Clear filter"
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          )}
        </div>

        {/* ── TAB 1: PROPERTIES MANAGEMENT ── */}
        {activeTab === 'properties' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Search, Filter & Layout Toolbar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
              {/* Search input */}
              <div className="relative w-full md:max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, area, or room type..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-xs sm:text-sm text-slate-800 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Tabs & Sort Dropdown */}
              <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                {/* Status Pills */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar shrink-0">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'approved', label: 'Active' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'rejected', label: 'Rejected' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusFilter(s.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === s.id
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Grid / List view mode switcher (hidden on small phones) */}
                <div className="hidden sm:flex items-center gap-1 border border-slate-200 p-0.5 rounded-xl bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="List View"
                  >
                    <ListFilter size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Listings Grid or Empty State */}
            {displayedPGs.length === 0 ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                  <Home size={26} />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 mb-1">
                  {myPGs.length === 0 ? 'No Properties Listed Yet' : 'No Matching Properties Found'}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-5">
                  {myPGs.length === 0
                    ? 'Start welcoming students by listing your first paying guest property in Sikkim.'
                    : 'Try clearing your search query or switching your status filter to see other properties.'}
                </p>
                {myPGs.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate('/owner/add')}
                    className="px-5 py-2.5 rounded-xl bg-[#0f2547] hover:bg-[#18396b] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
                  >
                    <Plus size={16} className="text-[#f5a623]" />
                    <span>Add Your First PG</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* ── Grid View ── */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {displayedPGs.map((pg) => {
                  const isAvailable = pg.isAvailable !== false;
                  const isPendingDelete = pg.status === 'pending_delete';
                  const photosCount = Array.isArray(pg.images) ? pg.images.length : 0;

                  return (
                    <div
                      key={pg.id}
                      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
                    >
                      {/* Card Image Banner */}
                      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                        {pg.images?.[0] ? (
                          <img
                            src={pg.images[0]}
                            alt={pg.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                            <Home size={28} className="text-slate-300 mb-1" />
                            <span className="text-[11px]">No property photos</span>
                          </div>
                        )}

                        {/* Top Overlay Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusPill status={pg.status} />
                            {pg.status === 'approved' && (
                              <VerifiedBadge isVerified={pg.isVerified} size="sm" />
                            )}
                          </div>
                          {photosCount > 1 && (
                            <span className="bg-slate-900/75 text-white text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                              📷 {photosCount} photos
                            </span>
                          )}
                        </div>

                        {/* Bottom Overlay Rent Pill */}
                        <div className="absolute bottom-2.5 left-2.5 bg-[#0f2547]/95 text-white backdrop-blur-sm px-2.5 py-1 rounded-xl shadow-md border border-amber-400/30 flex items-center gap-1">
                          <span className="font-bold text-xs sm:text-sm text-[#f5a623] font-display">
                            ₹{Number(pg.price || pg.rent).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-300">/mo</span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3
                              className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-primary-700 transition-colors"
                              title={pg.title}
                            >
                              {pg.title}
                            </h3>
                          </div>

                          <p className="text-slate-500 text-xs flex items-center gap-1.5 mb-2.5 line-clamp-1">
                            <MapPin size={12} className="text-[#f5a623] shrink-0" />
                            <span className="truncate">
                              {pg.location?.address ? `${pg.location.address}, ` : ''}
                              {pg.location?.area || pg.location?.city || 'Gangtok'}
                            </span>
                          </p>

                          {/* Property Specs Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                            <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1">
                              <Bed size={11} className="text-slate-500" />
                              {pg.roomType} Room
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg flex items-center gap-1">
                              <Users size={11} className="text-slate-500" />
                              {pg.genderPreference}
                            </span>
                            {Number(pg.averageRating) > 0 && (
                              <span className="text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/60 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Star size={10} className="fill-amber-400 text-amber-500" />
                                {pg.averageRating} ({pg.totalReviews})
                              </span>
                            )}
                          </div>

                          {/* Live Availability Toggle Switch */}
                          {pg.status === 'approved' && (
                            <div className="bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                  }`}
                                />
                                <span className="text-[11px] sm:text-xs font-semibold text-slate-800">
                                  {isAvailable ? 'Accepting Inquiries' : 'Marked as Full'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleAvailability(pg)}
                                disabled={togglingId === pg.id}
                                className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                  isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                                title="Click to toggle booking availability"
                              >
                                {togglingId === pg.id ? (
                                  <Loader2 size={11} className="animate-spin inline mr-1" />
                                ) : null}
                                <span>{isAvailable ? 'Active' : 'Mark Available'}</span>
                              </button>
                            </div>
                          )}

                          {/* Alerts for Pending Delete or Rejection */}
                          {isPendingDelete && (
                            <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] sm:text-xs p-2 rounded-xl flex items-center gap-1.5">
                              <Clock size={13} className="shrink-0 text-rose-600" />
                              <span className="leading-tight">
                                Deletion request pending admin verification
                              </span>
                            </div>
                          )}

                          {pg.rejectionReason && (
                            <div className="mb-3 bg-red-50 border border-red-200 text-red-800 text-[11px] sm:text-xs p-2 rounded-xl flex items-start gap-1.5">
                              <AlertCircle size={13} className="shrink-0 text-red-600 mt-0.5" />
                              <div>
                                <span className="font-semibold block">Rejection Note:</span>
                                <span className="text-red-700">{pg.rejectionReason}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Row (2x2 on mobile, single row on tablet/desktop) */}
                        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2">
                          {/* Preview Public Page */}
                          <button
                            type="button"
                            onClick={() => navigate(`/pg/${pg.id}`)}
                            className="py-2 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Preview how students see this listing"
                          >
                            <Eye size={13} className="text-[#f5a623]" />
                            <span>Preview</span>
                          </button>

                          {/* Edit Listing */}
                          <button
                            type="button"
                            onClick={() => navigate(`/owner/edit/${pg.id}`)}
                            className="py-2 px-2.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          {/* Copy Share Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(pg.id)}
                            className="col-span-1 sm:col-auto py-2 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Copy link to share"
                          >
                            {copiedId === pg.id ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Share2 size={13} />
                            )}
                            <span className="sm:hidden">Share</span>
                          </button>

                          {/* Delete Listing Button */}
                          {isPendingDelete ? (
                            <span className="col-span-1 sm:col-auto py-2 px-2 rounded-xl bg-rose-50 text-rose-500 text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed border border-rose-200 truncate">
                              <Clock size={12} /> Pending
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteId(pg.id)}
                              className="col-span-1 sm:col-auto py-2 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              title="Request property deletion"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── List View ── */
              <div className="space-y-3">
                {displayedPGs.map((pg) => {
                  const isAvailable = pg.isAvailable !== false;
                  const isPendingDelete = pg.status === 'pending_delete';

                  return (
                    <div
                      key={pg.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 group"
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className="w-18 h-18 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                          {pg.images?.[0] ? (
                            <img
                              src={pg.images[0]}
                              alt={pg.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Home size={20} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                            <h3
                              className="font-bold text-slate-900 text-sm sm:text-base truncate group-hover:text-primary-700 transition-colors"
                              title={pg.title}
                            >
                              {pg.title}
                            </h3>
                            <StatusPill status={pg.status} />
                            {pg.status === 'approved' && (
                              <VerifiedBadge isVerified={pg.isVerified} size="sm" />
                            )}
                          </div>

                          <p className="text-slate-500 text-xs truncate">
                            {pg.location?.address ? `${pg.location.address}, ` : ''}
                            {pg.location?.area || pg.location?.city || 'Gangtok'}
                          </p>

                          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap text-xs">
                            <span className="text-[#0f2547] font-bold font-display">
                              ₹{Number(pg.price || pg.rent).toLocaleString('en-IN')}/mo
                            </span>
                            <span className="text-slate-400">
                              • {pg.roomType} • {pg.genderPreference}
                            </span>
                            {pg.status === 'approved' && (
                              <span
                                className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  isAvailable
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isAvailable ? '● Open' : '● Full'}
                              </span>
                            )}
                          </div>

                          {isPendingDelete && (
                            <p className="text-rose-600 text-[11px] mt-1 flex items-center gap-1 font-medium">
                              <Clock size={11} /> Deletion request pending admin approval
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/pg/${pg.id}`)}
                          className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} className="text-[#f5a623]" /> Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/owner/edit/${pg.id}`)}
                          className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={13} /> Edit
                        </button>

                        {isPendingDelete ? (
                          <span className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-rose-50 text-rose-500 text-xs font-semibold flex items-center justify-center gap-1 border border-rose-200">
                            Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteId(pg.id)}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: STUDENT REVIEWS & FEEDBACK ── */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                  Student Reviews & Ratings
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Feedback shared by students staying in your Sikkim properties
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full shrink-0">
                {ownerReviews.length} reviews
              </span>
            </div>

            {ownerReviews.length === 0 ? (
              <div className="text-center py-10 sm:py-12">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Star size={22} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm sm:text-base mb-1">No Reviews Yet</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  Once students visit or book your PG, their verified ratings and reviews will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {ownerReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 sm:p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-xs sm:text-sm shrink-0 border border-amber-400/30">
                          {r.userAvatar ? (
                            <img src={r.userAvatar} alt={r.userName} className="w-full h-full object-cover" />
                          ) : (
                            r.userName?.charAt(0)?.toUpperCase() || 'S'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                            {r.userName}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                            For: <span className="text-slate-700 font-medium">{r.pgTitle}</span>
                          </p>
                        </div>
                      </div>

                      {/* Stars & Date */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                s <= r.rating
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {r.createdAt || 'Recent'}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-700 text-xs sm:text-sm mt-2 p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/60 leading-relaxed">
                      "{r.comment || 'Great place to stay, recommended!'}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: HOST GUIDELINES & SIKKIM TIPS ── */}
        {activeTab === 'tips' && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-sm space-y-4 sm:space-y-6">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900">
                Host Guidelines & Sikkim Tips
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Best practices to get verified, boost student inquiries, and manage rentals smoothly
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-2.5">
                  <Camera size={17} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  High Quality Photos
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Listings with 4+ bright photos of the room, washroom, and study desk receive 40% more student calls and faster bookings.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-2.5">
                  <ShieldCheck size={17} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  KYC Verification Badge
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Keep your property documents and ID proof verified with the admin team to get the green "Verified" checkmark on student searches.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold mb-2.5">
                  <Phone size={17} />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Active Contact Number
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ensure your phone number is current in your profile. College students from Sikkim University, SMIT, and SRM call directly for room viewings.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FULL-SCREEN PHOTO LIGHTBOX MODAL ── */}
      {isPhotoLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
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
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'O'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base font-display truncate">
                    {currentUser?.name || 'Owner Profile Photo'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Verified PG Host • Stay Aalaya</p>
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

            {/* Centered Image (Max height responsive on small screens) */}
            <div className="relative w-full max-h-[48vh] sm:max-h-[58vh] flex items-center justify-center my-2 overflow-hidden rounded-xl bg-slate-950/50 p-2">
              {currentPhoto ? (
                <img
                  src={currentPhoto}
                  alt={currentUser?.name || 'Full Profile'}
                  className="max-h-[44vh] sm:max-h-[54vh] max-w-full object-contain rounded-xl shadow-lg ring-1 ring-white/10"
                />
              ) : (
                <div className="w-36 h-36 sm:w-52 sm:h-52 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-[#0f2547] to-[#1e3a6a] text-[#f5a623] flex items-center justify-center font-bold text-5xl sm:text-6xl font-display shadow-2xl border-4 border-white/10">
                  {currentUser?.name?.charAt(0)?.toUpperCase() || 'O'}
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

      {/* ── UPDATE PROFILE MODAL ── */}
      <Modal
        isOpen={profileOpen}
        onClose={handleCloseProfileModal}
        title="Update Host Profile"
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
                    {profileName?.charAt(0)?.toUpperCase() || 'O'}
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
                Clear host photo builds student trust. Max 10MB.
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
              Host Full Name <span className="text-red-500">*</span>
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
              Contact Phone Number <span className="text-red-500">*</span>
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
              Used by prospective Sikkim student tenants to call for viewings.
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
          </div>
        </div>
      </Modal>

      {/* ── DELETE PG CONFIRMATION MODAL ── */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => {
          setDeleteId(null);
          setDeleteReason('');
        }}
        title="Request Property Deletion"
        onConfirm={handleDelete}
        confirmText={isDeleting ? 'Submitting...' : 'Send Deletion Request'}
        confirmVariant="danger"
        loading={isDeleting}
        confirmDisabled={isDeleting || deleteReason.trim().length < 10}
      >
        <div className="space-y-3">
          <p className="text-slate-600 text-xs leading-relaxed">
            Property deletions in Stay Aalaya require administrative review to protect active student leases. Please provide the reason for removing this property listing.
          </p>
          <div>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 resize-none text-slate-900"
              placeholder="Example: Property lease has ended and rooms are no longer available for rent."
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>Minimum 10 characters</span>
              <span className={deleteReason.trim().length >= 10 ? 'text-emerald-600 font-semibold' : ''}>
                {deleteReason.trim().length}/10
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
