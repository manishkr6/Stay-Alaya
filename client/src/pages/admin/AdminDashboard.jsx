import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Clock,
  Users,
  UserCheck,
  UserX,
  Trash2,
  X,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Home,
  RefreshCw,
  Bell,
  CheckCircle2,
  ExternalLink,
  FileText,
  ShieldCheck,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useData } from "../../hooks/useData";
import { formatDistanceToNow } from "../../utils/time";
import PlatformGrowthCard from "../../components/admin/PlatformGrowthCard";
import Modal from "../../components/ui/Modal";
import StatusPill from "../../components/ui/StatusPill";
import { extractDocUrl } from "../../utils/avatarHelper";

const TYPE_META = {
  ADD_PG: { icon: "🏠", label: "New PG", color: "bg-blue-100 text-blue-700" },
  UPDATE_PG: { icon: "✏️", label: "PG Update", color: "bg-amber-100 text-amber-700" },
  DELETE_PG: { icon: "🗑️", label: "Delete Request", color: "bg-rose-100 text-rose-700" },
  REPORT_PG: { icon: "⚠️", label: "Report", color: "bg-red-100 text-red-700" },
  FEEDBACK: { icon: "💬", label: "Feedback", color: "bg-indigo-100 text-indigo-700" },
  USER_SIGNUP: { icon: "👤", label: "New User", color: "bg-emerald-100 text-emerald-700" },
  OWNER_REQUEST: { icon: "🔑", label: "Owner Request", color: "bg-purple-100 text-purple-700" },
  REVIEW: { icon: "⭐", label: "Review", color: "bg-amber-100 text-amber-700" },
};
const TYPE_ICONS = TYPE_META;

const ACTIVITY_TYPES = [
  "ALL",
  "USER_SIGNUP",
  "OWNER_REQUEST",
  "DELETE_PG",
  "ADD_PG",
  "UPDATE_PG",
  "REPORT_PG",
  "REVIEW",
];

export default function AdminDashboard() {
  const {
    pgs,
    users,
    reviews,
    notifications,
    fetchAdminData,
    fetchNotifications,
    approveDeletePG,
    rejectDeletePG,
    approveOwner,
    rejectOwner,
    getUnreadCount,
    markOneRead,
    markNotificationsRead,
  } = useData();

  const navigate = useNavigate();
  const [activityFilter, setActivityFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedPgId, setExpandedPgId] = useState(null);

  // Modals for approving or declining delete requests directly on Dashboard
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
  const [declineDeleteModal, setDeclineDeleteModal] = useState(null);
  const [declineReason, setDeclineReason] = useState("");

  // Modals for owner requests
  const [rejectOwnerModal, setRejectOwnerModal] = useState(null);
  const [rejectOwnerReason, setRejectOwnerReason] = useState("");
  const [isRejectingOwner, setIsRejectingOwner] = useState(false);

  useEffect(() => {
    fetchAdminData?.();
    fetchNotifications?.();
  }, [fetchAdminData, fetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAdminData?.(), fetchNotifications?.()]);
    setIsRefreshing(false);
    toast.success("Dashboard & listings updated");
  };

  // Safe document opening handler (never navigates into a relative 404 URL)
  const handleOpenDoc = (rawUrl, label = "Document") => {
    const url = extractDocUrl(rawUrl);
    if (!url || !url.startsWith("http")) {
      toast.error(`No valid ${label} URL available.`);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleApproveOwner = async (userId, userName) => {
    try {
      await approveOwner(userId);
      toast.success(`Owner request for "${userName || "User"}" approved!`);
      await Promise.all([fetchAdminData?.(), fetchNotifications?.()]);
    } catch (e) {
      toast.error(e?.message || "Failed to approve owner request");
    }
  };

  const handleRejectOwner = async () => {
    if (!rejectOwnerModal?.userId) return;
    if (!rejectOwnerReason.trim()) {
      toast.error("Please enter a reason for declining the owner request");
      return;
    }
    setIsRejectingOwner(true);
    try {
      await rejectOwner(rejectOwnerModal.userId, rejectOwnerReason.trim());
      toast.success(`Owner request for "${rejectOwnerModal.userName}" declined.`);
      setRejectOwnerModal(null);
      setRejectOwnerReason("");
      await Promise.all([fetchAdminData?.(), fetchNotifications?.()]);
    } catch (e) {
      toast.error(e?.message || "Failed to decline owner request");
    } finally {
      setIsRejectingOwner(false);
    }
  };

  const handleApproveDelete = async () => {
    if (!confirmDeleteModal?.id) return;
    try {
      await approveDeletePG(confirmDeleteModal.id);
      toast.success(`Deletion approved. "${confirmDeleteModal.title}" has been permanently removed.`);
      setConfirmDeleteModal(null);
    } catch (e) {
      toast.error(e?.message || "Failed to approve deletion");
    }
  };

  const handleDeclineDelete = async () => {
    if (!declineReason.trim()) {
      toast.error("Please enter a reason for declining the deletion request");
      return;
    }
    try {
      await rejectDeletePG(declineDeleteModal.id, declineReason.trim());
      toast.success(`Deletion request declined. "${declineDeleteModal.title}" remains active.`);
      setDeclineDeleteModal(null);
      setDeclineReason("");
    } catch (e) {
      toast.error(e?.message || "Failed to decline deletion request");
    }
  };

  const pendingDeletePGs = pgs.filter(
    (p) => p.status === "pending_delete" && !p.isDeleted
  );
  const pendingOwnerRequests = users.filter(
    (u) => u.ownerRequestStatus === "pending"
  );
  const totalPending =
    pgs.filter(
      (p) =>
        (p.status === "pending" ||
          p.status === "pending_update" ||
          p.status === "pending_delete") &&
        !p.isDeleted
    ).length + pendingOwnerRequests.length;

  const unreadNotifCount = getUnreadCount();

  const stats = [
    {
      label: "Total PGs",
      value: pgs.filter((p) => !p.isDeleted).length,
      icon: Building2,
      bg: "bg-primary-50",
      color: "text-primary-600",
      border: "border-primary-100",
      onClick: () => navigate("/admin/pgs"),
    },
    {
      label: "Pending Approval",
      value: totalPending,
      icon: Clock,
      bg: totalPending > 0 ? "bg-rose-50" : "bg-amber-50",
      color: totalPending > 0 ? "text-rose-600" : "text-amber-600",
      border: totalPending > 0 ? "border-rose-200 ring-2 ring-rose-100" : "border-amber-100",
      onClick: () => navigate("/admin/pending"),
      badge:
        pendingDeletePGs.length > 0 && pendingOwnerRequests.length > 0
          ? `${pendingDeletePGs.length} del · ${pendingOwnerRequests.length} KYC`
          : pendingDeletePGs.length > 0
          ? `${pendingDeletePGs.length} delete`
          : pendingOwnerRequests.length > 0
          ? `${pendingOwnerRequests.length} owner KYC`
          : null,
    },
    {
      label: "Total Users",
      value: users.length,
      icon: Users,
      bg: "bg-blue-50",
      color: "text-blue-600",
      border: "border-blue-100",
      onClick: () => navigate("/admin/users"),
    },
    {
      label: "Total Owners",
      value: users.filter((u) => u.role === "owner").length,
      icon: UserCheck,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
      border: "border-emerald-100",
      onClick: () => navigate("/admin/users"),
    },
  ];

  const filteredRecent =
    activityFilter === "ALL"
      ? notifications
      : notifications.filter((n) => n.type === activityFilter);

  const recent = [...filteredRecent]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Overview and moderation controls for Stay Alaya platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw
              size={13}
              className={isRefreshing ? "animate-spin text-primary-600" : ""}
            />
            Refresh Dashboard
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={s.onClick}
            className={`bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border ${s.border} shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}
          >
            <div className="flex items-center justify-between mb-2.5 sm:mb-4">
              <div
                className={`w-9 h-9 sm:w-12 sm:h-12 ${s.bg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-105`}
              >
                <s.icon size={18} className={`sm:w-[22px] sm:h-[22px] ${s.color}`} />
              </div>
              {s.badge && (
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  {s.badge}
                </span>
              )}
            </div>
            <div className={`text-xl sm:text-3xl font-bold font-display ${s.color} mb-0.5 sm:mb-1`}>
              {s.value}
            </div>
            <div className="text-slate-500 text-xs sm:text-sm truncate font-medium">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ACTIONABLE SECTION: Pending Deletion Requests */}
      {pendingDeletePGs.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-sm overflow-hidden">
          <div className="bg-rose-50/80 p-3.5 sm:p-5 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                <Trash2 size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-rose-950 text-sm sm:text-lg">
                    Pending Deletion Requests
                  </h2>
                  <span className="bg-rose-600 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold shadow-xs whitespace-nowrap">
                    {pendingDeletePGs.length} Action Required
                  </span>
                </div>
                <p className="text-rose-800/80 text-xs mt-0.5 hidden sm:block">
                  Property owners requested deletion. Review the stated reasons and approve or decline directly here.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/pending")}
              className="text-xs font-semibold text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1 self-end sm:self-auto"
            >
              Open Approvals Queue <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-rose-100/70">
            {pendingDeletePGs.map((pg) => {
              const owner = users.find((u) => String(u.id) === String(pg.ownerId));
              const isExpanded = expandedPgId === pg.id;
              const reason = pg.deleteRequestReason || pg.delete_request_reason;

              return (
                <div key={pg.id} className="p-3.5 sm:p-6 hover:bg-rose-50/20 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start gap-3 sm:gap-4">
                    {/* Mobile Top Row: Thumbnail + Core Info side-by-side */}
                    <div className="flex gap-3 sm:gap-4 items-start">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-primary-50 shrink-0 border border-slate-200">
                        {pg.images?.[0] ? (
                          <img
                            src={pg.images[0]}
                            alt={pg.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home size={22} className="text-primary-300" />
                          </div>
                        )}
                      </div>

                      {/* Info on mobile right side */}
                      <div className="min-w-0 flex-1 md:hidden">
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1">
                            {pg.title}
                          </h3>
                          <StatusPill status={pg.status} />
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 truncate">
                          {pg.location.area}, {pg.location.city}
                        </p>
                        <p className="text-slate-500 text-xs truncate">
                          Owner: <span className="font-semibold text-slate-800">{owner?.name || pg.ownerName}</span>
                        </p>
                        <div className="text-primary-600 font-bold text-sm mt-1">
                          ₹{pg.price.toLocaleString("en-IN")}/mo
                        </div>
                      </div>
                    </div>

                    {/* Desktop Info / Full-width mobile lower block */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Desktop only top line */}
                      <div className="hidden md:flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-base">
                            {pg.title}
                          </h3>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {pg.location.area}, {pg.location.city} · Owner:{" "}
                            <span className="font-semibold text-slate-800">
                              {owner?.name || pg.ownerName}
                            </span>
                          </p>
                        </div>
                        <StatusPill status={pg.status} />
                      </div>

                      {/* Badges / specs */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                        <span className="hidden md:inline font-bold text-sm text-primary-600">
                          ₹{pg.price.toLocaleString("en-IN")}/mo ·
                        </span>
                        <span>{pg.roomType}</span>
                        <span>· {pg.genderPreference}</span>
                        {pg.contactNumber && (
                          <span className="text-slate-600 font-medium">· Contact: {pg.contactNumber}</span>
                        )}
                      </div>

                      {/* Prominent Deletion Reason box */}
                      {reason && (
                        <div className="p-3 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900 mb-1">
                            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                            Owner's Reason for Deletion:
                          </div>
                          <p className="text-xs text-rose-950 font-normal leading-relaxed pl-5">
                            "{reason}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions: grid on mobile, stacked on desktop */}
                    <div className="flex flex-col gap-2 shrink-0 justify-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="grid grid-cols-2 md:flex md:flex-col gap-2">
                        <button
                          onClick={() => setConfirmDeleteModal(pg)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} /> Approve Delete
                        </button>
                        <button
                          onClick={() => {
                            setDeclineDeleteModal(pg);
                            setDeclineReason("");
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                        >
                          <X size={13} /> Decline Request
                        </button>
                      </div>
                      <button
                        onClick={() => setExpandedPgId(isExpanded ? null : pg.id)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        Details {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded info */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-slate-100 p-3 sm:p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">
                        {pg.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {pg.amenities?.map((a) => (
                          <span
                            key={a}
                            className="bg-white text-slate-600 text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full border border-slate-200 font-medium"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Address: {pg.location?.address}</p>
                      {pg.images?.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                          {pg.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg object-cover shrink-0 border border-slate-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIONABLE SECTION: Pending Owner Requests (KYC) */}
      {pendingOwnerRequests.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-sm overflow-hidden">
          <div className="bg-purple-50/80 p-3.5 sm:p-5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-purple-950 text-sm sm:text-lg">
                    Pending Owner Requests (KYC)
                  </h2>
                  <span className="bg-purple-600 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold shadow-xs whitespace-nowrap">
                    {pendingOwnerRequests.length} Action Required
                  </span>
                </div>
                <p className="text-purple-800/80 text-xs mt-0.5 hidden sm:block">
                  Users requested owner access and submitted KYC details. Review verification documents and approve or decline.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/pending")}
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline flex items-center gap-1 self-end sm:self-auto cursor-pointer"
            >
              Open Approvals Queue <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-purple-100/70">
            {pendingOwnerRequests.map((u) => {
              const details = u.ownerRequestDetails || {};
              const userAvatar = u.avatar || u.avatar_url || '';
              const propDoc = extractDocUrl(u.kyc_doc_url || u.propertyDocumentUrl || details.propertyDocumentUrl, userAvatar);
              const idDoc = extractDocUrl(u.kyc_id_doc_url || u.identityDocumentUrl || details.identityDocumentUrl, userAvatar);

              return (
                <div key={u.id} className="p-3.5 sm:p-5 hover:bg-purple-50/20 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base shrink-0 overflow-hidden border border-purple-200">
                        {u.avatar || u.avatar_url ? (
                          <img src={u.avatar || u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          u.name?.charAt(0)?.toUpperCase() || "U"
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                            {u.name}
                          </h3>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            Pending Approval
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-2.5 flex-wrap">
                          <span>Email: <span className="text-slate-800 font-medium">{u.email}</span></span>
                          {u.phone && <span>· Phone: <span className="text-slate-800 font-medium">{u.phone}</span></span>}
                          {details.requestedAt && (
                            <span className="text-slate-400">
                              · Applied: {new Date(details.requestedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>

                        {/* Documents */}
                        <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-600">Documents:</span>
                          {propDoc ? (
                            <a
                              href={propDoc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <FileText size={12} /> Property Doc <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No property doc</span>
                          )}

                          {idDoc ? (
                            <a
                              href={idDoc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <FileText size={12} /> Identity Doc <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No identity doc</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                      <button
                        onClick={() => handleApproveOwner(u.id, u.name)}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <UserCheck size={13} /> Approve as Owner
                      </button>
                      <button
                        onClick={() => {
                          setRejectOwnerModal({ userId: u.id, userName: u.name });
                          setRejectOwnerReason("");
                        }}
                        className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        <UserX size={13} /> Decline
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Grid: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          {/* Recent Activity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-100 gap-3 bg-white">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Recent Activity</h2>
              {unreadNotifCount > 0 && (
                <span className="bg-primary-50 text-primary-600 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {unreadNotifCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <button
                  onClick={markNotificationsRead}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Check size={12} /> Mark Read
                </button>
              )}
              <button
                onClick={() => navigate("/admin/notifications")}
                className="text-primary-600 text-xs sm:text-sm hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                View All Notifications <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Activity Category Filters */}
          <div className="px-3 sm:px-6 pt-3 pb-2.5 border-b border-slate-100 bg-slate-50/60 overflow-hidden">
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-nowrap scroll-smooth">
              {ACTIVITY_TYPES.map((t) => {
                const count =
                  t === "ALL"
                    ? notifications.filter((n) => !n.isRead).length
                    : notifications.filter((n) => n.type === t && !n.isRead).length;
                const totalCount =
                  t === "ALL"
                    ? notifications.length
                    : notifications.filter((n) => n.type === t).length;
                if (t !== "ALL" && totalCount === 0) return null;
                const isActive = activityFilter === t;

                return (
                  <button
                    key={t}
                    onClick={() => setActivityFilter(t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0f2547] text-[#f5a623] border border-[#f5a623]/40 shadow-xs hover:bg-[#f5a623] hover:text-[#0f2547] active:bg-[#e09618] active:text-[#0f2547]"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-[#0f2547] hover:text-[#f5a623] active:bg-[#f5a623] active:text-[#0f2547]"
                    }`}
                  >
                    {t === "ALL" ? "ALL" : t.replace("_", " ")}
                    {count > 0 && (
                      <span
                        className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                          isActive
                            ? "bg-[#f5a623] text-[#0f2547]"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="p-3.5 sm:p-5 space-y-3">
            {recent.map((n) => {
              const meta = TYPE_META[n.type] || {
                icon: "🔔",
                color: "bg-slate-100 text-slate-700",
                label: n.type,
              };
              const targetPg = n.relatedId
                ? pgs.find((p) => String(p.id) === String(n.relatedId))
                : pgs.find((p) => n.message && n.message.includes(p.title));
              const isPendingDelete = targetPg && targetPg.status === "pending_delete";

              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markOneRead?.(n.id)}
                  className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${
                    n.isRead
                      ? "bg-white border-slate-100 hover:border-slate-200"
                      : "bg-blue-50/50 border-blue-200 shadow-xs hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${meta.color}`}
                    >
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-slate-400 text-[11px] sm:text-xs">
                          {formatDistanceToNow(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                        {n.message}
                      </p>

                      {/* USER_SIGNUP notification action */}
                      {n.type === "USER_SIGNUP" && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/admin/users");
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            View in Users Directory <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

                      {/* OWNER_REQUEST notification action */}
                      {n.type === "OWNER_REQUEST" && (() => {
                        const applicant = users.find(
                          (u) =>
                            String(u.id) === String(n.relatedId) ||
                            (n.userId && String(u.id) === String(n.userId)) ||
                            (n.message && u.email && n.message.includes(u.email)) ||
                            (n.message && u.name && n.message.includes(u.name))
                        );
                        const applicantAvatar = applicant?.avatar_url || applicant?.avatar || '';
                        const details = applicant?.ownerRequestDetails || {};
                        const propDoc = extractDocUrl(applicant?.kyc_doc_url || applicant?.propertyDocumentUrl || details.propertyDocumentUrl, applicantAvatar);
                        const idDoc = extractDocUrl(applicant?.kyc_id_doc_url || applicant?.identityDocumentUrl || details.identityDocumentUrl, applicantAvatar);
                        const isPending = applicant?.ownerRequestStatus === "pending" || applicant?.kyc_status === "pending";

                        return (
                          <div className="mt-3 p-3 sm:p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <span className="font-semibold text-purple-950 flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-purple-600 shrink-0" />
                                Owner Verification Application
                              </span>
                              {applicant && (
                                <span className="text-slate-600 font-medium">
                                  {applicant.email} {applicant.phone ? `· ${applicant.phone}` : ""}
                                </span>
                              )}
                            </div>

                            {/* Documents */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              <span className="text-xs text-slate-600 font-semibold">Verification Docs:</span>
                              {propDoc ? (
                                <a
                                  href={propDoc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                                >
                                  <FileText size={11} /> Property Doc <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No property doc</span>
                              )}

                              {idDoc ? (
                                <a
                                  href={idDoc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                                >
                                  <FileText size={11} /> Identity Doc <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 italic">No identity doc</span>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-purple-100">
                              {isPending && applicant ? (
                                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveOwner(applicant.id, applicant.name);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                  >
                                    <UserCheck size={12} /> Approve as Owner
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRejectOwnerModal({ userId: applicant.id, userName: applicant.name });
                                      setRejectOwnerReason("");
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                                  >
                                    <UserX size={12} /> Decline
                                  </button>
                                </div>
                              ) : applicant?.role === "owner" ? (
                                <span className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-md inline-flex items-center gap-1 border border-slate-200">
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                  Owner approved & active
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 bg-white px-2.5 py-1 rounded-md inline-flex items-center gap-1 border border-slate-200">
                                  <CheckCircle2 size={12} className="text-slate-400" />
                                  Application resolved
                                </span>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/admin/pending");
                                }}
                                className="inline-flex items-center justify-center sm:justify-start gap-1 px-3 py-1 text-purple-700 hover:text-purple-800 hover:underline text-xs font-semibold transition-colors sm:ml-auto cursor-pointer"
                              >
                                Approvals Queue <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* DELETE_PG action bar */}
                      {n.type === "DELETE_PG" && (
                        <div className="mt-3">
                          {isPendingDelete ? (
                            <div className="p-3 sm:p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-2.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                                  <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                  Action Required: Property Delete Requested
                                </span>
                                {targetPg?.price && (
                                  <span className="text-slate-600 font-semibold">
                                    ₹{targetPg.price?.toLocaleString("en-IN")}/mo {targetPg.location?.city ? `· ${targetPg.location.city}` : ""}
                                  </span>
                                )}
                              </div>

                              {(targetPg?.deleteRequestReason || targetPg?.delete_request_reason) && (
                                <p className="text-xs text-rose-950 bg-white/80 p-2.5 rounded-lg border border-rose-100 leading-relaxed">
                                  <span className="font-semibold text-rose-900">Owner reason: </span>
                                  {targetPg.deleteRequestReason || targetPg.delete_request_reason}
                                </p>
                              )}

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteModal(targetPg);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={12} /> Approve Delete
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeclineDeleteModal(targetPg);
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                                  >
                                    <X size={12} /> Decline Request
                                  </button>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/admin/pending");
                                  }}
                                  className="inline-flex items-center justify-center sm:justify-start gap-1 px-3 py-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg text-xs font-medium transition-colors sm:ml-auto cursor-pointer"
                                >
                                  Open Approvals Page <ArrowRight size={12} />
                                </button>
                              </div>
                            </div>
                          ) : targetPg ? (
                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 border border-slate-200">
                              <CheckCircle2 size={13} className="text-emerald-500" />
                              Listing is currently active ({targetPg.status})
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 border border-slate-200">
                              <CheckCircle2 size={13} className="text-slate-400" />
                              Property deletion request resolved
                            </div>
                          )}
                        </div>
                      )}

                      {/* ADD_PG / UPDATE_PG links */}
                      {(n.type === "ADD_PG" || n.type === "UPDATE_PG") && (
                        <div className="mt-2.5 flex items-center gap-2">
                          {n.relatedId ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/pg/${n.relatedId}`);
                              }}
                              className="text-xs text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              View Live Listing <ExternalLink size={12} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/admin/pending");
                              }}
                              className="text-xs text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              View in Approvals <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {/* REPORT_PG link */}
                      {n.type === "REPORT_PG" && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(n.relatedId ? `/pg/${n.relatedId}` : "/admin/pgs");
                            }}
                            className="text-xs text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            Inspect Flagged Property <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

                      {/* REVIEW link */}
                      {n.type === "REVIEW" && n.relatedId && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pg/${n.relatedId}#reviews`);
                            }}
                            className="text-xs text-amber-600 hover:text-amber-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            Read Review <ExternalLink size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {!n.isRead && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              );
            })}

            {recent.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-100">
                No recent activity recorded for this category yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Growth Card */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/admin/pending")}
                className="w-full flex items-center justify-between p-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition-colors text-sm font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-600" /> View Pending Approvals
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  totalPending > 0 ? "bg-amber-200 text-amber-900" : "bg-slate-200 text-slate-700"
                }`}>
                  {totalPending}
                </span>
              </button>

              <button
                onClick={() => navigate("/admin/notifications")}
                className="w-full flex items-center justify-between p-3.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl transition-colors text-sm font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Bell size={16} className="text-purple-600" /> Admin Notifications
                </span>
                {unreadNotifCount > 0 && (
                  <span className="bg-purple-200 text-purple-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {unreadNotifCount} new
                  </span>
                )}
              </button>

              <button
                onClick={() => navigate("/admin/users")}
                className="w-full flex items-center gap-2 p-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors text-sm font-medium cursor-pointer"
              >
                <Users size={16} /> Manage Users
              </button>

              <button
                onClick={() => navigate("/admin/pgs")}
                className="w-full flex items-center gap-2 p-3.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl transition-colors text-sm font-medium cursor-pointer"
              >
                <Building2 size={16} /> All PG Listings
              </button>
            </div>
          </div>

          <PlatformGrowthCard pgs={pgs} users={users} reviews={reviews} />
        </div>
      </div>

      {/* Modal: Confirm Approve Deletion */}
      <Modal
        isOpen={!!confirmDeleteModal}
        onClose={() => setConfirmDeleteModal(null)}
        title="Approve PG Deletion"
        onConfirm={handleApproveDelete}
        confirmText="Confirm & Delete PG"
        confirmVariant="danger"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Are you sure you want to approve the deletion of{" "}
            <span className="font-semibold text-slate-900">
              "{confirmDeleteModal?.title}"
            </span>
            ?
          </p>
          {confirmDeleteModal &&
            (confirmDeleteModal.deleteRequestReason ||
              confirmDeleteModal.delete_request_reason) && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <span className="font-semibold">Owner reason: </span>
                {confirmDeleteModal.deleteRequestReason ||
                  confirmDeleteModal.delete_request_reason}
              </div>
            )}
          <p className="text-xs text-slate-500">
            This will permanently remove the property from the platform. The owner will be notified that the deletion was approved.
          </p>
        </div>
      </Modal>

      {/* Modal: Decline Deletion Request */}
      <Modal
        isOpen={!!declineDeleteModal}
        onClose={() => {
          setDeclineDeleteModal(null);
          setDeclineReason("");
        }}
        title="Decline Deletion Request"
        onConfirm={handleDeclineDelete}
        confirmText="Decline Request"
        confirmVariant="primary"
      >
        <p className="text-sm text-slate-600 mb-3">
          Please provide a reason for declining the deletion of{" "}
          <span className="font-semibold text-slate-900">
            "{declineDeleteModal?.title}"
          </span>
          . The property will remain active and the owner will be notified.
        </p>
        <textarea
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          rows={4}
          placeholder="e.g. Active bookings or tenant inquiries exist for this property..."
          className="input-field resize-none text-sm"
        />
      </Modal>

      {/* Modal: Decline Owner Request */}
      <Modal
        isOpen={!!rejectOwnerModal}
        onClose={() => {
          setRejectOwnerModal(null);
          setRejectOwnerReason("");
        }}
        title="Decline Owner Request"
        onConfirm={handleRejectOwner}
        confirmText={isRejectingOwner ? "Declining..." : "Decline Request"}
        confirmVariant="danger"
      >
        <p className="text-sm text-slate-600 mb-3">
          Please provide a reason for declining the owner request for{" "}
          <span className="font-semibold text-slate-900">
            "{rejectOwnerModal?.userName}"
          </span>
          . The user will be notified of this reason.
        </p>
        <textarea
          value={rejectOwnerReason}
          onChange={(e) => setRejectOwnerReason(e.target.value)}
          rows={4}
          placeholder="e.g. Identity document unclear, property verification failed..."
          className="input-field resize-none text-sm"
        />
      </Modal>
    </div>
  );
}
