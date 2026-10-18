import { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  Star,
  User,
  Home,
  Sparkles,
  ArrowRight,
  Shield,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from '../utils/time';
import Modal from '../components/ui/Modal';

const TYPE_META = {
  SAVED_PG: { icon: '❤️', label: 'Wishlist & Save', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  REVIEW: { icon: '⭐', label: 'Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  WELCOME: { icon: '🎉', label: 'Welcome', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ADD_PG: { icon: '🏠', label: 'New PG', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  UPDATE_PG: { icon: '✏️', label: 'PG Update', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  DELETE_PG: { icon: '🗑️', label: 'PG Deleted', color: 'bg-red-50 text-red-700 border-red-200' },
  REPORT_PG: { icon: '⚠️', label: 'Report', color: 'bg-red-50 text-red-700 border-red-200' },
  USER_SIGNUP: { icon: '👤', label: 'New User', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OWNER_REQUEST: { icon: '🔑', label: 'Owner Request', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  OWNER_APPROVED: { icon: '✅', label: 'Owner Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OWNER_REJECTED: { icon: '❌', label: 'Owner Declined', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  PG_STATUS_UPDATE: { icon: '🔔', label: 'PG Status', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PHONE_UPDATE: { icon: '📱', label: 'Phone Update', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PROFILE_UPDATE: { icon: '👤', label: 'Profile Update', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  USER_ROLE: { icon: '🛡️', label: 'Role Update', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  info: { icon: 'ℹ️', label: 'Notice', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const CATEGORIES = [
  { id: 'ALL', label: 'All', icon: Bell },
  { id: 'UNREAD', label: 'Unread', icon: Sparkles },
  { id: 'SAVED', label: 'Saved PGs', icon: Heart, types: ['SAVED_PG'] },
  { id: 'REVIEWS', label: 'Reviews', icon: Star, types: ['REVIEW'] },
  {
    id: 'ACCOUNT',
    label: 'Profile & Account',
    icon: User,
    types: ['PROFILE_UPDATE', 'PHONE_UPDATE', 'USER_ROLE', 'WELCOME', 'USER_SIGNUP', 'OWNER_REQUEST', 'OWNER_APPROVED', 'OWNER_REJECTED'],
  },
  {
    id: 'LISTINGS',
    label: 'PG Updates',
    icon: Home,
    types: ['ADD_PG', 'UPDATE_PG', 'DELETE_PG', 'PG_STATUS_UPDATE', 'REPORT_PG', 'info'],
  },
];

export default function Notifications() {
  const { currentUser } = useAuth();
  const {
    notifications,
    markNotificationsRead,
    markOneRead,
    markOneUnread,
    deleteNotification,
    clearAllNotifications,
    getUnreadCount,
    fetchNotifications,
  } = useData();

  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clearConfirmModal, setClearConfirmModal] = useState(false);

  // Fetch fresh notifications whenever page mounts or user id is ready
  useEffect(() => {
    fetchNotifications?.();
  }, [fetchNotifications, currentUser?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications?.();
    setIsRefreshing(false);
    toast.success('Notifications refreshed');
  };

  const handleMarkAllRead = async () => {
    if (getUnreadCount() === 0) return;
    await markNotificationsRead();
    toast.success('All notifications marked as read');
  };

  const handleToggleRead = async (e, n) => {
    e.stopPropagation();
    if (n.isRead) {
      await markOneUnread(n.id);
      toast.success('Marked as unread');
    } else {
      await markOneRead(n.id);
      toast.success('Marked as read');
    }
  };

  const handleDeleteOne = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
    toast.success('Notification removed');
  };

  const handleClearAllConfirm = async () => {
    await clearAllNotifications();
    setClearConfirmModal(false);
    toast.success('All notifications cleared');
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const saved = notifications.filter((n) => n.type === 'SAVED_PG').length;
    const reviews = notifications.filter((n) => n.type === 'REVIEW').length;
    const accountTypes = new Set(CATEGORIES.find((c) => c.id === 'ACCOUNT')?.types || []);
    const listingTypes = new Set(CATEGORIES.find((c) => c.id === 'LISTINGS')?.types || []);

    const account = notifications.filter((n) => accountTypes.has(n.type)).length;
    const listings = notifications.filter((n) => listingTypes.has(n.type)).length;

    return {
      ALL: notifications.length,
      UNREAD: unread,
      SAVED: saved,
      REVIEWS: reviews,
      ACCOUNT: account,
      LISTINGS: listings,
    };
  }, [notifications]);

  // Filtering by category + search query
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Category filter
      if (activeCategory === 'UNREAD') {
        if (n.isRead) return false;
      } else if (activeCategory !== 'ALL') {
        const cat = CATEGORIES.find((c) => c.id === activeCategory);
        if (cat?.types && !cat.types.includes(n.type)) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const msgMatch = (n.message || '').toLowerCase().includes(q);
        const typeMatch = (n.type || '').toLowerCase().replace(/_/g, ' ').includes(q);
        const metaLabel = (TYPE_META[n.type]?.label || '').toLowerCase().includes(q);
        return msgMatch || typeMatch || metaLabel;
      }

      return true;
    });
  }, [notifications, activeCategory, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filtered]);

  const unreadCount = getUnreadCount();

  const getActionDetails = (n) => {
    if (n.type === 'SAVED_PG') {
      if (n.relatedId) {
        return { label: 'View PG Details', onClick: () => navigate(`/pg/${n.relatedId}`) };
      }
      return { label: 'View Saved Wishlist', onClick: () => navigate('/dashboard?tab=saved') };
    }
    if (n.type === 'REVIEW') {
      if (n.relatedId) {
        return { label: 'View PG & Reviews', onClick: () => navigate(`/pg/${n.relatedId}`) };
      }
      return { label: 'My Reviews', onClick: () => navigate('/dashboard?tab=reviews') };
    }
    if (n.type === 'WELCOME') {
      return { label: 'Explore PGs in Sikkim', onClick: () => navigate('/find-pg') };
    }
    if (n.type === 'ADD_PG' || n.type === 'UPDATE_PG' || n.type === 'PG_STATUS_UPDATE') {
      if (n.relatedId) {
        return { label: 'View PG Listing', onClick: () => navigate(`/pg/${n.relatedId}`) };
      }
      return { label: 'Explore PGs', onClick: () => navigate('/find-pg') };
    }
    if (n.type === 'PROFILE_UPDATE' || n.type === 'PHONE_UPDATE') {
      return { label: 'Go to Profile', onClick: () => navigate('/dashboard') };
    }
    if (n.type === 'OWNER_REQUEST' || n.type === 'OWNER_APPROVED' || n.type === 'OWNER_REJECTED') {
      if (currentUser?.role === 'owner') {
        return { label: 'Go to Owner Dashboard', onClick: () => navigate('/owner') };
      }
      return { label: 'View Status in Dashboard', onClick: () => navigate('/dashboard') };
    }
    if (currentUser?.role === 'admin' && n.type === 'DELETE_PG') {
      return { label: 'Review Delete Request', onClick: () => navigate('/admin/pending') };
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-xl shadow-xs">
                <Bell size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    Notifications
                  </h1>
                  {unreadCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-600 text-white shadow-xs">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm">
                  {unreadCount === 0
                    ? `You're all caught up, ${currentUser?.name || 'Student'}!`
                    : `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh notifications"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-primary-600' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                unreadCount > 0
                  ? 'bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200/50'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-transparent'
              }`}
            >
              <CheckCheck size={16} />
              <span>Mark All Read</span>
            </button>

            {notifications.length > 0 && (
              <button
                onClick={() => setClearConfirmModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100/80 border border-rose-200/60 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Category Tabs Bar */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by keyword, title, or type..."
              className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.id] || 0;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0f2547] text-white shadow-sm'
                      : 'bg-white border border-slate-200/70 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-amber-400' : 'text-slate-400'} />
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
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

        {/* Notifications List */}
        <div className="space-y-3">
          {sorted.map((n) => {
            const meta = TYPE_META[n.type] || {
              icon: '📌',
              color: 'bg-slate-100 text-slate-700 border-slate-200',
              label: n.type || 'Notice',
            };
            const action = getActionDetails(n);

            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markOneRead(n.id)}
                className={`group relative flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                    : 'bg-blue-50/60 border-blue-200/80 hover:border-blue-300 shadow-xs ring-1 ring-blue-500/10'
                }`}
              >
                {/* Unread Left Indicator Ribbon */}
                {!n.isRead && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-blue-600 rounded-r-full" />
                )}

                {/* Type Icon Badge */}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border shadow-xs transition-transform group-hover:scale-105 ${meta.color}`}
                >
                  {meta.icon}
                </div>

                {/* Content Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-slate-400 text-xs font-normal">
                      • {formatDistanceToNow(n.createdAt)}
                    </span>
                    {!n.isRead && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                        Unread
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-normal pr-2">
                    {n.message}
                  </p>

                  {/* Quick Action Link Button */}
                  {action && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!n.isRead) markOneRead(n.id);
                          action.onClick();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl border border-primary-200/60 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>{action.label}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions on individual notification */}
                <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                  <button
                    onClick={(e) => handleToggleRead(e, n)}
                    title={n.isRead ? 'Mark as unread' : 'Mark as read'}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      n.isRead
                        ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100/80 bg-blue-100/40'
                    }`}
                  >
                    {n.isRead ? <EyeOff size={16} /> : <Check size={16} />}
                  </button>

                  <button
                    onClick={(e) => handleDeleteOne(e, n.id)}
                    title="Delete notification"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Empty Filter State */}
          {sorted.length === 0 && notifications.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-2xl mb-4">
                <Search size={28} />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No matching notifications</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                No notifications match your current filter or search criteria.
              </p>
              <button
                onClick={() => {
                  setActiveCategory('ALL');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Empty Zero Notifications State */}
          {notifications.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center text-2xl">
                <Bell size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No notifications yet</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  When you save PGs, post reviews, update your profile, or receive owner updates, your
                  notifications will appear here in real-time.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/find-pg"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0f2547] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 transition-all shadow-xs"
                >
                  <Home size={15} />
                  <span>Explore PGs</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                >
                  <User size={15} />
                  <span>Go to Dashboard</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clear All */}
      <Modal
        isOpen={clearConfirmModal}
        onClose={() => setClearConfirmModal(false)}
        title="Clear All Notifications"
        onConfirm={handleClearAllConfirm}
        confirmText="Yes, Clear All"
        confirmVariant="danger"
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            Are you sure you want to permanently delete all {notifications.length} notification
            {notifications.length !== 1 ? 's' : ''}?
          </p>
          <p className="text-slate-400 text-xs">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
