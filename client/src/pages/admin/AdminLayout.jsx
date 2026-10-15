import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  List,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Heart,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useData } from "../../hooks/useData";

const NAV = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { path: "/admin/pending", label: "Pending Approvals", icon: Clock },
  { path: "/admin/pgs", label: "All PGs", icon: List },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/notifications", label: "Notifications", icon: Bell },
  { path: "/saved-pgs", label: "Saved PGs", icon: Heart },
];

export default function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const { pgs, getUnreadCount } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pendingCount = pgs.filter(
    (p) =>
      (p.status === "pending_delete" ||
        p.status === "pending" ||
        p.status === "pending_update") &&
      !p.isDeleted,
  ).length;
  const unreadCount = getUnreadCount();

  const currentPage =
    NAV.find((n) =>
      n.exact
        ? location.pathname === n.path
        : location.pathname.startsWith(n.path),
    )?.label || "Admin";

  return (
    <div className="min-h-screen bg-slate-100 flex pt-16 mt-5">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed top-16 bottom-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-300 mt-4`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <a href="/" className="block">
              <img
                src="/logo.png"
                alt="Stay Alaya logo"
                className="w-8 h-8 rounded-lg object-cover shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </a>
            <div className="">
              <div className="text-white font-semibold text-sm">Stay Alaya</div>
              <div className="text-slate-400 text-xs">Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const badge =
              item.path === "/admin/pending"
                ? pendingCount
                : item.path === "/admin/notifications"
                  ? unreadCount
                  : 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={active ? "sidebar-link-active" : "sidebar-link"}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              {currentUser?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {currentUser?.name}
              </p>
              <p className="text-slate-400 text-xs">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-64">
        {/* Top navbar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Admin</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">{currentPage}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/notifications"
              className="relative p-2 rounded-lg hover:bg-slate-100"
            >
              <Bell size={18} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
