import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  CheckCircle,
  Clock,
  Home,
  UserCog,
  Heart,
  Camera,
  Loader2,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import StatusPill from '../../components/ui/StatusPill';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import Modal from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/index.jsx';
import { uploadFileToCloudinary } from '../../utils/cloudinaryUpload';
import { supabase } from '../../lib/supabaseClient';

const TABS = [
  { id: 'pgs', label: 'My PGs', icon: Building2 },
  { id: 'add', label: 'Add New PG', icon: Plus },
];

export default function OwnerDashboard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { getOwnerPGs, deletePG, createNotification } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pgs');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileAvatar, setProfileAvatar] = useState(
    currentUser?.avatar_url || currentUser?.avatar || ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileAvatar(currentUser.avatar_url || currentUser.avatar || '');
    }
  }, [currentUser]);

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

  const myPGs = getOwnerPGs(currentUser?.id);
  const stats = {
    total: myPGs.length,
    approved: myPGs.filter(p => p.status === 'approved').length,
    pendingDelete: myPGs.filter(p => p.status === 'pending_delete').length,
    rejected: myPGs.filter(p => p.status === 'rejected').length,
  };

  const handleDelete = async () => {
    if (deleteReason.trim().length < 10) {
      toast.error('Please enter delete reason (minimum 10 characters)');
      return;
    }
    try {
      await deletePG(deleteId, deleteReason.trim());
      setDeleteId(null);
      setDeleteReason('');
      toast.success('Deletion request submitted to admin for approval');
    } catch (e) {
      toast.error(e?.message || 'Failed to send deletion request');
    }
  };

  // Immediate direct-to-Cloudinary upload and Supabase mutation
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

      // 2. Real database mutation directly on profiles table immediately after successful upload
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
    } catch (err) {
      toast.error('Failed to remove profile photo', { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Update profile details (name, phone) in Supabase
  const handleUpdateProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedPhone = profilePhone.trim();
    if (trimmedName.length < 2) {
      toast.error('Please enter a valid name');
      return;
    }
    if (trimmedPhone && !/^[0-9+\s\-()]{7,15}$/.test(trimmedPhone)) {
      toast.error('Please enter a valid phone number');
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

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3.5">
            {/* Owner Avatar in Dashboard Header */}
            <div className="relative group shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xs border-2 border-white ring-2 ring-slate-200/80 bg-slate-100 flex items-center justify-center relative">
                {profileAvatar || currentUser?.avatar_url || currentUser?.avatar ? (
                  <img
                    src={profileAvatar || currentUser?.avatar_url || currentUser?.avatar}
                    alt={currentUser?.name || 'Owner Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-xl font-display">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                )}

                {/* Loading spinner overlay */}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white z-20">
                    <Loader2 size={20} className="animate-spin text-amber-400" />
                  </div>
                )}

                {/* Hover overlay button to trigger photo select */}
                {!isUploadingPhoto && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-10"
                    title="Change profile photo"
                  >
                    <Camera size={16} />
                    <span className="text-[9px] font-bold mt-0.5">Edit</span>
                  </button>
                )}
              </div>

              {/* Camera Badge Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#0f2547] text-[#f5a623] border-2 border-white shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 z-20"
                title="Upload Photo"
              >
                <Camera size={11} />
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                aria-hidden="true"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                  {currentUser?.name || 'Owner Dashboard'}
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  PG OWNER
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Camera size={11} />
                  <span>{profileAvatar || currentUser?.avatar_url || currentUser?.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {(profileAvatar || currentUser?.avatar_url || currentUser?.avatar) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                {currentUser?.email} {currentUser?.phone ? `• ${currentUser.phone}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/saved-pgs')}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs"
            >
              <Heart size={15} /> Saved PGs
            </button>
            <button
              onClick={handleOpenProfileModal}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer"
            >
              <UserCog size={15} /> Update Profile
            </button>
            <button
              onClick={() => navigate('/owner/add')}
              className="w-full sm:w-auto justify-center btn-primary flex items-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm shadow-md"
            >
              <Plus size={16} /> Add New PG
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Live / Active', value: stats.approved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending Delete', value: stats.pendingDelete, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 sm:p-5 border border-white`}>
              <div className={`text-2xl sm:text-3xl font-bold font-display ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs sm:text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* PG List */}
        {myPGs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <EmptyState
              title="No PGs listed yet"
              message="Start by adding your first property listing."
              icon={Home}
              actionLabel="Add New PG"
              onAction={() => navigate('/owner/add')}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {myPGs.map(pg => (
              <div
                key={pg.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row gap-3.5 sm:gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-primary-100 shrink-0">
                    {pg.images?.[0] ? (
                      <img src={pg.images[0]} alt={pg.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={22} className="text-primary-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {pg.title}
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5 truncate">
                          {pg.location.area}, {pg.location.city}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={pg.status} />
                        {pg.status === 'approved' && (
                          <VerifiedBadge isVerified={pg.isVerified} size="sm" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-primary-600 font-bold text-sm">
                        ₹{pg.price.toLocaleString('en-IN')}/mo
                      </span>
                      <span className="text-slate-400 text-xs">
                        · {pg.roomType} · {pg.genderPreference}
                      </span>
                    </div>

                    {pg.status === 'pending_delete' && (
                      <div className="mt-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0" />
                        Deletion request submitted — pending admin approval
                      </div>
                    )}

                    {pg.rejectionReason && (
                      <p className="text-red-500 text-xs mt-2 bg-red-50 px-3 py-1.5 rounded-lg">
                        Rejection reason: {pg.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex sm:flex-col items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <button
                    onClick={() => navigate(`/owner/edit/${pg.id}`)}
                    className="flex-1 sm:flex-initial w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  {pg.status === 'pending_delete' ? (
                    <span className="flex-1 sm:flex-initial w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-rose-50 text-rose-600 rounded-xl border border-rose-200 cursor-not-allowed">
                      <Clock size={12} /> Pending Delete
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeleteId(pg.id)}
                      className="flex-1 sm:flex-initial w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => { setDeleteId(null); setDeleteReason(''); }} title="Delete PG"
        onConfirm={handleDelete} confirmText="Send Request" confirmVariant="danger">
        <p className="text-slate-600 text-sm mb-3">Delete requires admin approval. Please provide the reason for deletion.</p>
        <textarea
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          rows={4}
          className="input-field resize-none text-sm"
          placeholder="Example: Property lease ended, listing is no longer active."
        />
      </Modal>

      <Modal
        isOpen={profileOpen}
        onClose={handleCloseProfileModal}
        title="Update Profile"
        onConfirm={handleUpdateProfile}
        confirmText={isSavingProfile ? 'Saving...' : 'Save Changes'}
        confirmVariant="primary"
        loading={isSavingProfile}
        confirmDisabled={isSavingProfile}
      >
        <div className="space-y-4">
          {/* Profile Photo Upload Section in Modal */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden shadow-sm border-2 border-white ring-2 ring-slate-200/80 bg-white flex items-center justify-center relative">
                {profileAvatar ? (
                  <img
                    src={profileAvatar}
                    alt={profileName || currentUser?.name || 'Owner Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-2xl font-display">
                    {profileName?.charAt(0)?.toUpperCase() || currentUser?.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                )}

                {/* Loading overlay during upload */}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white z-20">
                    <Loader2 size={20} className="animate-spin text-amber-400" />
                    <span className="text-[9px] font-bold mt-1">Uploading...</span>
                  </div>
                )}

                {/* Hover overlay button to trigger photo select */}
                {!isUploadingPhoto && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer z-10"
                    title="Change profile photo"
                  >
                    <Camera size={18} />
                    <span className="text-[9px] font-bold mt-0.5">Change</span>
                  </button>
                )}
              </div>

              {/* Camera Badge Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto || isSavingProfile}
                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#0f2547] text-[#f5a623] border border-white shadow-sm hover:scale-110 active:scale-95 transition-transform cursor-pointer disabled:opacity-50 z-20"
                title="Upload Photo"
              >
                <Camera size={12} />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-slate-800">Profile Photo</p>
                {isUploadingPhoto && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Uploading to Cloudinary...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                Upload a clear photo. JPG, PNG or WebP (max 10MB).
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto || isSavingProfile}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-[#0f2547] text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Camera size={12} className="text-[#f5a623]" />
                  <span>
                    {profileAvatar ? 'Change Photo' : 'Upload Photo'}
                  </span>
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              disabled={isSavingProfile}
              className="input-field text-sm"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              disabled={isSavingProfile}
              className="input-field text-sm"
              placeholder="e.g. +91 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              value={currentUser?.email || ''}
              disabled
              className="input-field text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
