import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Trash2, X, ExternalLink, ArrowRight, AlertTriangle, RefreshCw, CheckCircle2, UserCheck, UserX, FileText, ShieldCheck, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import Modal from '../../components/ui/Modal';
import { formatDistanceToNow } from '../../utils/time';
import { extractDocUrl } from '../../utils/avatarHelper';

const TYPES = ['ALL', 'INQUIRY', 'DELETE_PG', 'ADD_PG', 'UPDATE_PG', 'REPORT_PG', 'USER_SIGNUP', 'OWNER_REQUEST', 'REVIEW'];
const TYPE_META = {
  INQUIRY: { icon: '📬', label: 'User Inquiry', color: 'bg-emerald-100 text-emerald-800' },
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
    users,
    approveDeletePG,
    rejectDeletePG,
    approveOwner,
    rejectOwner,
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

  // Modals for owner requests
  const [rejectOwnerModal, setRejectOwnerModal] = useState(null);
  const [rejectOwnerReason, setRejectOwnerReason] = useState('');
  const [isRejectingOwner, setIsRejectingOwner] = useState(false);

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

  // Safe document opening handler (never navigates into a relative 404 URL)
  const handleOpenDoc = (rawUrl, label = 'Document') => {
    const url = extractDocUrl(rawUrl);
    if (!url || !url.startsWith('http')) {
      toast.error(`No valid ${label} URL available.`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleApproveOwner = async (userId, userName) => {
    try {
      await approveOwner(userId);
      toast.success(`Owner request for "${userName || 'User'}" approved!`);
      await Promise.all([fetchAdminData?.(), fetchNotifications?.()]);
    } catch (e) {
      toast.error(e?.message || 'Failed to approve owner request');
    }
  };

  const handleRejectOwner = async () => {
    if (!rejectOwnerModal?.userId) return;
    if (!rejectOwnerReason.trim()) {
      toast.error('Please enter a reason for declining the owner request');
      return;
    }
    setIsRejectingOwner(true);
    try {
      await rejectOwner(rejectOwnerModal.userId, rejectOwnerReason.trim());
      toast.success(`Owner request for "${rejectOwnerModal.userName}" declined.`);
      setRejectOwnerModal(null);
      setRejectOwnerReason('');
      await Promise.all([fetchAdminData?.(), fetchNotifications?.()]);
    } catch (e) {
      toast.error(e?.message || 'Failed to decline owner request');
    } finally {
      setIsRejectingOwner(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-primary-600' : ''} />
            Refresh
          </button>
          {unread > 0 && (
            <button
              onClick={markNotificationsRead}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Check size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-nowrap">
        {TYPES.map(t => {
          const count = t === 'ALL' ? notifications.filter(n => !n.isRead).length : notifications.filter(n => n.type === t && !n.isRead).length;
          return (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
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
              className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
                n.isRead ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-200 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${meta.color}`}>
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-slate-400 text-[11px] sm:text-xs">{formatDistanceToNow(n.createdAt)}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">{n.message}</p>

                  {/* ACTION BAR FOR DELETE_PG REQUESTS */}
                  {n.type === 'DELETE_PG' && (
                    <div className="mt-3">
                      {isPendingDelete ? (
                        <div className="p-3 sm:p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                            <span className="font-semibold text-rose-900 flex items-center gap-1.5">
                              <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                              Action Required: Property Delete Requested
                            </span>
                            <span className="text-slate-600 font-semibold">
                              ₹{targetPg.price?.toLocaleString('en-IN')}/mo · {targetPg.location?.city}
                            </span>
                          </div>

                          {(targetPg.deleteRequestReason || targetPg.delete_request_reason) && (
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
                                navigate('/admin/pending');
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

                  {n.type === 'USER_SIGNUP' && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/admin/users');
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        View in Users Directory <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {n.type === 'INQUIRY' && (() => {
                    const match = n.message && n.message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                    const senderEmail = match ? match[1] : null;
                    return (
                      <div className="mt-2.5 flex items-center gap-2">
                        {senderEmail && (
                          <a
                            href={`mailto:${senderEmail}?subject=${encodeURIComponent('Reply from Stay Alaya Support')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary-600 hover:text-primary-800 font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            <Mail size={12} /> Reply to {senderEmail}
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {n.type === 'OWNER_REQUEST' && (() => {
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
                    const isPending = applicant?.ownerRequestStatus === 'pending' || applicant?.kyc_status === 'pending';

                    return (
                      <div className="mt-3 p-3 sm:p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                          <span className="font-semibold text-purple-950 flex items-center gap-1.5">
                            <ShieldCheck size={13} className="text-purple-600 shrink-0" />
                            Owner Verification Application
                          </span>
                          {applicant && (
                            <span className="text-slate-600 font-medium">
                              {applicant.email} {applicant.phone ? `· ${applicant.phone}` : ''}
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
                                  setRejectOwnerReason('');
                                }}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                              >
                                <UserX size={12} /> Decline
                              </button>
                            </div>
                          ) : applicant?.role === 'owner' ? (
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
                              navigate('/admin/pending');
                            }}
                            className="inline-flex items-center justify-center sm:justify-start gap-1 px-3 py-1 text-purple-700 hover:text-purple-800 hover:underline text-xs font-semibold transition-colors sm:ml-auto cursor-pointer"
                          >
                            Approvals Queue <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Modal: Decline Owner Request */}
      <Modal
        isOpen={!!rejectOwnerModal}
        onClose={() => {
          setRejectOwnerModal(null);
          setRejectOwnerReason('');
        }}
        title="Decline Owner Request"
        onConfirm={handleRejectOwner}
        confirmText={isRejectingOwner ? 'Declining...' : 'Decline Request'}
        confirmVariant="danger"
      >
        <p className="text-sm text-slate-600 mb-3">
          Please provide a reason for declining the owner request for{' '}
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
