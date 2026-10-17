// PGCard.jsx - Styled exactly to match Stay Aalaya Google Sites design
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, Home, ShieldCheck, ShieldAlert, Zap, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import StatusPill from './StatusPill';

export default function PGCard({ pg, showStatus = false, includeMess = false }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { savePGToggle, getSavedPGs } = useData();

  const savedPGs = currentUser ? getSavedPGs(currentUser.id) : [];
  const isSaved = savedPGs.some((s) => s.id === pg.id);

  const handleSave = (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    savePGToggle(currentUser.id, pg.id);
  };

  const formatPrice = (price) => new Intl.NumberFormat('en-IN').format(price);

  const basePrice = Number(pg.base_price ?? pg.price ?? pg.rent ?? 0);
  const messPrice = Number(pg.mess_price ?? 0);
  const displayPrice = includeMess && messPrice > 0 ? basePrice + messPrice : basePrice;

  const area = pg.locality || pg.location?.area || 'Gangtok';
  const city = pg.city || pg.location?.city || 'Sikkim';
  const roomType = pg.room_type || pg.roomType || 'Double Sharing';
  const gender = pg.category || pg.genderPreference || 'Co-ed';
  
  // Real distance to taxi stand (only if explicitly provided in database)
  const taxiMinutes = typeof pg.distance_to_taxi === 'number'
    ? pg.distance_to_taxi
    : parseInt(String(pg.distance_to_taxi || pg.distanceToTaxi || '')) || null;
  const taxiWalkText = pg.distance_to_taxi_label || (taxiMinutes ? `${taxiMinutes} mins walk to Taxi Stand` : null);

  // Real feature highlight pill (only if owner actually added highlight text)
  const highlightTag = pg.highlight && String(pg.highlight).trim() ? String(pg.highlight).trim() : null;

  const bedsLeft = pg.beds_left ?? pg.availableBeds ?? 0;
  const totalReviews = Number(pg.totalReviews ?? pg.total_reviews ?? 0);
  const rating = totalReviews > 0 ? Number(pg.averageRating ?? pg.rating ?? pg.average_rating ?? 0) : 0;
  const amenitiesList = Array.isArray(pg.amenities) ? pg.amenities.filter(Boolean) : [];

  return (
    <div
      onClick={() => navigate(`/pg/${pg.id}`)}
      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-[#f5a623]/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      {/* 1. Image Thumbnail Area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {pg.images?.[0] ? (
          <img
            src={pg.images[0]}
            alt={pg.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f2547] to-[#1e3e62] text-white">
            <Home size={38} className="text-[#f5a623] opacity-60" />
          </div>
        )}

        {/* Ambient Dark Gradient on bottom of photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/25 opacity-90" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          {pg.isVerified ? (
            <span className="inline-flex items-center gap-1 bg-emerald-600/90 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              <ShieldCheck size={11} className="text-white" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-500/95 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
              <ShieldAlert size={11} className="text-white" /> Not Verified
            </span>
          )}
          {bedsLeft > 0 && (
            <span className="bg-[#f5a623] text-slate-950 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              {bedsLeft} {bedsLeft === 1 ? 'Bed' : 'Beds'} Left
            </span>
          )}
        </div>

        {showStatus && (
          <div className="absolute top-2.5 right-12">
            <StatusPill status={pg.status} />
          </div>
        )}

        {/* Save Heart Button */}
        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Unsave property' : 'Save property'}
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-sm ${
            isSaved
              ? 'bg-red-500 text-white'
              : 'bg-white/90 text-slate-700 hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart size={13} fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {/* Bottom Taxi Stand Walk or Location Badge */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white">
          <span className="inline-flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10.5px] font-medium border border-white/15">
            {taxiWalkText ? (
              <>
                <Zap size={11} className="text-[#f5a623] fill-[#f5a623]" />
                <span className="truncate">{taxiWalkText}</span>
              </>
            ) : (
              <>
                <MapPin size={11} className="text-[#f5a623]" />
                <span className="truncate">{area}, {city}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 2. Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Row 1: Category & Rating */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
              {gender} • {roomType}
            </span>
            {rating > 0 && totalReviews > 0 ? (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                <Star size={11} className="text-[#f5a623] fill-[#f5a623]" />
                <span className="text-amber-900 text-xs font-bold">{rating.toFixed(1)}</span>
                <span className="text-amber-700/70 text-[10px]">({totalReviews})</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50/90 border border-amber-200/70 px-2 py-0.5 rounded-full">
                ★ New Listing
              </span>
            )}
          </div>

          {/* Row 2: Title */}
          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-[#0f2547] transition-colors">
            {pg.title}
          </h3>

          {/* Row 3: Locality & Landmark */}
          <div className="flex items-center gap-1 text-slate-500 text-xs mt-1 mb-2">
            <MapPin size={12} className="text-[#0f2547] shrink-0" />
            <span className="truncate font-medium">{area}</span>
            <span className="text-slate-300">•</span>
            <span className="truncate text-slate-400">{pg.location?.address || `${city}`}</span>
          </div>

          {/* Row 4: Feature Highlight Pill (strictly only if owner added real highlight) */}
          {highlightTag && (
            <div className="bg-amber-50/90 border border-amber-200/80 text-amber-950 px-2.5 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1.5 mb-2.5 w-fit">
              <Sun size={12} className="text-[#f5a623] shrink-0" />
              <span className="truncate">{highlightTag}</span>
            </div>
          )}

          {/* Row 5: Amenity Chips (strictly only if amenities were added) */}
          {amenitiesList.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {amenitiesList.slice(0, 2).map((am, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium truncate max-w-[110px]"
                >
                  {am}
                </span>
              ))}
              {amenitiesList.length > 2 && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
                  +{amenitiesList.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Row 6: Price & CTA Footer */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-base font-black text-[#0f2547]">
                ₹{formatPrice(displayPrice)}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">/mo</span>
            </div>
            {includeMess && messPrice > 0 && (
              <span className="text-[9.5px] text-emerald-700 font-semibold block">
                Includes Mess (₹{formatPrice(messPrice)})
              </span>
            )}
          </div>

          <span className="text-xs font-bold text-[#0f2547] group-hover:text-[#f5a623] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
            Explore →
          </span>
        </div>
      </div>
    </div>
  );
}
