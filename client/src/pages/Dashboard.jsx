import { useState } from "react";
import {
  User,
  Heart,
  Star,
  Building2,
  ChevronRight,
  Edit2,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../hooks/useData";
import PGCard from "../components/ui/PGCard";
import { EmptyState, StarRating } from "../components/ui/index.jsx";
import { useNavigate } from "react-router-dom";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "saved", label: "Saved PGs", icon: Heart },
  { id: "reviews", label: "My Reviews", icon: Star },
  { id: "owner", label: "Become an Owner", icon: Building2 },
];

export default function Dashboard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { getSavedPGs, getPGReviews, getPGById, pgs } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || "");

  const savedPGs = getSavedPGs(currentUser?.id);
  const myReviews = pgs.flatMap((pg) =>
    getPGReviews(pg.id)
      .filter((r) => r.userId === currentUser?.id)
      .map((r) => ({ ...r, pgTitle: pg.title, pgId: pg.id })),
  );

  const handleSaveName = () => {
    if (!newName.trim()) return;
    updateCurrentUser({ ...currentUser, name: newName.trim() });
    setEditName(false);
    toast.success("Name updated!");
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
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === t.id
                      ? "bg-primary-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h2 className="font-semibold text-slate-900 text-lg mb-6">
                  Profile Information
                </h2>
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-3xl font-bold font-display">
                    {currentUser?.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {editName ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="input-field text-sm py-1.5 w-40"
                          />
                          <button
                            onClick={handleSaveName}
                            className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setEditName(false);
                              setNewName(currentUser.name);
                            }}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {currentUser?.name}
                          </h3>
                          <button
                            onClick={() => setEditName(true)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">
                      {currentUser?.email}
                    </p>
                    <span
                      className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${
                        currentUser?.role === "admin"
                          ? "bg-red-100 text-red-700"
                          : currentUser?.role === "owner"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {currentUser?.role?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
