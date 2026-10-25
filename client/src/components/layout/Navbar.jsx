import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Heart,
  Bell,
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Home,
  Info,
  Clock,
  List,
  Users,
  Globe,
  Plus,
  LogIn,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useData } from "../../hooks/useData";

export default function Navbar() {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const { pgs, getSavedPGs, getUnreadCount } = useData();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileOpen && !e.target.closest(".profile-dropdown-container")) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [profileOpen]);

  const isAdminPage = location.pathname.startsWith("/admin");
  const savedCount = currentUser ? getSavedPGs(currentUser.id)?.length || 0 : 0;
  const unreadCount = getUnreadCount();
  const pendingCount = (pgs || []).filter(
    (p) =>
      (p.status === "pending_delete" ||
        p.status === "pending" ||
        p.status === "pending_update") &&
      !p.isDeleted,
  ).length;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const roleLinks = {
    admin: { label: "Admin Panel", path: "/admin" },
    owner: { label: "My Dashboard", path: "/owner" },
    student: { label: "My Dashboard", path: "/dashboard" },
    user: { label: "My Dashboard", path: "/dashboard" },
  };

  const isAuthPage = [
    "/login",
    "/signup",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ].some((p) => location.pathname.startsWith(p));

  const adminNavItems = [
    {
      path: "/admin/pending",
      label: "Pending Approvals",
      icon: Clock,
      badge: pendingCount,
    },
    {
      path: "/admin/pgs",
      label: "All PGs",
      icon: List,
    },
    {
      path: "/admin/users",
      label: "Users",
      icon: Users,
    },
    {
      path: "/admin/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount,
    },
    {
      path: "/saved-pgs",
      label: "Saved PGs",
      icon: Heart,
      badge: savedCount,
    },
  ];

  const getNavLinkClass = (path, exact = false) => {
    const active = exact
      ? location.pathname === path
      : path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path);
    return `inline-flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-semibold whitespace-nowrap ${
      active
        ? "bg-[#0f2547] text-[#f5a623] shadow-xs"
        : "text-slate-700 hover:text-[#0f2547] hover:bg-slate-100/80"
    }`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 pt-3 sm:pt-4">
      <div
        className={`max-w-7xl mx-auto rounded-full border transition-all duration-300 ${
          scrolled
            ? "bg-white/95 border-slate-200/90 shadow-xl shadow-slate-900/10 backdrop-blur-xl"
            : "bg-white/95 border-slate-200/80 shadow-lg shadow-slate-900/5 backdrop-blur-xl"
        }`}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 gap-3">
          {/* Logo */}
          <Link
            to={isAdminPage ? "/admin" : "/"}
            className="flex items-center gap-2 group px-0.5 sm:px-1 py-1 shrink-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-amber-400/40 shadow-xs bg-white">
              <img
                src="/logo1.png"
                alt="Stay Aalaya"
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "/logo.png";
                }}
              />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span
                  className="font-serif text-lg sm:text-2xl font-black tracking-tight text-[#0f2547]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Stay <span className="text-[#f5a623]">Aalaya</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[8.5px] sm:text-[9.5px] font-bold tracking-widest uppercase text-slate-800"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  ROOMS & PG FINDER
                </span>
                <span className="bg-[#0f2547] text-[#f5a623] text-[8px] font-black px-1.5 py-0.2 rounded tracking-wider uppercase">
                  SIKKIM
                </span>
              </div>
            </div>
            {isAdminPage && (
              <span className="text-[10px] font-bold tracking-wider uppercase bg-[#0f2547] text-[#f5a623] px-2 py-0.5 rounded-full border border-amber-400/30">
                Admin
              </span>
            )}
          </Link>

          {/* Center Links (desktop) - No Search Bar */}
          {isAdminPage ? (
            <div className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
              {adminNavItems.map((item) => {
                const active = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 text-xs lg:text-sm font-medium whitespace-nowrap ${
                      active
                        ? "bg-[#0f2547] text-[#f5a623] shadow-xs"
                        : "text-slate-600 hover:text-[#0f2547] hover:bg-slate-100"
                    }`}
                  >
                    <item.icon size={15} className="text-[#f5a623]" />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 h-4 flex items-center justify-center leading-none ${
                          active
                            ? "bg-[#f5a623] text-[#0f2547]"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link to="/" className={getNavLinkClass("/", true)}>
                <Home
                  size={15}
                  className="text-[#f5a623]"
                />
                <span className="whitespace-nowrap">Home</span>
              </Link>
              <Link to="/about" className={getNavLinkClass("/about")}>
                <Info
                  size={15}
                  className="text-[#f5a623]"
                />
                <span className="whitespace-nowrap">About Us</span>
              </Link>
              <Link to="/find-pg" className={getNavLinkClass("/find-pg")}>
                <Sparkles
                  size={15}
                  className="text-[#f5a623] animate-pulse"
                />
                <span className="whitespace-nowrap flex items-center gap-1.5">
                  <span>Find PG</span>
                  <span className="bg-[#f5a623] text-[#0f2547] text-[9.5px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    AI
                  </span>
                </span>
              </Link>
              <Link to="/list-your-pg" className={getNavLinkClass("/list-your-pg")}>
                <Plus
                  size={15}
                  className="text-[#f5a623] stroke-[3]"
                />
                <span className="whitespace-nowrap">List PG</span>
              </Link>
            </div>
          )}

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {!isAuthenticated || isAuthPage ? (
              <>
                <Link
                  to="/login"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    location.pathname === "/login"
                      ? "bg-[#0f2547] text-[#f5a623] shadow-xs"
                      : "text-slate-700 hover:text-[#0f2547] hover:bg-slate-100/80"
                  }`}
                >
                  <LogIn size={15} className="text-[#f5a623]" />
                  <span>Log In</span>
                </Link>
                <Link
                  to="/signup"
                  className={`inline-flex items-center justify-center px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 whitespace-nowrap ${
                    location.pathname === "/signup"
                      ? "bg-[#0f2547] text-[#f5a623] shadow-xs border border-amber-400/30"
                      : "bg-[#f5a623] hover:bg-[#e09618] text-[#0f2547]"
                  }`}
                >
                  Sign Up
                </Link>
              </>
            ) : isAdminPage ? (
              /* Admin on Admin Page */
              <>
                <Link
                  to="/"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs lg:text-sm font-semibold text-slate-700 hover:text-[#0f2547] hover:bg-slate-100/80 border border-slate-200/80 bg-white transition-all shadow-xs"
                  title="View Public Site"
                >
                  <Globe size={14} className="text-[#f5a623]" />
                  <span className="hidden sm:inline">Live Site</span>
                </Link>

                {/* Admin Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white hover:bg-slate-50 transition-all border border-slate-200/80 shadow-xs cursor-pointer"
                  >
                    {currentUser?.avatar_url || currentUser?.avatar ? (
                      <img
                        src={currentUser.avatar_url || currentUser.avatar}
                        alt={currentUser?.name}
                        className="w-7 h-7 rounded-full object-cover border border-amber-400/50 shadow-xs"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#0f2547] border border-amber-400/50 flex items-center justify-center text-[#f5a623] text-xs font-black shadow-xs">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || "A"}
                      </div>
                    )}
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 max-w-[85px] truncate">
                      {currentUser.name.split(" ")[0]}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in divide-y divide-slate-100">
                      <div className="px-4 py-2.5">
                        <p className="text-[11px] text-slate-400 font-medium">Signed in as</p>
                        <p className="text-sm font-bold text-[#0f2547] truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {currentUser.email}
                        </p>
                        <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#0f2547] text-[#f5a623] border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                          Administrator
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-[#0f2547] hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard size={15} className="text-[#f5a623]" />
                          Dashboard
                        </Link>
                        <Link
                          to="/admin/pending"
                          className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:text-[#0f2547] hover:bg-slate-50 transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <Clock size={15} className="text-[#f5a623]" />
                            Pending Approvals
                          </span>
                          {pendingCount > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {pendingCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          to="/saved-pgs"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-[#0f2547] hover:bg-slate-50 transition-colors"
                        >
                          <Heart size={15} className="text-[#f5a623]" />
                          Saved PGs
                        </Link>
                        <Link
                          to="/"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-[#0f2547] hover:bg-slate-50 transition-colors"
                        >
                          <Globe size={15} className="text-[#f5a623]" />
                          View Public Site
                        </Link>
                      </div>
                      <div className="pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut size={15} /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Big Screen Direct Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 bg-white hover:border-rose-200 transition-all shadow-xs cursor-pointer group"
                  aria-label="Log Out"
                >
                  <LogOut size={14} className="text-rose-500 group-hover:rotate-12 transition-transform" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              /* Authenticated on public / normal pages */
              <>
                {currentUser && (
                  <Link
                    to="/saved-pgs"
                    title="Saved PGs"
                    className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600 hover:text-[#0f2547]"
                  >
                    <Heart size={18} />
                    {savedCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {savedCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  to={
                    currentUser.role === "admin"
                      ? "/admin/notifications"
                      : "/notifications"
                  }
                  title="Notifications"
                  className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600 hover:text-[#0f2547]"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Pill - Theme Colors (Deep Navy #0F2547 & Amber #F5A623) */}
                {/* Clicking Profile opens Dashboard directly, Chevron toggles dropdown menu */}
                <div className="relative profile-dropdown-container">
                  <div
                    className={`flex items-center rounded-full transition-all border shadow-xs ${
                      location.pathname.startsWith(
                        roleLinks[currentUser.role]?.path || "/dashboard",
                      )
                        ? "bg-[#0f2547] text-[#f5a623] border-[#0f2547]"
                        : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80"
                    }`}
                  >
                    <Link
                      to={roleLinks[currentUser.role]?.path || "/dashboard"}
                      className="flex items-center gap-2 pl-1.5 pr-2 py-1 cursor-pointer"
                      title="Open My Dashboard"
                    >
                      {/* Brand Theme Avatar */}
                      {currentUser.avatar_url || currentUser.avatar ? (
                        <img
                          src={currentUser.avatar_url || currentUser.avatar}
                          alt={currentUser.name}
                          className="w-7 h-7 rounded-full object-cover border border-amber-400/50 shadow-xs"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#0f2547] border border-amber-400/50 flex items-center justify-center text-[#f5a623] text-xs font-black shadow-xs">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs sm:text-sm font-semibold max-w-[90px] truncate">
                        {currentUser.name.split(" ")[0]}
                      </span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setProfileOpen(!profileOpen)}
                      className={`pr-2.5 pl-0.5 py-1.5 transition-colors cursor-pointer ${
                        location.pathname.startsWith(
                          roleLinks[currentUser.role]?.path || "/dashboard",
                        )
                          ? "text-[#f5a623]/80 hover:text-[#f5a623]"
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="Account Options"
                      aria-label="Account options dropdown"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in divide-y divide-slate-100">
                      <div className="px-4 py-2.5">
                        <p className="text-[11px] text-slate-400 font-medium">Signed in as</p>
                        <p className="text-sm font-bold text-[#0f2547] truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {currentUser.email}
                        </p>
                        <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#0f2547] text-[#f5a623] border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                          {currentUser.role === "admin"
                            ? "Administrator"
                            : currentUser.role === "owner"
                              ? "PG Owner"
                              : "Student / Tenant"}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link
                          to={roleLinks[currentUser.role]?.path || "/dashboard"}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:text-[#0f2547] hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard size={15} className="text-[#f5a623]" />
                          {currentUser.role === "admin"
                            ? "Admin Panel"
                            : "Dashboard"}
                        </Link>
                        {currentUser.role !== "admin" && (
                          <Link
                            to="/saved-pgs"
                            className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:text-[#0f2547] hover:bg-slate-50 transition-colors"
                          >
                            <span className="flex items-center gap-2.5">
                              <Heart size={15} className="text-[#f5a623]" />
                              Saved PGs
                            </span>
                            {savedCount > 0 && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {savedCount}
                              </span>
                            )}
                          </Link>
                        )}
                      </div>
                      <div className="pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut size={15} /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Big Screen Direct Logout Option */}
                <button
                  onClick={handleLogout}
                  title="Log Out"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 bg-white hover:border-rose-200 transition-all shadow-xs cursor-pointer group"
                  aria-label="Log Out"
                >
                  <LogOut size={14} className="text-rose-500 group-hover:rotate-12 transition-transform" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button & quick actions */}
          <div className="flex items-center gap-1.5 md:hidden">
            {currentUser && (
              <>
                <Link
                  to={
                    currentUser.role === "admin"
                      ? "/admin/notifications"
                      : "/notifications"
                  }
                  title="Notifications"
                  className="relative p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Mobile User Profile Avatar - Clicking opens Dashboard */}
                <Link
                  to={roleLinks[currentUser.role]?.path || "/dashboard"}
                  title="Open Dashboard"
                  className={`relative p-1 rounded-full transition-all shrink-0 flex items-center justify-center ${
                    location.pathname.startsWith(
                      roleLinks[currentUser.role]?.path || "/dashboard",
                    )
                      ? "bg-[#0f2547] ring-2 ring-[#f5a623] shadow-md"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                  aria-label="User Dashboard"
                >
                  {currentUser.avatar_url || currentUser.avatar ? (
                    <img
                      src={currentUser.avatar_url || currentUser.avatar}
                      alt={currentUser.name}
                      className={`w-7 h-7 rounded-full object-cover transition-all ${
                        location.pathname.startsWith(
                          roleLinks[currentUser.role]?.path || "/dashboard",
                        )
                          ? "border-2 border-[#f5a623]"
                          : "border border-slate-200 shadow-xs"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
                        location.pathname.startsWith(
                          roleLinks[currentUser.role]?.path || "/dashboard",
                        )
                          ? "bg-[#f5a623] text-[#0f2547]"
                          : "bg-[#0f2547] text-[#f5a623] border border-amber-400/50"
                      }`}
                    >
                      {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  {location.pathname.startsWith(
                    roleLinks[currentUser.role]?.path || "/dashboard",
                  ) && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#f5a623] ring-2 ring-white rounded-full animate-pulse shadow-xs" />
                  )}
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden max-w-7xl mx-auto mt-2 bg-white/95 border border-slate-200/90 rounded-2xl shadow-xl backdrop-blur-xl animate-slide-up overflow-hidden">
          {isAdminPage ? (
            /* Admin Mobile Drawer */
            <>
              <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser?.avatar_url || currentUser?.avatar ? (
                    <img
                      src={currentUser?.avatar_url || currentUser?.avatar}
                      alt={currentUser?.name}
                      className="w-9 h-9 rounded-full object-cover border border-amber-400/40 shadow-xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#0f2547] text-[#f5a623] border border-amber-400/40 flex items-center justify-center font-bold text-sm">
                      {currentUser?.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Administrator
                    </p>
                  </div>
                </div>
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-semibold text-[#0f2547] hover:text-[#f5a623] flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200"
                >
                  <Globe size={13} className="text-[#f5a623]" /> Live Site
                </Link>
              </div>

              <div className="px-3 py-3 space-y-1">
                {adminNavItems
                  .filter((item) => item.path !== "/saved-pgs")
                  .map((item) => {
                  const active = item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                        active
                          ? "bg-[#0f2547] text-[#f5a623] shadow-xs"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon size={17} className="text-[#f5a623]" />
                        {item.label}
                      </span>
                      {item.badge > 0 && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            active
                              ? "bg-[#f5a623] text-[#0f2547]"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}

                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium text-sm text-left"
                  >
                    <LogOut size={17} /> Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Regular Mobile Drawer */
            <>
              {/* User Profile Info if logged in */}
              {isAuthenticated && currentUser && (
                <Link
                  to={roleLinks[currentUser.role]?.path || "/dashboard"}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 border-b flex items-center gap-3 transition-colors ${
                    location.pathname.startsWith(
                      roleLinks[currentUser.role]?.path || "/dashboard",
                    )
                      ? "bg-[#0f2547]/5 border-amber-300/40"
                      : "bg-slate-50/80 border-slate-100 hover:bg-slate-100"
                  }`}
                  title="Go to Dashboard"
                >
                  {currentUser?.avatar_url || currentUser?.avatar ? (
                    <img
                      src={currentUser?.avatar_url || currentUser?.avatar}
                      alt={currentUser?.name}
                      className={`w-9 h-9 rounded-full object-cover shadow-xs shrink-0 transition-all ${
                        location.pathname.startsWith(
                          roleLinks[currentUser.role]?.path || "/dashboard",
                        )
                          ? "border-2 border-[#f5a623] ring-2 ring-[#0f2547]"
                          : "border border-amber-400/40"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        location.pathname.startsWith(
                          roleLinks[currentUser.role]?.path || "/dashboard",
                        )
                          ? "bg-[#f5a623] text-[#0f2547] border border-[#0f2547]"
                          : "bg-[#0f2547] text-[#f5a623] border border-amber-400/40"
                      }`}
                    >
                      {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{currentUser.name}</span>
                      {location.pathname.startsWith(
                        roleLinks[currentUser.role]?.path || "/dashboard",
                      ) && (
                        <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
                      )}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0f2547] text-[#f5a623] border border-amber-400/30 px-2 py-0.5 rounded-full shrink-0">
                    {currentUser.role}
                  </span>
                </Link>
              )}

              <div className="px-3 py-3 space-y-1">
                <Link to="/" onClick={() => setMobileOpen(false)} className={getNavLinkClass("/", true)}>
                  <Home size={16} className="text-[#f5a623]" /> Home
                </Link>
                <Link to="/about" onClick={() => setMobileOpen(false)} className={getNavLinkClass("/about")}>
                  <Info size={16} className="text-[#f5a623]" /> About Us
                </Link>
                <Link to="/find-pg" onClick={() => setMobileOpen(false)} className={getNavLinkClass("/find-pg")}>
                  <Sparkles size={16} className="text-[#f5a623]" />
                  <span className="flex items-center gap-1.5">
                    <span>Find PG</span>
                    <span className="bg-[#f5a623] text-[#0f2547] text-[9.5px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                      AI
                    </span>
                  </span>
                </Link>
                <Link
                  to="/list-your-pg"
                  onClick={() => setMobileOpen(false)}
                  className={getNavLinkClass("/list-your-pg")}
                >
                  <Plus size={16} className="text-[#f5a623] stroke-[3]" /> List PG
                </Link>

                {!isAuthenticated || isAuthPage ? (
                  <div className="flex gap-2 pt-3">
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2.5 text-sm font-semibold border border-slate-200 text-slate-700 rounded-full hover:bg-slate-50"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="flex-1 text-center py-2.5 text-sm font-bold bg-[#f5a623] text-[#0f2547] rounded-full hover:bg-[#e09618]"
                    >
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <>
                    {currentUser && currentUser.role !== "admin" && (
                      <Link
                        to="/saved-pgs"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                          location.pathname === "/saved-pgs"
                            ? "bg-[#0f2547] text-[#f5a623] shadow-xs font-semibold"
                            : "text-slate-700 hover:bg-slate-100 hover:text-[#0f2547]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Heart size={16} className="text-[#f5a623]" /> Saved PGs
                        </span>
                        {savedCount > 0 && (
                          <span
                            className={`min-w-5 h-5 px-1 text-[10px] rounded-full flex items-center justify-center font-bold ${
                              location.pathname === "/saved-pgs"
                                ? "bg-[#f5a623] text-[#0f2547]"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {savedCount}
                          </span>
                        )}
                      </Link>
                    )}
                    <Link
                      to={
                        currentUser.role === "admin"
                          ? "/admin/notifications"
                          : "/notifications"
                      }
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                        location.pathname === "/notifications" ||
                        location.pathname === "/admin/notifications"
                          ? "bg-[#0f2547] text-[#f5a623] shadow-xs font-semibold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-[#0f2547]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Bell size={16} className="text-[#f5a623]" /> Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span
                          className={`min-w-5 h-5 px-1 text-[10px] rounded-full flex items-center justify-center font-bold ${
                            location.pathname === "/notifications" ||
                            location.pathname === "/admin/notifications"
                              ? "bg-[#f5a623] text-[#0f2547]"
                              : "bg-red-500 text-white"
                          }`}
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to={roleLinks[currentUser.role]?.path || "/dashboard"}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                        location.pathname.startsWith(
                          roleLinks[currentUser.role]?.path || "/dashboard",
                        )
                          ? "bg-[#0f2547] text-[#f5a623] shadow-xs font-semibold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-[#0f2547]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-[#f5a623]" />{" "}
                        {roleLinks[currentUser.role]?.label || "Dashboard"}
                      </span>
                      {location.pathname.startsWith(
                        roleLinks[currentUser.role]?.path || "/dashboard",
                      ) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f5a623] text-[#0f2547] px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium text-sm text-left transition-colors cursor-pointer"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
