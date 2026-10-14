// PGCard.jsx
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, Home, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import VerifiedBadge from './VerifiedBadge';
import StatusPill from './StatusPill';

export default function PGCard({ pg, showStatus = false }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { savePGToggle, getSavedPGs } = useData();

  const savedPGs = currentUser ? getSavedPGs(currentUser.id) : [];
  const isSaved = savedPGs.some(s => s.id === pg.id);

  const handleSave = (e) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
    savePGToggle(currentUser.id, pg.id);
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price);

  return (
    <div
      onClick={() => navigate(`/pg/${pg.id}`)}
      className="card cursor-pointer group rounded-3xl overflow-hidden hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-900/10 transition-all duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary-100 via-white to-cyan-100">
        {pg.images?.[0] ? (
          <img src={pg.images[0]} alt={pg.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home size={40} className="text-primary-400" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-slate-900/5 to-transparent opacity-80" />

        <div className="absolute top-3 left-3">
          {pg.status === 'approved' && (
            <VerifiedBadge isVerified={pg.isVerified} size="sm" />
          )}
        </div>

        {showStatus && (
          <div className="absolute top-3 right-10">
            <StatusPill status={pg.status} />
          </div>
        )}

        <button
          onClick={handleSave}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all ${
            isSaved ? 'bg-red-500 text-white shadow-md' : 'bg-white/85 text-slate-600 hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart size={15} fill={isSaved ? 'white' : 'none'} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2 group-hover:text-primary-600 transition-colors">
            {pg.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <MapPin size={12} className="text-primary-400 shrink-0" />
          <span className="truncate">{pg.location.area}, {pg.location.city}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-primary-700 font-bold text-base">\u20B9{formatPrice(pg.price)}<span className="text-slate-400 font-normal text-xs">/mo</span></span>
          {pg.averageRating > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-amber-700 text-xs font-semibold">{pg.averageRating}</span>
              <span className="text-amber-500 text-xs">({pg.totalReviews})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-medium">{pg.roomType}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1">
            <Users size={10} /> {pg.genderPreference}
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Tap to view details</span>
          <span className="text-xs font-semibold text-primary-600 group-hover:translate-x-1 transition-transform">Explore</span>
        </div>
      </div>
    </div>
  );
}
