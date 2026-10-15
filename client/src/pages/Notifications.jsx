import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from '../utils/time';

const TYPE_META = {
  ADD_PG: { icon: '🏠', label: 'New PG', color: 'bg-blue-100 text-blue-700' },
  UPDATE_PG: { icon: '✏️', label: 'PG Update', color: 'bg-amber-100 text-amber-700' },
  DELETE_PG: { icon: '🗑️', label: 'PG Deleted', color: 'bg-red-100 text-red-700' },
  REPORT_PG: { icon: '⚠️', label: 'Report', color: 'bg-red-100 text-red-700' },
  USER_SIGNUP: { icon: '👤', label: 'New User', color: 'bg-emerald-100 text-emerald-700' },
  OWNER_REQUEST: { icon: '🔑', label: 'Owner Request', color: 'bg-purple-100 text-purple-700' },
  OWNER_APPROVED: { icon: '✅', label: 'Owner Approved', color: 'bg-emerald-100 text-emerald-700' },
  PG_STATUS_UPDATE: { icon: '🔔', label: 'PG Status', color: 'bg-indigo-100 text-indigo-700' },
  PHONE_UPDATE: { icon: '📱', label: 'Phone Update', color: 'bg-emerald-100 text-emerald-700' },
  PROFILE_UPDATE: { icon: '👤', label: 'Profile Update', color: 'bg-teal-100 text-teal-700' },
  REVIEW: { icon: '⭐', label: 'Review', color: 'bg-amber-100 text-amber-700' },
  USER_ROLE: { icon: '🛡️', label: 'Role Update', color: 'bg-purple-100 text-purple-700' },
  info: { icon: 'ℹ️', label: 'Notice', color: 'bg-blue-100 text-blue-700' },
};

export default function Notifications() {
  const { currentUser } = useAuth();
  const { notifications, markNotificationsRead, markOneRead, getUnreadCount } = useData();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('ALL');

  const types = useMemo(() => {
    const unique = Array.from(new Set(notifications.map((n) => n.type)));
    return ['ALL', ...unique];
  }, [notifications]);

  const filtered = activeType === 'ALL' ? notifications : notifications.filter((n) => n.type === activeType);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unread = getUnreadCount();

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-500 text-sm mt-1">
              {unread} unread notification{unread !== 1 ? 's' : ''} for {currentUser?.role}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markNotificationsRead}
              className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-sm font-medium transition-colors"
            >
              <Check size={15} /> Mark All Read
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
          {types.map((t) => {
            const count =
              t === 'ALL'
                ? notifications.filter((n) => !n.isRead).length
                : notifications.filter((n) => n.type === t && !n.isRead).length;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeType === t ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.replaceAll('_', ' ')}
                {count > 0 && (
                  <span
                    className={`w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${
                      activeType === t ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {sorted.map((n) => {
            const meta = TYPE_META[n.type] || { icon: '📌', color: 'bg-slate-100 text-slate-700', label: n.type };
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markOneRead(n.id)}
                className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${
                  n.isRead ? 'bg-white border-slate-100' : 'bg-blue-50 border-blue-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${meta.color}`}>{meta.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{n.message}</p>
                  <p className="text-slate-400 text-xs mt-1">{formatDistanceToNow(n.createdAt)}</p>
                  {currentUser?.role === 'admin' && n.type === 'DELETE_PG' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/admin/pending');
                      }}
                      className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      Review & Approve Delete →
                    </button>
                  )}
                </div>
                {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-2" />}
              </div>
            );
          })}
          {sorted.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <p className="text-4xl mb-3">🔔</p>
              <p className="text-slate-400 text-sm">No notifications right now</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
