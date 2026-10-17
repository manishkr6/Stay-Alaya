import { useState, useMemo } from 'react';
import { 
  Search, 
  Check, 
  Ban, 
  UserCheck, 
  UserX, 
  Shield, 
  Clock, 
  Calendar, 
  Phone, 
  AlertCircle,
  FileText,
  ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/ui/Modal';

export default function AdminUsers() {
  const { users, approveOwner, rejectOwner, blockUser, changeUserRole } = useData();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const filtered = useMemo(() => {
    let result = users;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      if (roleFilter === 'user' || roleFilter === 'student') {
        result = result.filter((u) => u.role === 'student' || u.role === 'user');
      } else {
        result = result.filter((u) => u.role === roleFilter);
      }
    }
    return result;
  }, [users, search, roleFilter]);

  const handleRoleChange = async (userId, newRole) => {
    const user = users.find((u) => String(u.id) === String(userId));
    const currentNormalized = user?.role === 'user' ? 'student' : user?.role;
    const targetNormalized = newRole === 'user' ? 'student' : newRole;

    const displayRole = targetNormalized === 'student' ? 'Student / User' : targetNormalized.toUpperCase();

    // Prevent redundant update if user is already assigned this role
    if (currentNormalized === targetNormalized) {
      toast(`User is already set as ${displayRole}`, { id: `role-same-${userId}`, icon: 'ℹ️' });
      return;
    }

    try {
      setUpdatingId(userId);
      await changeUserRole(userId, targetNormalized);
      toast.success(`Role updated to ${displayRole} successfully`, { id: `role-success-${userId}` });
    } catch (err) {
      console.error('Role update error:', err);
      toast.error(err?.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveOwner = async (userId) => {
    try {
      await approveOwner(userId);
      toast.success('Owner access approved!');
    } catch (err) {
      toast.error(err?.message || 'Failed to approve owner');
    }
  };

  const handleRejectOwner = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason or message for the user');
      return;
    }
    setIsRejecting(true);
    try {
      await rejectOwner(rejectModal.userId, rejectReason.trim());
      toast.success(`Owner request for ${rejectModal.userName} rejected and notified.`);
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err?.message || 'Failed to reject owner request');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleBlock = async (userId) => {
    try {
      const user = users.find((u) => u.id === userId);
      await blockUser(userId);
      toast.success(user?.isBlocked ? 'User unblocked' : 'User blocked');
    } catch (err) {
      toast.error(err?.message || 'Failed to update user status');
    }
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Manage platform roles (Admin, Owner, Student / User), verify KYC submissions, and track user activity.
        </p>
      </div>

      {/* Stats row: Responsive compact 3 cols */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-primary-600' },
          { label: 'Owners', value: users.filter((u) => u.role === 'owner').length, color: 'text-purple-600' },
          {
            label: 'Pending KYC',
            value: users.filter((u) => u.ownerRequestStatus === 'pending').length,
            color: 'text-amber-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-2.5 sm:p-5 text-center shadow-xs sm:shadow-sm">
            <div className={`text-xl sm:text-3xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-[10.5px] sm:text-xs mt-0.5 sm:mt-1 truncate">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters: Responsive flex */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xs">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="bg-transparent text-xs sm:text-sm outline-none flex-1 text-slate-700"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm outline-none font-medium text-slate-700 shadow-xs"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
          <option value="student">Student / User</option>
        </select>
      </div>

      {/* MOBILE VIEW (<md): Clean, rich, 100% visible user cards */}
      <div className="block md:hidden space-y-3">
        {filtered.map((user) => {
          const isCurrent = user.id === currentUser?.id;
          const normalizedRole = user.role === 'user' ? 'student' : user.role;

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3 transition-colors ${
                user.isBlocked ? 'bg-red-50/20 border-red-100' : ''
              }`}
            >
              {/* User Identity & Status Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm truncate">{user.name}</p>
                      {isCurrent && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs truncate">{user.email}</p>
                    {user.phone ? (
                      <p className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-primary-600 shrink-0" /> {user.phone}
                      </p>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">No phone</span>
                    )}
                  </div>
                </div>

                {/* Status Pill */}
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                    user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {user.isBlocked ? 'Blocked' : 'Active'}
                </span>
              </div>

              {/* Role Selection & Block Action Row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">Role:</span>
                  <select
                    value={normalizedRole}
                    disabled={isCurrent || updatingId === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-all flex-1 min-w-0 ${
                      normalizedRole === 'admin'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : normalizedRole === 'owner'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    } ${isCurrent ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    <option value="student">Student / User</option>
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {!isCurrent && user.role !== 'admin' && (
                  <button
                    onClick={() => handleBlock(user.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      user.isBlocked
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    {user.isBlocked ? (
                      <>
                        <Check size={12} /> Unblock
                      </>
                    ) : (
                      <>
                        <Ban size={12} /> Block
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 truncate">
                  <Clock size={11} className="text-slate-400 shrink-0" />
                  {formatTimestamp(user.lastSignIn)}
                </span>
                {user.createdAt && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Calendar size={11} className="text-slate-400 shrink-0" />
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Owner KYC Banner & Actions (if applicable) */}
              {(user.ownerRequestStatus === 'pending' || user.ownerRequestDetails) && (
                <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900">Owner Verification Request</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        user.ownerRequestStatus === 'pending'
                          ? 'bg-amber-200 text-amber-900'
                          : user.ownerRequestStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {user.ownerRequestStatus?.toUpperCase() || 'NONE'}
                    </span>
                  </div>

                  {user.ownerRequestDetails && (
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {user.ownerRequestDetails.propertyDocumentUrl && (
                        <a
                          href={user.ownerRequestDetails.propertyDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 font-medium hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <FileText size={12} /> Property Doc <ExternalLink size={10} />
                        </a>
                      )}
                      {user.ownerRequestDetails.identityDocumentUrl && (
                        <a
                          href={user.ownerRequestDetails.identityDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 font-medium hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <FileText size={12} /> ID Doc <ExternalLink size={10} />
                        </a>
                      )}
                      {!user.ownerRequestDetails.propertyDocumentUrl && !user.ownerRequestDetails.identityDocumentUrl && (
                        <span className="text-[11px] text-amber-700">No documents attached</span>
                      )}
                    </div>
                  )}

                  {user.ownerRequestStatus === 'pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApproveOwner(user.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                      >
                        <UserCheck size={13} /> Approve Owner
                      </button>
                      <button
                        onClick={() => setRejectModal({ userId: user.id, userName: user.name })}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <UserX size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm shadow-xs">
            No users found matching your search
          </div>
        )}
      </div>

      {/* DESKTOP / TABLET VIEW (md: and up): Full structured table with horizontal scroll protection */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Role (Changeable)
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Last Sign In
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Owner KYC
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((user) => {
                const isCurrent = user.id === currentUser?.id;
                const normalizedRole = user.role === 'user' ? 'student' : user.role;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/70 transition-colors ${user.isBlocked ? 'opacity-60 bg-red-50/20' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs">{user.email}</p>
                          {user.phone ? (
                            <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-primary-600" /> {user.phone}
                            </p>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">No phone</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Interactive Role Selector */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={normalizedRole}
                          disabled={isCurrent || updatingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${
                            normalizedRole === 'admin'
                              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                              : normalizedRole === 'owner'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          } ${isCurrent ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          <option value="student">Student / User</option>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                        {updatingId === user.id && (
                          <span className="text-[11px] text-slate-400 animate-pulse">Saving...</span>
                        )}
                      </div>
                    </td>

                    {/* Last Sign In */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Clock size={12} className="text-slate-400" />
                          {formatTimestamp(user.lastSignIn)}
                        </span>
                        {user.createdAt && (
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar size={11} className="text-slate-300" />
                            Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>

                    {/* Owner Request */}
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          user.ownerRequestStatus === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : user.ownerRequestStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : user.ownerRequestStatus === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.ownerRequestStatus === 'rejected' ? 'Rejected' : (user.ownerRequestStatus || 'None')}
                      </span>
                      {user.ownerRequestDetails && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-slate-500">
                            Phone: {user.ownerRequestDetails.phoneNumber || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {user.ownerRequestDetails.propertyDocumentUrl && (
                              <a
                                href={user.ownerRequestDetails.propertyDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                Property Doc <ExternalLink size={10} />
                              </a>
                            )}
                            {user.ownerRequestDetails.identityDocumentUrl && (
                              <a
                                href={user.ownerRequestDetails.identityDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                ID Doc <ExternalLink size={10} />
                              </a>
                            )}
                            {!user.ownerRequestDetails.propertyDocumentUrl && !user.ownerRequestDetails.identityDocumentUrl && (
                              <span className="text-[11px] text-amber-600 font-medium">
                                No docs (Will list as Unverified)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {user.ownerRequestStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveOwner(user.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors"
                              title="Approve Owner Request"
                            >
                              <UserCheck size={12} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectModal({ userId: user.id, userName: user.name })}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-medium transition-colors"
                              title="Reject Owner Request with Message"
                            >
                              <UserX size={12} /> Reject
                            </button>
                          </>
                        )}
                        {!isCurrent && user.role !== 'admin' && (
                          <button
                            onClick={() => handleBlock(user.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              user.isBlocked
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {user.isBlocked ? (
                              <>
                                <Check size={12} /> Unblock
                              </>
                            ) : (
                              <>
                                <Ban size={12} /> Block
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No users found</div>
          )}
        </div>
      </div>

      {/* Reject Modal with Message */}
      <Modal
        isOpen={Boolean(rejectModal)}
        onClose={() => {
          if (!isRejecting) {
            setRejectModal(null);
            setRejectReason('');
          }
        }}
        title="Reject Owner Access Request"
        onConfirm={handleRejectOwner}
        confirmText={isRejecting ? 'Rejecting...' : 'Reject Request'}
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please enter a reason or message for declining{' '}
            <span className="font-semibold text-slate-900">{rejectModal?.userName}</span>'s request for owner access.
            This will be sent directly to the user as a real-time notification.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rejection Reason / Feedback <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g., Incomplete identity/property documentation uploaded, phone number unreachable, or details mismatch..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
              autoFocus
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              Quick Suggestions:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Incomplete identity / property documents',
                'Uploaded documents are blurred or unreadable',
                'Applicant details do not match submitted ID',
                'Phone number unreachable or incorrect',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReason(preset)}
                  className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
