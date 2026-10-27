import { useState, useEffect, useMemo } from 'react';
import { Check, X, ChevronDown, ChevronUp, Home, Trash2, AlertTriangle, Info, CheckCircle2, RefreshCw, UserCheck, UserX, FileText, ExternalLink, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import Modal from '../../components/ui/Modal';
import StatusPill from '../../components/ui/StatusPill';
import { extractDocUrl } from '../../utils/avatarHelper';

export default function AdminPending() {
  const { pgs, approvePG, rejectPG, approveDeletePG, rejectDeletePG, users, fetchAdminData, approveOwner, rejectOwner, changeUserRole } = useData();
  const [expanded, setExpanded] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kycTab, setKycTab] = useState('all'); // 'all' | 'pending' | 'approved'
  const [revokeModal, setRevokeModal] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

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

  // Safe document opening handler (never navigates into a relative 404 URL)
  const handleOpenDoc = (rawUrl, label = 'Document') => {
    const url = extractDocUrl(rawUrl);
    if (!url || !url.startsWith('http')) {
      toast.error(`No valid ${label} URL available.`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Owner moderation modals
  const [confirmApproveModal, setConfirmApproveModal] = useState(null);
  const [approvingOwnerId, setApprovingOwnerId] = useState(null);
  const [rejectOwnerModal, setRejectOwnerModal] = useState(null);
  const [rejectOwnerReason, setRejectOwnerReason] = useState('');
  const [isRejectingOwner, setIsRejectingOwner] = useState(false);
  // Deletion modals
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);
  const [declineDeleteModal, setDeclineDeleteModal] = useState(null);
  const [declineReason, setDeclineReason] = useState('');

  // Legacy listing reject modal
  const [legacyRejectModal, setLegacyRejectModal] = useState(null);
  const [legacyRejectReason, setLegacyRejectReason] = useState('');

  // 1. Pending owner KYC applications awaiting admin action
  const pendingOwners = useMemo(() => {
    return (users || []).filter((u) => u.ownerRequestStatus === 'pending');
  }, [users]);

  // 2. Approved & Stored KYC Owner records (owners who were verified or have KYC records stored)
  const approvedOwners = useMemo(() => {
    return (users || []).filter((u) => {
      const isOwner = u.role === 'owner';
      const isVerified = u.kyc_status === 'verified' || u.ownerRequestStatus === 'approved';
      const hasDocs = Boolean(u.kyc_doc_url || u.propertyDocumentUrl || u.kyc_id_doc_url || u.identityDocumentUrl);
      return (isVerified || (isOwner && hasDocs) || isOwner) && u.ownerRequestStatus !== 'pending';
    });
  }, [users]);

  // 3. All KYC records (pending first, then approved)
  const allKycOwners = useMemo(() => {
    const list = [...pendingOwners];
    approvedOwners.forEach((ao) => {
      if (!list.some((po) => String(po.id) === String(ao.id))) {
        list.push(ao);
      }
    });
    return list;
  }, [pendingOwners, approvedOwners]);

  const displayedKycOwners = useMemo(() => {
    if (kycTab === 'pending') return pendingOwners;
    if (kycTab === 'approved') return approvedOwners;
    return allKycOwners;
  }, [kycTab, pendingOwners, approvedOwners, allKycOwners]);

  const deletePGs = pgs.filter(p => p.status === 'pending_delete' && !p.isDeleted);
  const newPGs = pgs.filter(p => p.status === 'pending' && !p.isDeleted);
  const updatePGs = pgs.filter(p => p.status === 'pending_update' && !p.isDeleted);

  const totalPendingCount = pendingOwners.length + deletePGs.length;

  // Owner Handlers
  const handleApproveOwner = async (userId, userName) => {
    setApprovingOwnerId(userId);
    try {
      await approveOwner(userId);
      toast.success(`Owner request for "${userName || 'User'}" approved & stored in verified records!`);
      setConfirmApproveModal(null);
      await fetchAdminData?.();
    } catch (e) {
      console.error('Failed to approve owner request:', e);
      toast.error(e?.message || 'Failed to approve owner request');
    } finally {
      setApprovingOwnerId(null);
    }
  };

  const handleRevokeOwner = async () => {
    if (!revokeModal?.userId) return;
    setIsRevoking(true);
    try {
      await changeUserRole(revokeModal.userId, 'student');
      toast.success(`Owner role for "${revokeModal.userName}" revoked. Reverted to Student.`);
      setRevokeModal(null);
      await fetchAdminData?.();
    } catch (e) {
      console.error('Failed to revoke owner access:', e);
      toast.error(e?.message || 'Failed to revoke owner role');
    } finally {
      setIsRevoking(false);
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
      await fetchAdminData?.();
    } catch (e) {
      console.error('Failed to decline owner request:', e);
      toast.error(e?.message || 'Failed to decline owner request');
    } finally {
      setIsRejectingOwner(false);
    }
  };

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
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Pending Approvals</h1>
            {totalPendingCount > 0 && (
              <span className="bg-[#f5a623] text-[#0f2547] text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                {totalPendingCount} Action Required
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Review owner role applications and property deletion requests
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-[#0f2547] text-[#f5a623] hover:bg-[#f5a623] hover:text-[#0f2547] active:bg-[#e09618] active:text-[#0f2547] border border-[#f5a623]/30 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#f5a623]' : 'text-[#f5a623]'} />
          Refresh Queue
        </button>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-blue-50/70 border border-blue-200/60 rounded-xl sm:rounded-2xl text-xs text-blue-800">
        <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-blue-900">Moderation Active:</span> Review student-to-owner KYC applications and PG deletion requests. Approved owners can immediately manage and list PG properties.
        </div>
      </div>

      {/* SECTION: Owner Requests & Stored KYC Records */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-slate-900 text-base sm:text-lg">
                  Owner Requests & KYC Verification
                </h2>
                {pendingOwners.length > 0 ? (
                  <span className="bg-purple-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs animate-pulse">
                    {pendingOwners.length} Pending
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {approvedOwners.length} Verified & Stored
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                Review owner KYC applications. Approved owners and verification documents are stored permanently.
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setKycTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                kycTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records ({allKycOwners.length})
            </button>
            <button
              type="button"
              onClick={() => setKycTab('pending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                kycTab === 'pending'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  kycTab === 'pending'
                    ? 'bg-white text-purple-700'
                    : pendingOwners.length > 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pendingOwners.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setKycTab('approved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                kycTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Approved / Stored</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  kycTab === 'approved'
                    ? 'bg-white text-emerald-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {approvedOwners.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content list or empty state */}
        {displayedKycOwners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 text-center shadow-xs">
            <CheckCircle2 size={30} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-slate-700 font-semibold text-sm">
              {kycTab === 'pending'
                ? 'No pending owner requests'
                : kycTab === 'approved'
                ? 'No approved owner KYC records found'
                : 'No owner KYC records found'}
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              {kycTab === 'pending'
                ? 'All owner KYC applications have been reviewed.'
                : 'Approved owner KYC applications and documents will appear here.'}
            </p>
            {kycTab === 'pending' && approvedOwners.length > 0 && (
              <button
                type="button"
                onClick={() => setKycTab('approved')}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
              >
                <ShieldCheck size={14} /> View {approvedOwners.length} Stored & Verified KYC Records
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedKycOwners.map((u) => {
              const isPending = u.ownerRequestStatus === 'pending';
              const details = u.ownerRequestDetails || {};
              const userAvatar = u.avatar || u.avatar_url || '';
              const propDoc = extractDocUrl(
                u.kyc_doc_url || u.propertyDocumentUrl || details.propertyDocumentUrl,
                userAvatar
              );
              const idDoc = extractDocUrl(
                u.kyc_id_doc_url || u.identityDocumentUrl || details.identityDocumentUrl,
                userAvatar
              );
              const hasDocs = Boolean(propDoc || idDoc);

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-2xl border-2 shadow-xs overflow-hidden transition-all ${
                    isPending
                      ? 'border-purple-200/90 hover:border-purple-300'
                      : 'border-emerald-200/80 hover:border-emerald-300'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden border ${
                          isPending
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {u.avatar || u.avatar_url ? (
                          <img
                            src={u.avatar || u.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          u.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-base truncate">
                            {u.name}
                          </h3>
                          {isPending ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                              Pending Owner Approval
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Verified Owner · Stored KYC
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                          <span>
                            Email: <span className="text-slate-700 font-medium">{u.email}</span>
                          </span>
                          {u.phone && (
                            <span>
                              · Phone: <span className="text-slate-700 font-medium">{u.phone}</span>
                            </span>
                          )}
                          {details.requestedAt && (
                            <span className="text-slate-400">
                              · Applied:{' '}
                              {new Date(details.requestedAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                          {!isPending && (
                            <span className="text-emerald-700 font-medium">
                              · Role: Verified Owner
                            </span>
                          )}
                        </div>

                        {/* Document inspection links */}
                        <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-600">
                            Verification Documents:
                          </span>
                          {propDoc ? (
                            <a
                              href={propDoc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                            >
                              <FileText size={12} /> Property Doc <ExternalLink size={10} />
                            </a>
                          ) : null}

                          {idDoc ? (
                            <a
                              href={idDoc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                            >
                              <FileText size={12} /> Identity Doc <ExternalLink size={10} />
                            </a>
                          ) : null}

                          {!hasDocs && (
                            <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200">
                              {isPending
                                ? 'No documents uploaded (Properties will list as Unverified upon approval)'
                                : 'Approved without documents (Properties unverified)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={approvingOwnerId === u.id || isRejectingOwner}
                            onClick={() =>
                              setConfirmApproveModal({
                                userId: u.id,
                                userName: u.name,
                                hasDocs,
                              })
                            }
                            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <UserCheck size={14} /> Approve Owner
                          </button>
                          <button
                            type="button"
                            disabled={approvingOwnerId === u.id || isRejectingOwner}
                            onClick={() => {
                              setRejectOwnerModal({
                                userId: u.id,
                                userName: u.name,
                              });
                              setRejectOwnerReason('');
                            }}
                            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <UserX size={14} /> Decline
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <span className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            Approved & Stored
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevokeModal({
                                userId: u.id,
                                userName: u.name,
                              })
                            }
                            className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                            title="Revoke owner status and revert to student"
                          >
                            <UserX size={13} /> Revoke
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary Section: Pending Delete Requests */}
      <div>
        <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Trash2 size={18} className="text-rose-600" />
            <h2 className="font-semibold text-slate-900 text-base sm:text-lg">Pending Deletion Requests</h2>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
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
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-3 sm:gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-primary-50 shrink-0 border border-slate-200">
                          {pg.images?.[0] ? (
                            <img src={pg.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home size={22} className="text-primary-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-slate-900 text-sm sm:text-base leading-snug truncate">{pg.title}</h3>
                            <StatusPill status={pg.status} />
                          </div>
                          <p className="text-slate-500 text-xs mt-1 truncate">
                            {pg.location.area}, {pg.location.city} · Owner: <span className="font-semibold text-slate-700">{owner?.name || pg.ownerName}</span>
                          </p>

                          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap text-xs">
                            <span className="text-primary-600 font-bold text-sm">₹{pg.price.toLocaleString('en-IN')}/mo</span>
                            <span className="text-slate-400">· {pg.roomType} · {pg.genderPreference}</span>
                            <span className="text-slate-500 font-medium">· Contact: {pg.contactNumber}</span>
                          </div>
                        </div>
                      </div>

                      {reason && (
                        <div className="mt-3 p-3 sm:p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 mb-1">
                            <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                            Owner's Reason for Deletion:
                          </div>
                          <p className="text-xs text-rose-950 font-normal leading-relaxed pl-5">{reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 md:justify-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:flex-col">
                        <button
                          onClick={() => setConfirmDeleteModal(pg)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} /> Approve Delete
                        </button>
                        <button
                          onClick={() => setDeclineDeleteModal(pg)}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                        >
                          <X size={13} /> Decline Request
                        </button>
                      </div>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : pg.id)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
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

      {/* Modal: Confirm Approve Owner */}
      <Modal
        isOpen={!!confirmApproveModal}
        onClose={() => setConfirmApproveModal(null)}
        title="Approve Owner Request"
        onConfirm={() =>
          handleApproveOwner(
            confirmApproveModal?.userId,
            confirmApproveModal?.userName
          )
        }
        confirmText={approvingOwnerId ? "Approving..." : "Confirm & Approve"}
        confirmVariant="primary"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Are you sure you want to approve{" "}
            <span className="font-semibold text-slate-900">
              "{confirmApproveModal?.userName}"
            </span>{" "}
            as a PG Owner?
          </p>
          {confirmApproveModal?.hasDocs ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <span className="font-semibold">Documents Attached: </span>
              Verification documents are available. Properties listed by this owner will automatically show the <strong>Verified</strong> badge upon listing approval.
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span className="font-semibold">No Documents Attached: </span>
              This user has not uploaded KYC documents yet. The user will be granted owner access, but their PG listings will remain <strong>Unverified</strong> until valid documents are submitted.
            </div>
          )}
          <p className="text-xs text-slate-500">
            The user will be immediately upgraded to Owner role and will receive an in-app confirmation notification.
          </p>
        </div>
      </Modal>

      {/* Modal: Decline Owner Request */}
      <Modal
        isOpen={!!rejectOwnerModal}
        onClose={() => {
          setRejectOwnerModal(null);
          setRejectOwnerReason("");
        }}
        title="Decline Owner Request"
        onConfirm={handleRejectOwner}
        confirmText={isRejectingOwner ? "Declining..." : "Decline Request"}
        confirmVariant="danger"
      >
        <p className="text-sm text-slate-600 mb-3">
          Please provide a reason for declining the owner request for{" "}
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
          className="input-field resize-none text-sm w-full"
        />
      </Modal>

      {/* Modal: Revoke Owner Access */}
      <Modal
        isOpen={!!revokeModal}
        onClose={() => setRevokeModal(null)}
        title="Revoke Owner Access"
        onConfirm={handleRevokeOwner}
        confirmText={isRevoking ? "Revoking..." : "Revoke to Student"}
        confirmVariant="danger"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Are you sure you want to revoke owner access for{" "}
            <span className="font-semibold text-slate-900">
              "{revokeModal?.userName}"
            </span>
            ?
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            This will change the user's role back to Student / User. Their uploaded KYC verification documents will remain stored in the records, but their owner privileges will be revoked.
          </p>
        </div>
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
