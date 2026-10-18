import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const BREADCRUMB_MAP = [
  { path: "/admin/pending", label: "Pending Approvals" },
  { path: "/admin/pgs", label: "All PGs" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/notifications", label: "Notifications" },
  { path: "/admin", label: "Dashboard", exact: true },
];

export default function AdminLayout() {
  const location = useLocation();

  const currentPage =
    BREADCRUMB_MAP.find((item) =>
      item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path)
    )?.label || "Dashboard";

  return (
    <div className="min-h-screen bg-slate-50 pt-20 sm:pt-24 pb-12 sm:pb-16">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 mb-3.5 sm:mb-6">
          <Link
            to="/admin"
            className="hover:text-primary-600 transition-colors font-medium"
          >
            Admin
          </Link>
          <ChevronRight size={13} className="text-slate-400" />
          <span className="text-slate-900 font-semibold">{currentPage}</span>
        </div>

        {/* Content Outlet */}
        <Outlet />
      </div>
    </div>
  );
}
