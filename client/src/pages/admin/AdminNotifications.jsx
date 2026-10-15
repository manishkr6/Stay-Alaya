import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Trash2, X, ExternalLink, ArrowRight, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import Modal from '../../components/ui/Modal';
import { formatDistanceToNow } from '../../utils/time';

const TYPES = ['ALL', 'DELETE_PG', 'ADD_PG', 'UPDATE_PG', 'REPORT_PG', 'USER_SIGNUP', 'OWNER_REQUEST', 'REVIEW'];
const TYPE_META = {
  ADD_PG: { icon: '🏠', label: 'New PG', color: 'bg-blue-100 text-blue-700' },
  UPDATE_PG: { icon: '✏️', label: 'PG Update', color: 'bg-amber-100 text-amber-700' },
  DELETE_PG: { icon: '🗑️', label: 'Delete Request', color: 'bg-rose-100 text-rose-700' },
  REPORT_PG: { icon: '⚠️', label: 'Report', color: 'bg-red-100 text-red-700' },
  USER_SIGNUP: { icon: '👤', label: 'New User', color: 'bg-emerald-100 text-emerald-700' },
  OWNER_REQUEST: { icon: '🔑', label: 'Owner Request', color: 'bg-purple-100 text-purple-700' },
  REVIEW: { icon: '⭐', label: 'Review', color: 'bg-amber-100 text-amber-700' },
};

export default function AdminNotifications() {
  const {
    notifications,
    markNotificationsRead,
    markOneRead,
    getUnreadCount,
    pgs,
    approveDeletePG,
    rejectDeletePG,
    fetchAdminData,
    fetchNotifications,
  } = useData();

  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals for approving / declining deletion directly from notification
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
  const [declineDeleteModal, setDeclineDeleteModal] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  // Always refresh admin data and notifications on mount
  useEffect(() => {
    fetchAdminData?.();
    fetchNotifications?.();
  }, [fetchAdminData, fetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchAdminData?.(),
      fetchNotifications?.(),
    ]);
    setIsRefreshing(false);
    toast.success('Notifications & listings updated');
  };

  const handleApproveDelete = async () => {
    if (!confirmDeleteModal?.id) return;
    try {
      await approveDeletePG(confirmDeleteModal.id);
      toast.success(`Deletion approved. "${confirmDeleteModal.title}" has been removed.`);
      setConfirmDeleteModal(null);
      await fetchNotifications?.();
    } catch (e) {
      toast.error(e?.message || 'Failed to approve deletion');
    }
  };

  const handleDeclineDelete = async () => {
    if (!declineReason.trim()) {
      toast.error('Please enter a reason for declining the deletion request');
      return;
    }
    try {
      await rejectDeletePG(declineDeleteModal.id, declineReason.trim());
      toast.success(`Deletion request declined. "${declineDeleteModal.title}" remains active.`);
      setDeclineDeleteModal(null);
      setDeclineReason('');
      await fetchNotifications?.();
    } catch (e) {
      toast.error(e?.message || 'Failed to decline deletion request');
    }
  };

  const filtered = activeType === 'ALL' ? notifications : notifications.filter(n => n.type === activeType);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unread = getUnreadCount();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors shadow-xs"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-primary-600' : ''} />
            Refresh
          </button>
          {unread > 0 && (
            <button
              onClick={markNotificationsRead}
              className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-xs font-semibold transition-colors"
            >
              <Check size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
        {TYPES.map(t => {
          const count = t === 'ALL' ? notifications.filter(n => !n.isRead).length : notifications.filter(n => n.type === t && !n.isRead).length;
          return (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeType === t ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.replace('_', ' ')}
              {count > 0 && (
                <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${
                  activeType === t ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {sorted.map(n => {
          const meta = TYPE_META[n.type] || { icon: '🔔', color: 'bg-slate-100 text-slate-700', label: n.type };
          const targetPg = n.relatedId ? pgs.find(p => String(p.id) === String(n.relatedId)) : null;
          const isPendingDelete = targetPg && targetPg.status === 'pending_delete';

          return (
            <div
              key={n.id}
              onClick={() => !n.isRead && markOneRead(n.id)}
              className={`p-5 rounded-2xl border transition-all ${
                n.isRead ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-200 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-slate-400 text-xs">{formatDistanceToNow(n.createdAt)}</span>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-medium">{n.message}</p>

                  {/* ACTION BAR FOR DELETE_PG REQUESTS */}
                  {n.type === 'DELETE_PG' && (
                    <div className="mt-3">
                      {isPendingDelete ? (
                        <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle size={13} className="text-rose-600" />
                              Action Required: Property Delete Requested
                            </span>
                            <span className="text-slate-500 font-medium">
                              ₹{targetPg.price?.toLocaleString('en-IN')}/mo · {targetPg.location?.city}
                            </span>
                          </div>

                          {(targetPg.deleteRequestReason || targetPg.delete_request_reason) && (
                            <p className="text-xs text-rose-950 bg-white/80 p-2.5 rounded-lg border border-rose-100 leading-relaxed">
                              <span className="font-semibold text-rose-900">Owner reason: </span>
                              {targetPg.deleteRequestReason || targetPg.delete_request_reason}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteModal(targetPg);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                            >
                              <Trash2 size={12} /> Approve Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeclineDeleteModal(targetPg);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                            >
                              <X size={12} /> Decline Request
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/admin/pending');
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg text-xs font-medium transition-colors ml-auto"
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
                          Property has been removed from platform
                        </div>
                      )}
                    </div>
                  )}

                  {/* QUICK LINKS FOR OTHER NOTIFICATIONS */}
                  {(n.type === 'ADD_PG' || n.type === 'UPDATE_PG') && n.relatedId && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pg/${n.relatedId}`);
                        }}
                        className="text-xs text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        View Live Listing <ExternalLink size={12} />
                      </button>
                    </div>
                  )}

                  {n.type === 'OWNER_REQUEST' && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/admin/users');
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        Manage Users & Owner Requests <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-2" />}
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-slate-400 text-sm">No notifications for this filter</p>
          </div>
        )}
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
            Are you sure you want to approve the deletion of <span className="font-semibold text-slate-900">"{confirmDeleteModal?.title}"</span>?
          </p>
          {confirmDeleteModal && (confirmDeleteModal.deleteRequestReason || confirmDeleteModal.delete_request_reason) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <span className="font-semibold">Owner reason: </span>
              {confirmDeleteModal.deleteRequestReason || confirmDeleteModal.delete_request_reason}
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
        onClose={() => { setDeclineDeleteModal(null); setDeclineReason(''); }}
        title="Decline Deletion Request"
        onConfirm={handleDeclineDelete}
        confirmText="Decline Request"
        confirmVariant="primary"
      >
        <p className="text-sm text-slate-600 mb-3">
          Please provide a reason for declining the deletion of <span className="font-semibold text-slate-900">"{declineDeleteModal?.title}"</span>. The property will remain active and the owner will be notified.
        </p>
        <textarea
          value={declineReason}
          onChange={e => setDeclineReason(e.target.value)}
          rows={4}
          placeholder="e.g. Active bookings or tenant inquiries exist for this property..."
          className="input-field resize-none text-sm"
        />
      </Modal>
    </div>
  );
}
