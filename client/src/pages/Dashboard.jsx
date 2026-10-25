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
  Trash2,
  Maximize2,
  Compass,
  CheckCircle2,
  Eye,
  Sparkles,
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
  const { getSavedPGs, getPGReviews, pgs, createNotification } = useData();
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

  // Profile photo upload & full-screen view state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
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

  // Handle escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsPhotoModalOpen(false);
        setIsEditingProfile(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      // 4. Role-isolated user notification
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
      setIsPhotoModalOpen(false);
    } catch (err) {
      toast.error("Failed to remove profile photo.", { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (location.search.includes("verified=true") || location.hash.includes("access_token")) {
      toast.success("Email verified successfully! Welcome to Stay Aalaya.", {
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
      toast.error("Please enter a valid phone number (e.g. +91 9876543210)");
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
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const ownerStatus = currentUser?.ownerRequestStatus || "none";
  const userPhotoSrc = previewPhoto || currentUser?.avatar_url || currentUser?.avatar;

  return (
    <div className="min-h-screen bg-slate-50/70 pt-20 sm:pt-24 lg:pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8">
        
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#0f2547] text-[#f5a623] tracking-wide uppercase">
              Stay Aalaya Dashboard
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-1 sm:mt-1.5 tracking-tight">
            Welcome back, {currentUser?.name?.split(" ")[0] || "Student"} 👋
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Manage your profile, verified Sikkim PG bookmarks, and reviews in one place.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar Tabs with Live Counts */}
          <aside className="lg:w-60 shrink-0">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs border border-slate-200/80 p-1.5 sm:p-2.5 flex lg:flex-col overflow-x-auto gap-1 sm:gap-1.5 scrollbar-none sticky top-20 sm:top-28 z-10">
              {TABS.map((t) => {
                const isActive = activeTab === t.id;
                let badge = null;
                if (t.id === "saved" && savedPGs.length > 0) badge = savedPGs.length;
                if (t.id === "reviews" && myReviews.length > 0) badge = myReviews.length;

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 lg:w-full cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-[#0f2547] text-white font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <t.icon size={15} className={isActive ? "text-[#f5a623]" : "text-slate-400"} />
                      <span>{t.label}</span>
                    </div>
                    {badge !== null && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ml-1.5 ${
                          isActive
                            ? "bg-[#f5a623] text-[#0f2547]"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="space-y-4 sm:space-y-6">
                {/* Profile Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 p-4 sm:p-6 lg:p-8">
                  {/* Top Profile Banner Header */}
                  <div className="flex flex-col gap-3.5 sm:gap-5 pb-5 sm:pb-6 border-b border-slate-100">
                    <div className="flex items-center justify-between gap-3 sm:gap-5">
                      <div className="flex items-center gap-3 sm:gap-4.5 min-w-0 flex-1">
                        
                        {/* Interactive Profile Avatar - Click opens Full-Screen Photo Modal */}
                        <div
                          onClick={() => setIsPhotoModalOpen(true)}
                          className="relative group cursor-pointer shrink-0"
                          title="Click to view full photo"
                        >
                          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-2 ring-slate-200/80 bg-slate-100 flex items-center justify-center relative transition-transform duration-200 group-hover:scale-105">
                            {userPhotoSrc ? (
                              <img
                                src={userPhotoSrc}
                                alt={currentUser?.name || "User Avatar"}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-[#0f2547] to-primary-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold font-display">
                                {currentUser?.name?.charAt(0).toUpperCase() || <User size={26} />}
                              </div>
                            )}

                            {/* Loading Overlay */}
                            {isUploadingPhoto && (
                              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                                <Loader2 size={20} className="animate-spin text-amber-400" />
                                <span className="text-[9px] font-bold mt-1">Uploading...</span>
                              </div>
                            )}

                            {/* Subtle hover icon indicating click-to-view in full screen */}
                            {!isUploadingPhoto && (
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white z-10 rounded-2xl">
                                <Maximize2 size={16} className="drop-shadow" />
                                <span className="text-[9px] font-bold mt-0.5 drop-shadow">View Photo</span>
                              </div>
                            )}
                          </div>

                          {/* Subtle expand indicator badge */}
                          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white shadow-md border border-slate-200 text-slate-600 group-hover:text-primary-600 transition-colors">
                            <Eye size={11} />
                          </div>
                        </div>

                        {/* User Info details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h2 className="font-bold text-slate-900 text-base sm:text-xl font-display truncate">
                              {currentUser?.name || "Stay Aalaya Member"}
                            </h2>
                            <span className="text-[9px] sm:text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200/60 inline-flex items-center gap-1 shrink-0">
                              <CheckCircle2 size={10} className="text-emerald-600" /> Verified
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 truncate" title={currentUser?.email}>
                            {currentUser?.email}
                          </p>
                          
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-wrap">
                            <span
                              className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${
                                currentUser?.role === "admin"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : currentUser?.role === "owner"
                                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {currentUser?.role === "student" || currentUser?.role === "user"
                                ? "STUDENT / USER"
                                : currentUser?.role?.toUpperCase()}
                            </span>
                            
                            {currentUser?.phone && (
                              <span className="text-[10px] sm:text-xs text-slate-600 flex items-center gap-1 font-medium bg-slate-100 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
                                <Phone size={10} className="text-emerald-600" />
                                {currentUser.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Desktop/Tablet Edit Profile Action Button */}
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition-all items-center gap-2 border border-slate-200 cursor-pointer shadow-xs hover:shadow-sm shrink-0"
                      >
                        <Edit2 size={14} className="text-slate-600" />
                        <span>Edit Profile</span>
                      </button>
                    </div>

                    {/* Mobile Full-Width Edit Profile Action Button */}
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="sm:hidden w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer shadow-xs"
                    >
                      <Edit2 size={13} className="text-slate-600" />
                      <span>Edit Profile</span>
                    </button>
                  </div>

                  {/* Personal & Contact Details Section */}
                  <div className="my-5 sm:my-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 sm:mb-3.5">
                      Personal & Contact Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                      {/* Full Name */}
                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                            <User size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block">
                              Full Name
                            </span>
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                              {currentUser?.name || "Not provided"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Phone Number */}
                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                            <Phone size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block">
                              Phone Number
                            </span>
                            {currentUser?.phone ? (
                              <p className="font-semibold text-slate-900 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5 truncate">
                                {currentUser.phone}
                                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                  Active
                                </span>
                              </p>
                            ) : (
                              <button
                                onClick={() => setIsEditingProfile(true)}
                                className="text-xs text-primary-600 hover:text-primary-700 font-semibold underline mt-0.5 cursor-pointer block truncate"
                              >
                                + Add Phone Number
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0">
                            <Mail size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block">
                              Email Address
                            </span>
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm mt-0.5 truncate" title={currentUser?.email}>
                              {currentUser?.email}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={10} /> Verified
                        </span>
                      </div>

                      {/* Account Role */}
                      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center shrink-0">
                            <Shield size={15} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block">
                              Account Role
                            </span>
                            <p className="font-semibold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
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
                        <span className="shrink-0 text-[9px] sm:text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                          Member
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Interactive Stats Cards - Compact 3-col on Mobile */}
                  <div className="pt-4 sm:pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Activity Overview (Click to open)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {/* Card 1: Saved PGs */}
                      <div
                        onClick={() => setActiveTab("saved")}
                        className="group relative bg-gradient-to-br from-rose-50/60 via-white to-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-rose-100 hover:border-rose-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-center sm:text-left"
                        title="Click to view saved PGs"
                      >
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                            <Heart size={14} className="sm:w-[18px] sm:h-[18px] fill-rose-500/20" />
                          </div>
                          <span className="hidden sm:inline-flex text-[11px] font-semibold text-rose-600 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            View <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                        <div className="text-lg sm:text-3xl font-bold text-slate-900 font-display">
                          {savedPGs.length}
                        </div>
                        <div className="text-slate-500 text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 truncate">
                          Saved PGs
                        </div>
                      </div>

                      {/* Card 2: Reviews */}
                      <div
                        onClick={() => setActiveTab("reviews")}
                        className="group relative bg-gradient-to-br from-amber-50/60 via-white to-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-amber-100 hover:border-amber-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-center sm:text-left"
                        title="Click to view your reviews"
                      >
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                            <Star size={14} className="sm:w-[18px] sm:h-[18px] fill-amber-500/20" />
                          </div>
                          <span className="hidden sm:inline-flex text-[11px] font-semibold text-amber-600 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            View <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                        <div className="text-lg sm:text-3xl font-bold text-slate-900 font-display">
                          {myReviews.length}
                        </div>
                        <div className="text-slate-500 text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 truncate">
                          My Reviews
                        </div>
                      </div>

                      {/* Card 3: Owner Status */}
                      <div
                        onClick={() => setActiveTab("owner")}
                        className="group relative bg-gradient-to-br from-indigo-50/60 via-white to-white rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-indigo-100 hover:border-indigo-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-center sm:text-left"
                        title="Click to check owner application status"
                      >
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                            <Building2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                          </div>
                          <span className="hidden sm:inline-flex text-[11px] font-semibold text-indigo-600 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                            Status <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                        <div className="text-sm sm:text-2xl font-bold text-slate-900 font-display capitalize truncate">
                          {ownerStatus === "none" ? "Explore" : ownerStatus === "approved" ? "Approved" : "Pending"}
                        </div>
                        <div className="text-slate-500 text-[10px] sm:text-xs font-medium mt-0.5 sm:mt-1 truncate">
                          {ownerStatus === "none" ? "Owner Portal" : "Owner Status"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Saved PGs Tab */}
            {activeTab === "saved" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-slate-900 text-xl font-display">
                      Saved PGs & Hostels ({savedPGs.length})
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                      Your bookmarked rooms across Sikkim colleges and localities
                    </p>
                  </div>
                  {savedPGs.length > 0 && (
                    <button
                      onClick={() => navigate("/find-pg")}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Compass size={14} /> Find More PGs
                    </button>
                  )}
                </div>

                {savedPGs.length === 0 ? (
                  <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-4 sm:p-8">
                    <EmptyState
                      title="No saved PGs yet"
                      message="You haven't bookmarked any PGs. Explore verified student stays in Gangtok, Tadong, Majitar, and around Sikkim colleges."
                      icon={Heart}
                      actionLabel="Explore Sikkim PGs"
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

            {/* Reviews Tab */}
            {activeTab === "reviews" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold text-slate-900 text-xl font-display">
                      My Reviews ({myReviews.length})
                    </h2>
                    <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                      Reviews and feedback you shared with the Sikkim student community
                    </p>
                  </div>
                </div>

                {myReviews.length === 0 ? (
                  <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-4 sm:p-8">
                    <EmptyState
                      title="No reviews yet"
                      message="Visit any PG detail page to share your experience and write your first verified review."
                      icon={Star}
                      actionLabel="Browse PGs to Review"
                      onAction={() => navigate("/find-pg")}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReviews.map((r) => (
                      <div
                        key={r.id}
                        className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-6 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {userPhotoSrc ? (
                              <img
                                src={userPhotoSrc}
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
                                className="font-semibold text-slate-900 hover:text-primary-600 transition-colors flex items-center gap-1 text-sm sm:text-base cursor-pointer"
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
                        <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          "{r.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Owner Tab */}
            {activeTab === "owner" && (
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 sm:p-8">
                <h2 className="font-bold text-slate-900 text-xl font-display mb-2">
                  Become a Stay Aalaya Property Owner
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  List your hostel, homestay, or PG in Sikkim and connect directly with verified students and working professionals.
                </p>

                {ownerStatus === "none" && (
                  <div>
                    <div className="bg-primary-50/70 rounded-2xl p-6 mb-6 border border-primary-100">
                      <h3 className="font-bold text-primary-950 mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-[#f5a623]" /> Benefits of listing with Stay Aalaya
                      </h3>
                      <ul className="space-y-2.5">
                        {[
                          "List unlimited PGs and rooms on our Sikkim platform",
                          "Reach thousands of incoming SMIT, ICFAI, SRM, & SU students",
                          "Manage tenant inquiries with direct WhatsApp & phone contact",
                          "Receive a verified badge on your listings after physical verification",
                          "Zero hidden commission on student leases",
                        ].map((b) => (
                          <li
                            key={b}
                            className="flex items-center gap-2.5 text-primary-800 text-xs sm:text-sm font-medium"
                          >
                            <div className="w-4 h-4 rounded-full bg-primary-200 text-primary-800 flex items-center justify-center shrink-0">
                              <Check size={11} />
                            </div>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => navigate("/list-your-pg")}
                      className="px-6 py-3 rounded-xl bg-[#0f2547] hover:bg-[#16335d] text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Apply for Owner Access</span>
                      <ChevronRight size={16} className="text-[#f5a623]" />
                    </button>
                  </div>
                )}

                {ownerStatus === "pending" && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">
                        ⏳
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900">
                          Application Under Review
                        </h3>
                        <p className="text-amber-700 text-xs mt-0.5">
                          Submitted on your account
                        </p>
                      </div>
                    </div>
                    <p className="text-amber-800 text-sm mt-3 leading-relaxed">
                      Your owner access request is being verified by our Sikkim administration team. Once verified, you will receive an in-app notification and instant access to your Property Owner Dashboard.
                    </p>
                  </div>
                )}

                {ownerStatus === "approved" && (
                  <div>
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-6 mb-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-emerald-950">
                            You are an Approved Property Owner!
                          </h3>
                          <p className="text-emerald-700 text-xs mt-0.5">
                            Full owner listing permissions active
                          </p>
                        </div>
                      </div>
                      <p className="text-emerald-800 text-sm mt-3 leading-relaxed">
                        You can now list and manage your rooms, amenities, rent pricing, and student applications on Stay Aalaya.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate("/owner")}
                      className="px-6 py-3 rounded-xl bg-[#0f2547] hover:bg-[#16335d] text-white font-semibold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <span>Go to Owner Dashboard</span>
                      <ChevronRight size={16} className="text-[#f5a623]" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Hidden File Input for Photo Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
        aria-hidden="true"
      />

      {/* Full-Screen Photo Modal / Lightbox (Opened on Avatar Click) */}
      {isPhotoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3.5 sm:p-6 animate-fade-in select-none"
          onClick={() => setIsPhotoModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 flex flex-col items-center text-center max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              onClick={() => setIsPhotoModalOpen(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Close (Esc)"
              aria-label="Close photo preview"
            >
              <X size={18} />
            </button>

            {/* Modal Title */}
            <div className="mb-4 sm:mb-6">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#f5a623]">
                Profile Photo
              </span>
              <h3 className="text-white text-base sm:text-lg font-bold font-display mt-0.5">
                {currentUser?.name || "Student"}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 sm:mt-1">
                Full-screen preview & photo management
              </p>
            </div>

            {/* Full Preview Image Container */}
            <div className="relative w-44 h-44 sm:w-64 sm:h-64 rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl bg-slate-800/60 flex items-center justify-center mb-5 sm:mb-6">
              {userPhotoSrc ? (
                <img
                  src={userPhotoSrc}
                  alt={currentUser?.name || "Profile Photo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#0f2547] to-primary-600 flex flex-col items-center justify-center text-white p-4">
                  <span className="text-5xl sm:text-6xl font-bold font-display mb-2">
                    {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                  <span className="text-xs text-white/80">No photo uploaded</span>
                </div>
              )}

              {/* Uploading Status Overlay */}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                  <Loader2 size={30} className="animate-spin text-[#f5a623] mb-2" />
                  <span className="text-xs font-semibold tracking-wide">
                    Uploading to Cloudinary...
                  </span>
                </div>
              )}
            </div>

            {/* Separate Photo Action Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0f2547] hover:bg-[#16335d] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50 border border-slate-700"
              >
                <Camera size={15} className="text-[#f5a623]" />
                <span>{userPhotoSrc ? "Change Photo" : "Upload Photo"}</span>
              </button>

              {userPhotoSrc && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  <span>Remove Photo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal Dialog */}
      {isEditingProfile && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-fade-in"
          onClick={() => setIsEditingProfile(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-100 mb-4 sm:mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg font-display">
                  Edit Profile Information
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Update your contact details for host communication
                </p>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close edit profile dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Photo Option inside Edit Modal */}
            <div className="flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 mb-4 sm:mb-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                {userPhotoSrc ? (
                  <img
                    src={userPhotoSrc}
                    alt={profileName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-[#0f2547] to-primary-600 flex items-center justify-center text-white font-bold text-base sm:text-lg">
                    {profileName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-800 block">
                  Profile Photo
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {userPhotoSrc ? "Custom photo active" : "No photo set yet"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? "Uploading..." : "Change"}
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs sm:text-sm transition-all text-slate-900 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs sm:text-sm transition-all text-slate-900 bg-white"
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
                  Used for PG booking confirmations and landlord inquiries.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={currentUser?.email || ""}
                    disabled
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-400 bg-slate-100 cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">
                  Email is locked to your authenticated login provider.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 sm:pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={isSaving}
                  className="px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 sm:py-2.5 rounded-xl bg-[#0f2547] hover:bg-[#16335d] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-[#f5a623]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} className="text-[#f5a623]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

