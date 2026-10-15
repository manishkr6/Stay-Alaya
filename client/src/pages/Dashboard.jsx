import { useState, useEffect } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../hooks/useData";
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

  // Profile editing state (Name and Phone)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "");
      setProfilePhone(currentUser.phone || "");
    }
  }, [currentUser]);

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
          message: `Your phone number was updated to ${trimmedPhone}.`,
          type: "PHONE_UPDATE",
        });
      } else {
        await createNotification({
          userId: currentUser.id,
          message: "Your profile information was updated successfully.",
          type: "PROFILE_UPDATE",
        });
      }

      setIsEditingProfile(false);
      toast.success("Profile and phone number updated successfully!");
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
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                My Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage your profile, saved PGs, and more
              </p>
            </div>
            <button
              onClick={() => navigate("/saved-pgs")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Heart size={15} /> View Saved PGs
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 sm:p-4 flex lg:flex-col overflow-x-auto gap-1.5 sm:gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 lg:w-full ${
                    activeTab === t.id
                      ? "bg-primary-600 text-white shadow-sm"
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
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary-700 to-primary-500 flex items-center justify-center text-white text-3xl font-bold font-display shadow-md shadow-primary-500/20">
                        {currentUser?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900 text-xl flex items-center gap-2">
                          {currentUser?.name}
                        </h2>
                        <p className="text-slate-500 text-sm">{currentUser?.email}</p>
                        <div className="flex items-center gap-2 mt-2">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <div className="text-2xl font-bold text-primary-600 font-display">
                        {savedPGs.length}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">Saved PGs</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <div className="text-2xl font-bold text-primary-600 font-display">
                        {myReviews.length}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        Reviews Written
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                      <div className="text-2xl font-bold text-primary-600 font-display capitalize">
                        {ownerStatus}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
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
