import { useState, useEffect, useRef } from "react";
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
  Save,
  Camera,
  Loader2,
  UploadCloud,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../hooks/useData";
import { uploadFileToCloudinary } from "../utils/cloudinaryUpload";
import { supabase } from "../lib/supabaseClient";
import PGCard from "../components/ui/PGCard";
import { EmptyState, StarRating } from "../components/ui/index.jsx";
import { useNavigate, useLocation } from "react-router-dom";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "saved", label: "Saved PGs", icon: Heart },
  { id: "reviews", label: "My Reviews", icon: Star },
  { id: "owner", label: "Become an Owner", icon: Building2 },
];

export default function Dashboard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { getSavedPGs, getPGReviews, getPGById, pgs, createNotification } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("profile");

  // Sync tab with URL search parameter (?tab=saved) or navigation state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") || location.state?.tab;
    if (tabParam && ["profile", "saved", "reviews", "owner"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search, location.state]);

  // Profile editing state (Name and Phone)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  // Profile photo upload state
  const fileInputRef = useRef(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(
    currentUser?.avatar_url || currentUser?.avatar || null
  );

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "");
      setProfilePhone(currentUser.phone || "");
      setPreviewPhoto(currentUser.avatar_url || currentUser.avatar || null);
    }
  }, [currentUser]);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file triggers onChange
    e.target.value = "";

    if (!file.type || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size should be under 10MB.");
      return;
    }

    // Set optimistic preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewPhoto(objectUrl);
    setIsUploadingPhoto(true);
    const toastId = toast.loading("Uploading profile photo to Cloudinary...");

    try {
      // 1. Extract user's name from Supabase auth metadata, profiles context, or email prefix fallback
      const userName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.name ||
        currentUser?.full_name ||
        (currentUser?.email ? currentUser.email.split("@")[0] : "") ||
        "user";

      // Direct-to-Cloudinary upload organized into user_profiles/{sanitizedName}/
      const secureUrl = await uploadFileToCloudinary(file, "profile", userName);

      // 2. Real database mutation directly on profiles table immediately after successful Cloudinary upload
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          avatar_url: secureUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id);

      if (dbError) throw dbError;

      // 3. Persist to Supabase auth session & local state
      await updateCurrentUser({
        avatar_url: secureUrl,
        avatar: secureUrl,
      });

      // 4. Role-isolated user notification (stays with user, not shown to admin)
      await createNotification({
        userId: currentUser?.id,
        targetRole: currentUser?.role || "student",
        message: "Your profile photo has been updated successfully.",
        type: "PROFILE_UPDATE",
      });

      setPreviewPhoto(secureUrl);
      toast.success("Profile photo updated successfully!", { id: toastId });
    } catch (err) {
      console.error("Profile photo upload failed:", err);
      // Revert preview on failure
      setPreviewPhoto(currentUser?.avatar_url || currentUser?.avatar || null);
      toast.error(err?.message || "Failed to upload photo to Cloudinary", { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    setIsUploadingPhoto(true);
    const toastId = toast.loading("Removing profile photo...");
    try {
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.id);

      if (dbErr) throw dbErr;

      await updateCurrentUser({
        avatar_url: "",
        avatar: "",
      });

      await createNotification({
        userId: currentUser?.id,
        targetRole: currentUser?.role || "student",
        message: "Your profile photo was removed.",
        type: "PROFILE_UPDATE",
      });

      setPreviewPhoto(null);
      toast.success("Profile photo removed successfully.", { id: toastId });
    } catch (err) {
      toast.error("Failed to remove profile photo.", { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (location.search.includes("verified=true") || location.hash.includes("access_token")) {
      toast.success("Email verified successfully! Welcome to Stay Alaya.", {
        id: "email-verified-toast",
      });
    }
  }, [location]);

  const savedPGs = getSavedPGs(currentUser?.id);
  const myReviews = pgs.flatMap((pg) =>
    getPGReviews(pg.id)
      .filter((r) => r.userId === currentUser?.id)
      .map((r) => ({ ...r, pgTitle: pg.title, pgId: pg.id })),
  );

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = profileName.trim();
    const trimmedPhone = profilePhone.trim();

    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }

    if (trimmedPhone && !/^[0-9+\s\-()]{7,15}$/.test(trimmedPhone)) {
      toast.error("Please enter a valid phone number (e.g. 9876543210)");
      return;
    }

    setIsSaving(true);
    try {
      await updateCurrentUser({
        name: trimmedName,
        phone: trimmedPhone,
      });

      if (trimmedPhone && trimmedPhone !== currentUser?.phone) {
        await createNotification({
          userId: currentUser.id,
          targetRole: currentUser.role || "student",
          message: `Your phone number was updated to ${trimmedPhone}.`,
          type: "PHONE_UPDATE",
        });
      } else {
        await createNotification({
          userId: currentUser.id,
          targetRole: currentUser.role || "student",
          message: "Your profile information was updated successfully.",
          type: "PROFILE_UPDATE",
        });
      }

      setIsEditingProfile(false);
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileName(currentUser?.name || "");
    setProfilePhone(currentUser?.phone || "");
    setIsEditingProfile(false);
  };

  const ownerStatus = currentUser?.ownerRequestStatus || "none";

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24 lg:pt-28 pb-12">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                My Dashboard
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
                Manage your profile, saved PGs, and more
              </p>
            </div>
            <button
              onClick={() => setActiveTab("saved")}
              className="self-start sm:self-auto px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shadow-xs"
            >
              <Heart size={15} /> View Saved PGs
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
          {/* Sidebar Tabs */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 sm:p-3 flex lg:flex-col overflow-x-auto gap-1 sm:gap-1.5 scrollbar-none">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 lg:w-full ${
                    activeTab === t.id
                      ? "bg-primary-600 text-white shadow-sm font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <t.icon size={15} /> <span>{t.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                      {/* Interactive Profile Avatar with direct Cloudinary upload */}
                      <div className="relative group self-start sm:self-center shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden shadow-md shadow-slate-900/10 border-2 border-white ring-2 ring-slate-200/80 bg-slate-100 flex items-center justify-center relative">
                          {previewPhoto || currentUser?.avatar_url || currentUser?.avatar ? (
                            <img
                              src={previewPhoto || currentUser?.avatar_url || currentUser?.avatar}
                              alt={currentUser?.name || "User Avatar"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-primary-700 to-primary-500 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold font-display">
                              {currentUser?.name?.charAt(0).toUpperCase() || <User size={32} />}
                            </div>
                          )}

                          {/* Loading Spinner Overlay */}
                          {isUploadingPhoto && (
                            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 animate-fade-in">
                              <Loader2 size={24} className="animate-spin text-amber-400" />
                              <span className="text-[10px] font-bold mt-1 tracking-wide">
                                Uploading...
                              </span>
                            </div>
                          )}

                          {/* Hover Overlay Button to trigger photo select */}
                          {!isUploadingPhoto && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white cursor-pointer z-10"
                              title="Click to change profile photo"
                              aria-label="Change Profile Photo"
                            >
                              <Camera size={20} className="drop-shadow" />
                              <span className="text-[10px] font-bold mt-1">Change</span>
                            </button>
                          )}
                        </div>

                        {/* Camera Action Badge */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#0f2547] hover:bg-[#16335d] text-[#f5a623] shadow-md border-2 border-white transition-all hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-50 z-20"
                          title="Upload new profile photo"
                          aria-label="Upload photo"
                        >
                          <Camera size={13} />
                        </button>

                        {/* Hidden File Input */}
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
                        <h2 className="font-semibold text-slate-900 text-xl flex items-center gap-2">
                          {currentUser?.name}
                        </h2>
                        <p className="text-slate-500 text-sm">{currentUser?.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              currentUser?.role === "admin"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : currentUser?.role === "owner"
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {currentUser?.role === "student" || currentUser?.role === "user"
                              ? "STUDENT / USER"
                              : currentUser?.role?.toUpperCase()}
                          </span>
                          {currentUser?.phone && (
                            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium bg-slate-100 px-2.5 py-0.5 rounded-full">
                              <Phone size={11} className="text-primary-600" />
                              {currentUser.phone}
                            </span>
                          )}

                          {/* Quick Photo Upload & Remove Buttons */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Camera size={11} />
                            <span>
                              {previewPhoto || currentUser?.avatar_url || currentUser?.avatar
                                ? "Change Photo"
                                : "Upload Photo"}
                            </span>
                          </button>

                          {(previewPhoto || currentUser?.avatar_url || currentUser?.avatar) && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              disabled={isUploadingPhoto}
                              className="text-xs font-medium text-slate-400 hover:text-rose-600 px-1.5 py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                              title="Remove profile photo"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isEditingProfile && (
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-100 hover:bg-primary-50 text-slate-700 hover:text-primary-700 text-sm font-medium transition-all flex items-center gap-2 border border-slate-200"
                      >
                        <Edit2 size={14} /> Edit Profile
                      </button>
                    )}
                  </div>

                  {/* Personal & Contact Details Section */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
                      Personal & Contact Details
                    </h3>

                    {isEditingProfile ? (
                      <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              placeholder="Enter your full name"
                              className="input-field pl-10 text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="tel"
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              placeholder="e.g. +91 9876543210"
                              className="input-field pl-10 text-sm"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            This phone number will be used for accommodation contact and updates.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              value={currentUser?.email || ""}
                              disabled
                              className="input-field pl-10 text-sm bg-slate-100 text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            Email cannot be changed directly here. Contact support to transfer accounts.
                          </span>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                          >
                            <Save size={14} />
                            {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                            <User size={13} /> Full Name
                          </span>
                          <p className="font-semibold text-slate-800 text-sm">{currentUser?.name}</p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                            <Phone size={13} /> Phone Number
                          </span>
                          {currentUser?.phone ? (
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                              {currentUser.phone}
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            </p>
                          ) : (
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium underline flex items-center gap-1 mt-0.5"
                            >
                              + Add Phone Number
                            </button>
                          )}
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                            <Mail size={13} /> Email Address
                          </span>
                          <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                            {currentUser?.email}
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          </p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
                            <Shield size={13} /> Account Role
                          </span>
                          <p className="font-semibold text-slate-800 text-sm">
                            {currentUser?.role === "student" || currentUser?.role === "user"
                              ? "Student / User"
                              : currentUser?.role === "owner"
                              ? "Property Owner"
                              : currentUser?.role === "admin"
                              ? "Administrator"
                              : currentUser?.role}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3 Stats Overview Cards */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-2.5 sm:p-4 text-center border border-slate-100">
                      <div className="text-lg sm:text-2xl font-bold text-primary-600 font-display">
                        {savedPGs.length}
                      </div>
                      <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">Saved PGs</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 sm:p-4 text-center border border-slate-100">
                      <div className="text-lg sm:text-2xl font-bold text-primary-600 font-display">
                        {myReviews.length}
                      </div>
                      <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">
                        Reviews
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 sm:p-4 text-center border border-slate-100">
                      <div className="text-lg sm:text-2xl font-bold text-primary-600 font-display capitalize truncate">
                        {ownerStatus}
                      </div>
                      <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate">
                        Owner Status
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "saved" && (
              <div>
                <h2 className="font-semibold text-slate-900 text-lg mb-6">
                  Saved PGs ({savedPGs.length})
                </h2>
                {savedPGs.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                    <EmptyState
                      title="No saved PGs"
                      message="Start exploring and save properties you like."
                      icon={Heart}
                      actionLabel="Find PGs"
                      onAction={() => navigate("/find-pg")}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {savedPGs.map((pg) => (
                      <PGCard key={pg.id} pg={pg} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <h2 className="font-semibold text-slate-900 text-lg mb-6">
                  My Reviews ({myReviews.length})
                </h2>
                {myReviews.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                    <EmptyState
                      title="No reviews yet"
                      message="Visit a PG page to write your first review."
                      icon={Star}
                      actionLabel="Find PGs"
                      onAction={() => navigate("/find-pg")}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReviews.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {currentUser?.avatar_url || currentUser?.avatar ? (
                              <img
                                src={currentUser.avatar_url || currentUser.avatar}
                                alt={currentUser?.name || "User"}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                            )}
                            <div>
                              <button
                                onClick={() => navigate(`/pg/${r.pgId}`)}
                                className="font-semibold text-slate-900 hover:text-primary-600 transition-colors flex items-center gap-1"
                              >
                                {r.pgTitle} <ChevronRight size={14} />
                              </button>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {r.createdAt}
                              </p>
                            </div>
                          </div>
                          <StarRating rating={r.rating} size="sm" />
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {r.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "owner" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h2 className="font-semibold text-slate-900 text-lg mb-6">
                  Become a Property Owner
                </h2>
                {ownerStatus === "none" && (
                  <div>
                    <div className="bg-primary-50 rounded-2xl p-6 mb-6 border border-primary-100">
                      <h3 className="font-semibold text-primary-900 mb-3">
                        Benefits of becoming an Owner
                      </h3>
                      <ul className="space-y-2">
                        {[
                          "List unlimited PGs on our platform",
                          "Reach thousands of potential tenants",
                          "Manage bookings from your dashboard",
                          "Get verified badge for your listings",
                          "Direct communication with tenants",
                        ].map((b) => (
                          <li
                            key={b}
                            className="flex items-center gap-2 text-primary-700 text-sm"
                          >
                            <Check size={14} className="text-primary-500" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => navigate("/list-your-pg")}
                      className="btn-primary"
                    >
                      Request Owner Access
                    </button>
                  </div>
                )}
                {ownerStatus === "pending" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                        ⏳
                      </div>
                      <h3 className="font-semibold text-amber-900">
                        Request Under Review
                      </h3>
                    </div>
                    <p className="text-amber-700 text-sm">
                      Your owner access request is being reviewed by our admin
                      team. You'll be notified once approved.
                    </p>
                  </div>
                )}
                {ownerStatus === "approved" && (
                  <div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          ✅
                        </div>
                        <h3 className="font-semibold text-emerald-900">
                          You are now an Owner!
                        </h3>
                      </div>
                      <p className="text-emerald-700 text-sm">
                        You can now list and manage PG properties on Stay Alaya.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/owner")}
                      className="btn-primary flex items-center gap-2"
                    >
                      Go to Owner Dashboard <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
