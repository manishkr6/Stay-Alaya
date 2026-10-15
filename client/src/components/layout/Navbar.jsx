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
  Search,
  Building2,
  Info,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useData } from "../../hooks/useData";

export default function Navbar() {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const { getSavedPGs, getUnreadCount } = useData();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
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

  const savedCount = currentUser ? getSavedPGs(currentUser.id)?.length || 0 : 0;
  const unreadCount = getUnreadCount();

  const handleLogout = () => {
    logout();
  };
  const handleNavSearch = (e) => {
    e.preventDefault();
    const query = navSearch.trim();
    if (!query) {
      navigate("/find-pg");
      return;
    }
    navigate(`/find-pg?location=${encodeURIComponent(query)}`);
  };

  const roleLinks = {
    admin: { label: "Admin Panel", path: "/admin" },
    owner: { label: "My Dashboard", path: "/owner" },
    student: { label: "Dashboard", path: "/dashboard" },
    user: { label: "Dashboard", path: "/dashboard" },
  };

  const isAuthPage = [
    "/login",
    "/signup",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ].some((p) => location.pathname.startsWith(p));

  const navLinkClass = (path) => {
    const active =
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path);
    return `flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
      active
        ? "bg-primary-600 text-white shadow-sm"
        : "text-slate-600 hover:text-primary-700 hover:bg-white/80"
    }`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 pt-3">
      <div
        className={`max-w-7xl mx-auto rounded-2xl border transition-all duration-300 ${
          scrolled
            ? "bg-white/85 border-white/70 shadow-xl shadow-slate-900/10 backdrop-blur-xl"
            : "bg-white/75 border-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-lg"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group rounded-xl px-1.5 py-1"
          >
            <img
              src="/logo.png"
              alt="Stay Alaya logo"
              className="w-8 h-8 rounded-lg object-cover shadow-sm ring-1 ring-white/70"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="font-display font-semibold text-slate-900 text-base sm:text-lg group-hover:text-primary-700 transition-colors">
              Stay <span className="text-primary-600">Alaya</span>
            </span>
          </Link>

          {/* Center Links (desktop) */}
          {(!isAuthenticated ||
            currentUser?.role === "user" ||
            currentUser?.role === "student" ||
            currentUser?.role === "owner") && (
            <div className="hidden md:flex items-center gap-1">
              <Link to="/" className={navLinkClass("/")}>
                <Home size={15} /> Home
              </Link>
              <Link to="/find-pg" className={navLinkClass("/find-pg")}>
                <Search size={15} /> Find PG
              </Link>
              <Link to="/about" className={navLinkClass("/about")}>
                <Info size={15} /> About
              </Link>
              <Link
                to="/list-your-pg"
                className={navLinkClass("/list-your-pg")}
              >
                <Building2 size={15} /> List Your PG
              </Link>
            </div>
          )}

          {/* Navbar Search (desktop) */}
          <form
            onSubmit={handleNavSearch}
            className="hidden lg:flex items-center bg-white/90 border border-slate-200/80 rounded-xl pl-3 pr-1 py-1 w-64 focus-within:ring-2 focus-within:ring-primary-200"
          >
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search location..."
              className="w-full px-2 py-1.5 text-sm bg-transparent border-0 outline-none focus:ring-0"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors active:scale-95"
            >
              Go
            </button>
          </form>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-2">
            {!isAuthenticated || isAuthPage ? (
              <>
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === "/login"
                      ? "bg-white text-primary-700"
                      : "text-slate-700 hover:text-primary-600 hover:bg-white/80"
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary text-sm py-2 shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                {(currentUser.role === "user" || currentUser.role === "student") && (
                  <Link
                    to="/dashboard"
                    className="relative p-2 rounded-xl hover:bg-white/90 transition-colors text-slate-600 hover:text-primary-700"
                  >
                    <Heart size={18} />
                    {savedCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {savedCount}
                      </span>
                    )}
                  </Link>
                )}
                {isAuthenticated && (
                  <Link
                    to={
                      currentUser.role === "admin"
                        ? "/admin/notifications"
                        : "/notifications"
                    }
                    className="relative p-2 rounded-xl hover:bg-white/90 transition-colors text-slate-600 hover:text-primary-700"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                )}
                {(currentUser.role === "owner" || currentUser.role === "admin") && (
                  <Link
                    to={roleLinks[currentUser.role]?.path || "/dashboard"}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      location.pathname.startsWith(
                        roleLinks[currentUser.role]?.path || "/dashboard",
                      )
                        ? "bg-primary-600 text-white"
                        : "text-slate-700 hover:text-primary-700 hover:bg-white/90"
                    }`}
                  >
                    <Building2 size={15} /> {roleLinks[currentUser.role]?.label || "Dashboard"}
                  </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white transition-colors border border-slate-200/80"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700 max-w-[80px] truncate">
                      {currentUser.name.split(" ")[0]}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-fade-in">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-500">Signed in as</p>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                      <Link
                        to={roleLinks[currentUser.role]?.path || "/dashboard"}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LayoutDashboard size={15} /> Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-white/90 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden max-w-7xl mx-auto mt-2 bg-white/95 border border-white/90 rounded-2xl shadow-xl backdrop-blur-xl animate-slide-up overflow-hidden">
          {/* Mobile Search Bar */}
          <form
            onSubmit={(e) => {
              handleNavSearch(e);
              setMobileOpen(false);
            }}
            className="p-3 border-b border-slate-100 flex items-center gap-2"
          >
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary-200">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search area (e.g. Tadong, Gangtok)..."
                className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none focus:ring-0 text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-primary-600 rounded-xl"
            >
              Go
            </button>
          </form>

          {/* User Profile Info if logged in */}
          {isAuthenticated && currentUser && (
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {currentUser.email}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full shrink-0">
                {currentUser.role}
              </span>
            </div>
          )}

          <div className="px-3 py-3 space-y-1">
            <Link to="/" className={navLinkClass("/")}>
              <Home size={16} /> Home
            </Link>
            <Link to="/find-pg" className={navLinkClass("/find-pg")}>
              <Search size={16} /> Find PG
            </Link>
            <Link to="/about" className={navLinkClass("/about")}>
              <Info size={16} /> About
            </Link>
            <Link to="/list-your-pg" className={navLinkClass("/list-your-pg")}>
              <Building2 size={16} /> List Your PG
            </Link>
            {!isAuthenticated || isAuthPage ? (
              <div className="flex gap-2 pt-2">
                <Link
                  to="/login"
                  className="flex-1 text-center py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="flex-1 btn-primary text-center text-sm py-2.5"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <>
                {(currentUser.role === "user" || currentUser.role === "student") && (
                  <Link
                    to="/dashboard"
                    className="relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-primary-50 hover:text-primary-600 font-medium text-sm"
                  >
                    <Heart size={16} /> Saved PGs
                    {savedCount > 0 && (
                      <span className="ml-auto min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
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
                  className="relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-primary-50 hover:text-primary-600 font-medium text-sm"
                >
                  <Bell size={16} /> Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <Link
                  to={roleLinks[currentUser.role]?.path || "/dashboard"}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-700 hover:bg-primary-50 hover:text-primary-600 font-medium text-sm"
                >
                  <LayoutDashboard size={16} />{" "}
                  {roleLinks[currentUser.role]?.label || "Dashboard"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm text-left"
                >
                  <LogOut size={16} /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
