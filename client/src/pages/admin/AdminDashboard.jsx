import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Clock, Users, UserCheck, TrendingUp } from "lucide-react";
import { useData } from "../../hooks/useData";
import { formatDistanceToNow } from "../../utils/time";

const TYPE_ICONS = {
  ADD_PG: { icon: "🏠", color: "bg-blue-100 text-blue-700" },
  UPDATE_PG: { icon: "✏️", color: "bg-amber-100 text-amber-700" },
  DELETE_PG: { icon: "🗑️", color: "bg-red-100 text-red-700" },
  REPORT_PG: { icon: "⚠️", color: "bg-red-100 text-red-700" },
  FEEDBACK: { icon: "💬", color: "bg-indigo-100 text-indigo-700" },
  USER_SIGNUP: { icon: "👤", color: "bg-emerald-100 text-emerald-700" },
  OWNER_REQUEST: { icon: "🔑", color: "bg-purple-100 text-purple-700" },
  REVIEW: { icon: "⭐", color: "bg-amber-100 text-amber-700" },
};

export default function AdminDashboard() {
  const { pgs, users, notifications, fetchAdminData } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData?.();
  }, [fetchAdminData]);

  const stats = [
    {
      label: "Total PGs",
      value: pgs.filter((p) => !p.isDeleted).length,
      icon: Building2,
      bg: "bg-primary-50",
      color: "text-primary-600",
      border: "border-primary-100",
    },
    {
      label: "Pending Approval",
      value: pgs.filter(
        (p) =>
          (p.status === "pending" ||
            p.status === "pending_update" ||
            p.status === "pending_delete") &&
          !p.isDeleted,
      ).length,
      icon: Clock,
      bg: "bg-amber-50",
      color: "text-amber-600",
      border: "border-amber-100",
    },
    {
      label: "Total Users",
      value: users.length,
      icon: Users,
      bg: "bg-blue-50",
      color: "text-blue-600",
      border: "border-blue-100",
    },
    {
      label: "Total Owners",
      value: users.filter((u) => u.role === "owner").length,
      icon: UserCheck,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
      border: "border-emerald-100",
    },
  ];

  const recent = [...notifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Admin Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Overview of Stay Alaya platform
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-2xl p-6 border ${s.border} shadow-sm`}
          >
            <div
              className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-4`}
            >
              <s.icon size={22} className={s.color} />
            </div>
            <div className={`text-3xl font-bold font-display ${s.color} mb-1`}>
              {s.value}
            </div>
            <div className="text-slate-500 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Activity</h2>
            <button
              onClick={() => navigate("/admin/notifications")}
              className="text-primary-600 text-sm hover:underline"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.map((n) => {
              const meta = TYPE_ICONS[n.type] || {
                icon: "[NTF]",
                color: "bg-slate-100 text-slate-600",
              };
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-6 py-4 ${!n.isRead ? "bg-blue-50/40" : ""}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${meta.color}`}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {formatDistanceToNow(n.createdAt)}
                    </p>
                    {n.type === "DELETE_PG" && (
                      <button
                        onClick={() => navigate("/admin/pending")}
                        className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        Review & Approve Delete →
                      </button>
                    )}
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/admin/pending")}
                className="w-full flex items-center justify-between p-3.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <Clock size={15} /> View Pending Approvals
                </span>
                <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {
                    pgs.filter(
                      (p) =>
                        (p.status === "pending" ||
                          p.status === "pending_update" ||
                          p.status === "pending_delete") &&
                        !p.isDeleted,
                    ).length
                  }
                </span>
              </button>
              <button
                onClick={() => navigate("/admin/users")}
                className="w-full flex items-center gap-2 p-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors text-sm font-medium"
              >
                <Users size={15} /> Manage Users
              </button>
              <button
                onClick={() => navigate("/admin/pgs")}
                className="w-full flex items-center gap-2 p-3.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl transition-colors text-sm font-medium"
              >
                <Building2 size={15} /> All PG Listings
              </button>
            </div>
          </div>

          <div className="bg-primary-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} />
              <span className="font-semibold text-sm">Platform Growth</span>
            </div>
            <p className="text-primary-200 text-xs mb-4">
              Demand for Gangtok PGs has risen by 30% this winter.
            </p>
            <div className="flex items-end gap-1 h-16">
              {[40, 55, 45, 70, 65, 80, 75, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-white/20 rounded-sm"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
