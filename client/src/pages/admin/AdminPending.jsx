import { useState, useEffect } from 'react';
import { Check, X, ChevronDown, ChevronUp, Home, Trash2, AlertTriangle, Info, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import Modal from '../../components/ui/Modal';
import StatusPill from '../../components/ui/StatusPill';

export default function AdminPending() {
  const { pgs, approvePG, rejectPG, approveDeletePG, rejectDeletePG, users, fetchAdminData } = useData();
  const [expanded, setExpanded] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Always fetch latest data on mount
  useEffect(() => {
    fetchAdminData?.();
  }, [fetchAdminData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAdminData?.();
    setIsRefreshing(false);
    toast.success('Approvals queue refreshed');
  };

  // Deletion modals
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
  const [declineDeleteModal, setDeclineDeleteModal] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  // Legacy listing reject modal
  const [legacyRejectModal, setLegacyRejectModal] = useState(null);
  const [legacyRejectReason, setLegacyRejectReason] = useState('');

  const deletePGs = pgs.filter(p => p.status === 'pending_delete' && !p.isDeleted);
  const newPGs = pgs.filter(p => p.status === 'pending' && !p.isDeleted);
  const updatePGs = pgs.filter(p => p.status === 'pending_update' && !p.isDeleted);

  // Deletion Handlers
  const handleApproveDelete = async () => {
    if (!confirmDeleteModal?.id) return;
    try {
      await approveDeletePG(confirmDeleteModal.id);
      toast.success(`Deletion approved. "${confirmDeleteModal.title}" has been removed.`);
      setConfirmDeleteModal(null);
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
    } catch (e) {
      toast.error(e?.message || 'Failed to decline deletion request');
    }
  };

  // Legacy Handlers
  const handleLegacyApprove = async (id) => {
    try {
      await approvePG(id);
      toast.success('PG approved successfully!');
    } catch (e) {
      toast.error(e?.message || 'Failed to approve PG');
    }
  };

  const handleLegacyReject = async () => {
    if (!legacyRejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    try {
      await rejectPG(legacyRejectModal, legacyRejectReason.trim());
      setLegacyRejectModal(null);
      setLegacyRejectReason('');
      toast.success('PG rejected');
    } catch (e) {
      toast.error(e?.message || 'Failed to reject PG');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Pending Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">Review owner deletion requests and manage moderation queues</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors shadow-xs"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-primary-600' : ''} />
          Refresh Queue
        </button>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 p-4 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs text-blue-800">
        <Info size={17} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-blue-900">Direct Listing Active:</span> Property owners now publish and update listings directly. Only PG deletion requests require admin review and approval.
        </div>
      </div>

      {/* Primary Section: Pending Delete Requests */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Trash2 size={18} className="text-rose-600" />
            <h2 className="font-semibold text-slate-900 text-lg">Pending Deletion Requests</h2>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
            deletePGs.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
          }`}>
            {deletePGs.length}
          </span>
        </div>

        {deletePGs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-xs">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-slate-600 font-medium text-sm">No pending deletion requests</p>
            <p className="text-slate-400 text-xs mt-0.5">All owner properties are currently active.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deletePGs.map(pg => {
              const owner = users.find(u => String(u.id) === String(pg.ownerId));
              const isExpanded = expanded === pg.id;
              const reason = pg.deleteRequestReason || pg.delete_request_reason;

              return (
                <div key={pg.id} className="bg-white rounded-2xl border border-rose-100 shadow-xs overflow-hidden">
                  <div className="p-5 flex flex-col md:flex-row gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-primary-50 shrink-0">
                      {pg.images?.[0] ? (
                        <img src={pg.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home size={22} className="text-primary-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 truncate">{pg.title}</h3>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {pg.location.area}, {pg.location.city} · Owner: <span className="font-medium text-slate-700">{owner?.name || pg.ownerName}</span>
                          </p>
                        </div>
                        <StatusPill status={pg.status} />
                      </div>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-primary-600 font-semibold text-sm">₹{pg.price.toLocaleString('en-IN')}/mo</span>
                        <span className="text-slate-400 text-xs">· {pg.roomType} · {pg.genderPreference}</span>
                        <span className="text-slate-400 text-xs">· Contact: {pg.contactNumber}</span>
                      </div>

                      {reason && (
                        <div className="mt-3 p-3 bg-rose-50 border border-rose-200/80 rounded-xl">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 mb-1">
                            <AlertTriangle size={13} className="text-rose-600" />
                            Owner's Reason for Deletion:
                          </div>
                          <p className="text-xs text-rose-950 font-normal leading-relaxed">{reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2 shrink-0 justify-end md:justify-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        onClick={() => setConfirmDeleteModal(pg)}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Trash2 size={13} /> Approve Delete
                      </button>
                      <button
                        onClick={() => setDeclineDeleteModal(pg)}
                        className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                      >
                        <X size={13} /> Decline Request
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : pg.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors"
                      >
                        Details {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50">
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">{pg.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {pg.amenities.map(a => (
                          <span key={a} className="bg-white text-slate-600 text-xs px-2.5 py-1 rounded-full border border-slate-200 font-medium">
                            {a}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Address: {pg.location.address}</p>
                      {pg.images?.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                          {pg.images.map((img, i) => (
                            <img key={i} src={img} alt="" className="w-28 h-20 rounded-xl object-cover shrink-0" />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legacy Pending Sections (if any previous listings remain unapproved) */}
      {newPGs.length > 0 && (
        <LegacyPGSection
          title="Legacy Pending Submissions"
          pgs={newPGs}
          expanded={expanded}
          setExpanded={setExpanded}
          onApprove={handleLegacyApprove}
          onReject={setLegacyRejectModal}
          users={users}
        />
      )}

      {updatePGs.length > 0 && (
        <LegacyPGSection
          title="Legacy Pending Updates"
          pgs={updatePGs}
          expanded={expanded}
          setExpanded={setExpanded}
          onApprove={handleLegacyApprove}
          onReject={setLegacyRejectModal}
          users={users}
        />
      )}

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
          placeholder="e.g. Existing bookings or active queries exist for this listing..."
          className="input-field resize-none text-sm"
        />
      </Modal>

      {/* Modal: Legacy Reject Listing */}
      <Modal
        isOpen={!!legacyRejectModal}
        onClose={() => { setLegacyRejectModal(null); setLegacyRejectReason(''); }}
        title="Reject PG Listing"
        onConfirm={handleLegacyReject}
        confirmText="Reject"
        confirmVariant="danger"
      >
        <p className="text-sm text-slate-600 mb-4">Please provide a reason for rejection. The owner will be notified.</p>
        <textarea
          value={legacyRejectReason}
          onChange={e => setLegacyRejectReason(e.target.value)}
          rows={4}
          placeholder="e.g., Incomplete documentation, inaccurate images..."
          className="input-field resize-none text-sm"
        />
      </Modal>
    </div>
  );
}

function LegacyPGSection({ title, pgs, expanded, setExpanded, onApprove, onReject, users }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold text-slate-900 text-lg">{title}</h2>
        <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">{pgs.length}</span>
      </div>
      <div className="space-y-4">
        {pgs.map(pg => {
          const owner = users.find(u => String(u.id) === String(pg.ownerId));
          const isExpanded = expanded === pg.id;
          return (
            <div key={pg.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="p-5 flex gap-4">
                <div className="w-20 h-16 rounded-xl overflow-hidden bg-primary-50 shrink-0">
                  {pg.images?.[0] ? (
                    <img src={pg.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home size={20} className="text-primary-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 truncate">{pg.title}</h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {pg.location.area}, {pg.location.city} · by <span className="font-medium">{owner?.name || pg.ownerName}</span>
                      </p>
                    </div>
                    <StatusPill status={pg.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-primary-600 font-semibold text-sm">₹{pg.price.toLocaleString('en-IN')}/mo</span>
                    <span className="text-slate-400 text-xs">{pg.roomType} · {pg.genderPreference}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => onApprove(pg.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-medium transition-colors"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => onReject(pg.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-medium transition-colors"
                  >
                    <X size={13} /> Reject
                  </button>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : pg.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                  >
                    Details {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
