import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Building2, CheckCircle, Clock, Home, UserCog, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import StatusPill from '../../components/ui/StatusPill';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import Modal from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/index.jsx';
import { supabase } from '../../lib/supabaseClient';

const TABS = [
  { id: 'pgs', label: 'My PGs', icon: Building2 },
  { id: 'add', label: 'Add New PG', icon: Plus },
];

export default function OwnerDashboard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { getOwnerPGs, deletePG, createNotification } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pgs');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');

  const myPGs = getOwnerPGs(currentUser?.id);
  const stats = {
    total: myPGs.length,
    approved: myPGs.filter(p => p.status === 'approved').length,
    pending: myPGs.filter(p => p.status === 'pending' || p.status === 'pending_update' || p.status === 'pending_delete').length,
    rejected: myPGs.filter(p => p.status === 'rejected').length,
  };

  const handleDelete = async () => {
    if (deleteReason.trim().length < 10) {
      toast.error('Please enter delete reason (minimum 10 characters)');
      return;
    }
    try {
      await deletePG(deleteId, deleteReason.trim());
      setDeleteId(null);
      setDeleteReason('');
      toast.success('Deletion request sent to admin');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to send deletion request');
    }
  };

  const handleUpdateProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedPhone = profilePhone.trim();
    if (trimmedName.length < 2) {
      toast.error('Please enter a valid name');
      return;
    }
    if (trimmedPhone && !/^[0-9+\s\-()]{7,15}$/.test(trimmedPhone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    try {
      await updateCurrentUser({
        name: trimmedName,
        phone: trimmedPhone,
      });

      if (trimmedPhone && trimmedPhone !== currentUser?.phone) {
        await createNotification({
          userId: currentUser.id,
          message: `Your contact phone number was updated to ${trimmedPhone}.`,
          type: 'PHONE_UPDATE',
        });
      } else {
        await createNotification({
          userId: currentUser.id,
          message: 'Your profile details were updated.',
          type: 'PROFILE_UPDATE',
        });
      }

      setProfileOpen(false);
      toast.success('Profile and phone number updated');
    } catch (e) {
      toast.error(e?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Owner Dashboard</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Manage your PG properties</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/saved-pgs')}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs"
            >
              <Heart size={15} /> Saved PGs
            </button>
            <button
              onClick={() => {
                setProfileName(currentUser?.name || '');
                setProfileOpen(true);
              }}
              className="flex-1 sm:flex-initial justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-xs"
            >
              <UserCog size={15} /> Update Profile
            </button>
            <button
              onClick={() => navigate('/owner/add')}
              className="w-full sm:w-auto justify-center btn-primary flex items-center gap-1.5 sm:gap-2 py-2.5 text-xs sm:text-sm shadow-md"
            >
              <Plus size={16} /> Add New PG
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 sm:p-5 border border-white`}>
              <div className={`text-2xl sm:text-3xl font-bold font-display ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs sm:text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* PG List */}
        {myPGs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <EmptyState
              title="No PGs listed yet"
              message="Start by adding your first property listing."
              icon={Home}
              actionLabel="Add New PG"
              onAction={() => navigate('/owner/add')}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {myPGs.map(pg => (
              <div
                key={pg.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row gap-3.5 sm:gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-primary-100 shrink-0">
                    {pg.images?.[0] ? (
                      <img src={pg.images[0]} alt={pg.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={22} className="text-primary-300" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {pg.title}
                        </h3>
                        <p className="text-slate-500 text-xs mt-0.5 truncate">
                          {pg.location.area}, {pg.location.city}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusPill status={pg.status} />
                        {pg.status === 'approved' && (
                          <VerifiedBadge isVerified={pg.isVerified} size="sm" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-primary-600 font-bold text-sm">
                        ₹{pg.price.toLocaleString('en-IN')}/mo
                      </span>
                      <span className="text-slate-400 text-xs">
                        · {pg.roomType} · {pg.genderPreference}
                      </span>
                    </div>

                    {pg.rejectionReason && (
                      <p className="text-red-500 text-xs mt-2 bg-red-50 px-3 py-1.5 rounded-lg">
                        Rejection reason: {pg.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex sm:flex-col items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <button
                    onClick={() => navigate(`/owner/edit/${pg.id}`)}
                    className="flex-1 sm:flex-initial w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(pg.id)}
                    className="flex-1 sm:flex-initial w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!deleteId} onClose={() => { setDeleteId(null); setDeleteReason(''); }} title="Delete PG"
        onConfirm={handleDelete} confirmText="Send Request" confirmVariant="danger">
        <p className="text-slate-600 text-sm mb-3">Delete requires admin approval. Please provide the reason for deletion.</p>
        <textarea
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          rows={4}
          className="input-field resize-none text-sm"
          placeholder="Example: Property lease ended, listing is no longer active."
        />
      </Modal>

      <Modal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Update Profile"
        onConfirm={handleUpdateProfile}
        confirmText="Save Changes"
        confirmVariant="primary"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="input-field text-sm"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className="input-field text-sm"
              placeholder="e.g. +91 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              value={currentUser?.email || ''}
              disabled
              className="input-field text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
