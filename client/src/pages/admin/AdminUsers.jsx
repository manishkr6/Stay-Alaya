import { useState, useMemo } from 'react';
import { Search, Check, Ban, UserCheck, UserX, Shield, Clock, Calendar, Phone, AlertCircle } from 'lucide-react';
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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage platform roles (Admin, Owner, Student / User), verify KYC submissions, and track user activity directly synced with Supabase.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-primary-600' },
          { label: 'Owners', value: users.filter((u) => u.role === 'owner').length, color: 'text-purple-600' },
          {
            label: 'Pending Owner Requests',
            value: users.filter((u) => u.ownerRequestStatus === 'pending').length,
            color: 'text-amber-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center shadow-sm">
            <div className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
          <Search size={15} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="bg-transparent text-sm outline-none flex-1"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
          <option value="student">Student / User</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
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
                        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                          {user.name.charAt(0)}
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
                                className="text-[11px] text-primary-600 hover:underline"
                              >
                                Property Doc
                              </a>
                            )}
                            {user.ownerRequestDetails.identityDocumentUrl && (
                              <a
                                href={user.ownerRequestDetails.identityDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary-600 hover:underline"
                              >
                                ID Doc
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
