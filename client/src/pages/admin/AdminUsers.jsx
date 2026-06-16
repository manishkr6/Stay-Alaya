import { useState, useMemo } from 'react';
import { Search, Check, Ban, UserCheck, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function AdminUsers() {
  const { approveOwner, blockUser } = useData();
  const { users } = useData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filtered = useMemo(() => {
    let result = users;
    if (search) result = result.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    if (roleFilter) result = result.filter(u => u.role === roleFilter);
    return result;
  }, [users, search, roleFilter]);

  const handleApproveOwner = (userId) => {
    approveOwner(userId);
    toast.success('Owner access approved!');
  };

  const handleBlock = (userId) => {
    const user = users.find(u => u.id === userId);
    blockUser(userId);
    toast.success(user?.isBlocked ? 'User unblocked' : 'User blocked');
  };

  const roleBadge = {
    admin: 'bg-red-100 text-red-700',
    owner: 'bg-purple-100 text-purple-700',
    user: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage platform users and owner requests</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'text-primary-600' },
          { label: 'Owners', value: users.filter(u => u.role === 'owner').length, color: 'text-purple-600' },
          { label: 'Pending Owner Requests', value: users.filter(u => u.ownerRequestStatus === 'pending').length, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
            <div className={`text-3xl font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
          <Search size={15} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="bg-transparent text-sm outline-none flex-1" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner Request</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(user => (
                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.isBlocked ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[user.role]}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      user.ownerRequestStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                      user.ownerRequestStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {user.ownerRequestStatus || 'None'}
                    </span>
                    {user.ownerRequestDetails && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[11px] text-slate-500">Phone: {user.ownerRequestDetails.phoneNumber || 'N/A'}</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={user.ownerRequestDetails.propertyDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-primary-600 hover:underline"
                          >
                            Property Doc
                          </a>
                          <a
                            href={user.ownerRequestDetails.identityDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-primary-600 hover:underline"
                          >
                            ID Doc
                          </a>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {user.ownerRequestStatus === 'pending' && (
                        <button onClick={() => handleApproveOwner(user.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors">
                          <UserCheck size={12} /> Approve Owner
                        </button>
                      )}
                      {user.id !== currentUser?.id && user.role !== 'admin' && (
                        <button onClick={() => navigate(`/messages?userId=${user.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-medium transition-colors">
                          <MessageSquare size={12} /> Chat
                        </button>
                      )}
                      {user.id !== currentUser?.id && user.role !== 'admin' && (
                        <button onClick={() => handleBlock(user.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            user.isBlocked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}>
                          {user.isBlocked ? <><Check size={12}/> Unblock</> : <><Ban size={12}/> Block</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No users found</div>
          )}
        </div>
      </div>
    </div>
  );
}
