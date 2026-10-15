import { useState, useMemo } from 'react';
import { Search, Trash2, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../hooks/useData';
import Modal from '../../components/ui/Modal';
import StatusPill from '../../components/ui/StatusPill';

export default function AdminAllPGs() {
  const { pgs, deletePG, users } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const filtered = useMemo(() => {
    let result = pgs;
    if (search) result = result.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.location.city.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) result = statusFilter === 'deleted' ? result.filter(p => p.isDeleted) : result.filter(p => p.status === statusFilter && !p.isDeleted);
    return result;
  }, [pgs, search, statusFilter]);

  const handleDelete = async () => {
    try {
      await deletePG(deleteId);
      setDeleteId(null);
      toast.success('PG deleted');
    } catch (e) {
      toast.error(e?.message || 'Failed to delete PG');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">All PG Listings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all PG listings on the platform</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
          <Search size={15} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or city..."
            className="bg-transparent text-sm outline-none flex-1 text-slate-700" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending_delete">Pending Delete</option>
          <option value="pending">Pending</option>
          <option value="pending_update">Pending Update</option>
          <option value="rejected">Rejected</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <p className="text-sm text-slate-500">Showing {filtered.length} listings</p>

      <div className="space-y-3">
        {filtered.map(pg => {
          const owner = users.find(u => u.id === pg.ownerId);
          return (
            <div key={pg.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4 ${pg.isDeleted ? 'opacity-60' : ''}`}>
              <div className="w-16 h-14 rounded-xl overflow-hidden bg-primary-50 shrink-0">
                {pg.images?.[0] ? <img src={pg.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Home size={18} className="text-primary-300" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{pg.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {pg.isDeleted ? (
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Deleted</span>
                    ) : (
                      <StatusPill status={pg.status} />
                    )}
                  </div>
                </div>
                <p className="text-slate-500 text-xs">{pg.location.city} · Owner: <span className="font-medium">{owner?.name}</span></p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-primary-600 font-semibold text-sm">₹{pg.price.toLocaleString('en-IN')}/mo</span>
                  <span className="text-slate-400 text-xs">{pg.roomType} · {pg.genderPreference}</span>
                </div>
                {pg.rejectionReason && <p className="text-red-500 text-xs mt-1 truncate">Rejected: {pg.rejectionReason}</p>}
              </div>
              {!pg.isDeleted && (
                <button onClick={() => setDeleteId(pg.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 self-start">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <p className="text-slate-400 text-sm">No PGs match your search</p>
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete PG"
        onConfirm={handleDelete} confirmText="Delete" confirmVariant="danger">
        <p className="text-slate-600 text-sm">Are you sure you want to delete this PG listing?</p>
      </Modal>
    </div>
  );
}
