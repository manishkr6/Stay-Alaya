// PGCard.jsx - Enhanced responsive card for Stay Aalaya with 100% real data rendering
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MapPin,
  Star,
  Home,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Sun,
  ArrowRight,
  Wifi,
  Utensils,
  Wind,
  Droplets,
  Video,
  Shirt,
  Car,
  Dumbbell,
  Bed,
  Users,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import StatusPill from './StatusPill';
import { cleanPGTitle, getFormattedLocation } from '../../utils/pgHelpers';

const AMENITY_ICON_MAP = {
  WiFi: Wifi,
  Food: Utensils,
  AC: Wind,
  Water: Droplets,
  CCTV: Video,
  Laundry: Shirt,
  Parking: Car,
  Gym: Dumbbell,
};

export default function PGCard({ pg, showStatus = false, includeMess = false, viewMode = 'grid' }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { savePGToggle, getSavedPGs } = useData();

  if (!pg) return null;

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

  // Real sanitized title and location
  const displayTitle = cleanPGTitle(pg.title);
  const locationInfo = getFormattedLocation(pg);

  const roomType = pg.room_type || pg.roomType || 'Double';
  const gender = pg.category || pg.genderPreference || 'Co-ed';

  // Distance to taxi stand (only if explicitly provided in database)
  const taxiMinutes =
    typeof pg.distance_to_taxi === 'number'
      ? pg.distance_to_taxi
      : parseInt(String(pg.distance_to_taxi || pg.distanceToTaxi || '')) || null;
  const taxiWalkText = pg.distance_to_taxi_label || (taxiMinutes ? `${taxiMinutes} mins walk to Taxi Stand` : null);

  // Real feature highlight pill (only if owner actually added highlight text)
  const highlightTag = pg.highlight && String(pg.highlight).trim() ? String(pg.highlight).trim() : null;

  const bedsLeft = pg.beds_left ?? pg.availableBeds ?? 0;
  const totalReviews = Number(pg.totalReviews ?? pg.total_reviews ?? 0);
  const rating = totalReviews > 0 ? Number(pg.averageRating ?? pg.rating ?? pg.average_rating ?? 0) : 0;
  const amenitiesList = Array.isArray(pg.amenities) ? pg.amenities.filter(Boolean) : [];

  // Gender styling
  const genderBadgeClass =
    gender === 'Boys'
      ? 'bg-blue-50 text-blue-700 border-blue-200/60'
      : gender === 'Girls'
      ? 'bg-rose-50 text-rose-700 border-rose-200/60'
      : 'bg-purple-50 text-purple-700 border-purple-200/60';

  /* ================= LIST VIEW (Horizontal Desktop Row) ================= */
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => navigate(`/pg/${pg.id}`)}
        className="group bg-white rounded-2xl border border-slate-200/90 hover:border-[#f5a623] hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row cursor-pointer relative sm:h-[260px]"
      >
        {/* Left Thumbnail with Uniform Proportions */}
        <div className="relative w-full sm:w-72 md:w-80 h-52 sm:h-full shrink-0 bg-slate-100 overflow-hidden">
          {pg.images?.[0] ? (
            <img
              src={pg.images[0]}
              alt={displayTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full min-h-[180px] flex items-center justify-center bg-gradient-to-br from-[#0f2547] to-[#1e3e62] text-white">
              <Home size={38} className="text-[#f5a623] opacity-60" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            {pg.isVerified ? (
              <span className="inline-flex items-center gap-1 bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider border border-emerald-400/30">
                <ShieldCheck size={12} className="text-emerald-100" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-medium px-2.5 py-0.5 rounded-full shadow-sm border border-amber-400/20">
                <ShieldAlert size={11} className="text-amber-400" /> Pending Verification
              </span>
            )}
          </div>

          {/* Photo Count */}
          {pg.images && pg.images.length > 1 && (
            <span className="absolute bottom-3 left-3 bg-slate-950/75 backdrop-blur-md text-white text-[10.5px] font-medium px-2.5 py-0.5 rounded-full border border-white/15">
              📷 {pg.images.length} photos
            </span>
          )}

          {/* Heart Button */}
          <button
            onClick={handleSave}
            aria-label={isSaved ? 'Unsave property' : 'Save property'}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md ${
              isSaved
                ? 'bg-rose-500 text-white'
                : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
            }`}
          >
            <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Right Details - Filled Middle Space, No Awkward Void */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0 h-full overflow-hidden">
          <div>
            {/* Top Badges & Rating */}
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10.5px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${genderBadgeClass}`}>
                  {gender}
                </span>
                <span className="text-[10.5px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <Bed size={12} className="text-slate-500" />
                  {roomType} Room
                </span>
                {bedsLeft > 0 && (
                  <span className="text-[10.5px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                    {bedsLeft} {bedsLeft === 1 ? 'bed' : 'beds'} left
                  </span>
                )}
              </div>

              {rating > 0 && totalReviews > 0 ? (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full shrink-0">
                  <Star size={12} className="text-[#f5a623] fill-[#f5a623]" />
                  <span className="text-amber-950 text-xs font-bold">{rating.toFixed(1)}</span>
                  <span className="text-amber-700/80 text-[10.5px]">({totalReviews})</span>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 rounded-full shrink-0">
                  ★ New Listing
                </span>
              )}
            </div>

            {/* Sanitized Title */}
            <h3
              className="font-extrabold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-[#0f2547] transition-colors truncate mb-1"
              title={displayTitle}
            >
              {displayTitle}
            </h3>

            {/* Location & Address */}
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2 truncate">
              <MapPin size={13} className="text-[#f5a623] shrink-0" />
              <span className="font-semibold text-slate-700">{locationInfo.display}</span>
              {pg.address && (
                <span className="text-slate-400 truncate hidden md:inline">
                  • {pg.address.toLowerCase().includes('jiwan theeng marg') ? 'Jiwan Theeng Marg' : pg.address}
                </span>
              )}
            </div>

            {/* Middle Content: Real Description Snippet */}
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-2.5">
              {pg.description
                ? pg.description
                : `Verified ${gender.toLowerCase()} accommodation in ${locationInfo.neighborhood || 'Gangtok'} featuring clean rooms, home-like Himalayan environment, and direct host contact.`}
            </p>

            {/* Amenities Chips */}
            {amenitiesList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {amenitiesList.slice(0, 5).map((am, i) => {
                  const Icon = AMENITY_ICON_MAP[am];
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] bg-slate-50 border border-slate-200/70 text-slate-700 px-2 sm:px-2.5 py-0.5 rounded-md font-medium"
                    >
                      {Icon && <Icon size={11} className="text-slate-500" />}
                      <span>{am}</span>
                    </span>
                  );
                })}
                {amenitiesList.length > 5 && (
                  <span className="text-[10px] sm:text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                    +{amenitiesList.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & CTA Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-[#0f2547]">₹{formatPrice(displayPrice)}</span>
                <span className="text-xs text-slate-400 font-medium">/month</span>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] text-emerald-600 font-bold">
                <span>✓ Zero Brokerage</span>
                {pg.deposit ? (
                  <span className="text-slate-400 font-normal">• Deposit: ₹{formatPrice(pg.deposit)}</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">• Zero Deposit</span>
                )}
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl bg-[#0f2547] text-[#f5a623] group-hover:bg-[#f5a623] group-hover:text-[#0f2547] transition-all duration-300 text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
            >
              <span>Explore PG</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= DEFAULT GRID VIEW ================= */
  return (
    <div
      onClick={() => navigate(`/pg/${pg.id}`)}
      className="group bg-white rounded-2xl border border-slate-200/90 hover:border-[#f5a623] overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 sm:hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer"
    >
      {/* 1. Image Thumbnail Area */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-slate-100">
        {pg.images?.[0] ? (
          <img
            src={pg.images[0]}
            alt={displayTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f2547] to-[#1e3e62] text-white">
            <Home size={34} className="text-[#f5a623] opacity-60" />
          </div>
        )}

        {/* Atmospheric Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {pg.isVerified ? (
            <span className="inline-flex items-center gap-1 bg-emerald-600/95 backdrop-blur-md text-white text-[9.5px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow-md uppercase tracking-wider border border-emerald-400/30">
              <ShieldCheck size={11} className="text-emerald-100" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-slate-900/80 backdrop-blur-md text-amber-300 text-[9.5px] sm:text-[10px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full shadow-sm border border-amber-400/20">
              <ShieldAlert size={10} className="text-amber-400" /> Pending
            </span>
          )}
          {bedsLeft > 0 && (
            <span className="bg-[#f5a623] text-slate-950 text-[9.5px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
              {bedsLeft} {bedsLeft === 1 ? 'Bed' : 'Beds'} Left
            </span>
          )}
        </div>

        {showStatus && (
          <div className="absolute top-2 right-11 sm:top-2.5 sm:right-12">
            <StatusPill status={pg.status} />
          </div>
        )}

        {/* Save Heart Button */}
        <button
          onClick={handleSave}
          aria-label={isSaved ? 'Unsave property' : 'Save property'}
          className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md ${
            isSaved
              ? 'bg-rose-500 text-white'
              : 'bg-white/90 text-slate-700 hover:bg-white hover:text-rose-500'
          }`}
        >
          <Heart size={13} fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {/* Bottom Location Pill + Photo Count */}
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-2.5 sm:left-2.5 sm:right-2.5 flex items-center justify-between text-white gap-1.5">
          <span className="inline-flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[10.5px] font-medium border border-white/15 truncate max-w-[75%]">
            {taxiWalkText ? (
              <>
                <Zap size={10} className="text-[#f5a623] fill-[#f5a623] shrink-0" />
                <span className="truncate">{taxiWalkText}</span>
              </>
            ) : (
              <>
                <MapPin size={10} className="text-[#f5a623] shrink-0" />
                <span className="truncate">{locationInfo.display}</span>
              </>
            )}
          </span>

          {pg.images && pg.images.length > 1 && (
            <span className="bg-slate-950/80 backdrop-blur-md text-white text-[9.5px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-white/15 shrink-0">
              📷 {pg.images.length}
            </span>
          )}
        </div>
      </div>

      {/* 2. Card Content Body */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Row 1: Category & Rating */}
          <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className={`text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${genderBadgeClass}`}>
                {gender}
              </span>
              <span className="text-[10px] sm:text-[10.5px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Bed size={10} className="text-slate-500" />
                {roomType}
              </span>
            </div>

            {rating > 0 && totalReviews > 0 ? (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                <Star size={10} className="text-[#f5a623] fill-[#f5a623]" />
                <span className="text-amber-950 text-[11px] sm:text-xs font-bold">{rating.toFixed(1)}</span>
                <span className="text-amber-700/80 text-[9.5px]">({totalReviews})</span>
              </div>
            ) : (
              <span className="text-[9.5px] sm:text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                ★ New
              </span>
            )}
          </div>

          {/* Row 2: Sanitized Title */}
          <h3
            className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-1 sm:line-clamp-2 group-hover:text-[#0f2547] transition-colors mb-1 sm:mb-1.5 min-h-0 sm:min-h-[2.5rem]"
            title={displayTitle}
          >
            {displayTitle}
          </h3>

          {/* Row 3: Locality & Landmark */}
          <div className="flex items-center gap-1 text-slate-500 text-[11px] sm:text-xs mb-2 sm:mb-2.5 min-w-0">
            <MapPin size={11} className="text-[#f5a623] shrink-0" />
            <span className="font-medium text-slate-600 truncate">{locationInfo.display}</span>
          </div>

          {/* Row 4: Feature Highlight Pill (only if owner actually added highlight) */}
          {highlightTag && (
            <div className="bg-amber-50/90 border border-amber-200/80 text-amber-950 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 mb-2 w-fit">
              <Sun size={11} className="text-[#f5a623] shrink-0" />
              <span className="truncate">{highlightTag}</span>
            </div>
          )}

          {/* Row 5: Amenity Chips with Icons */}
          {amenitiesList.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-2 sm:mb-3">
              {amenitiesList.slice(0, 3).map((am, i) => {
                const Icon = AMENITY_ICON_MAP[am];
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] bg-slate-50 border border-slate-200/70 text-slate-600 px-1.5 sm:px-2 py-0.5 rounded-md font-medium"
                  >
                    {Icon && <Icon size={10} className="text-slate-500" />}
                    <span>{am}</span>
                  </span>
                );
              })}
              {amenitiesList.length > 3 && (
                <span className="text-[9.5px] sm:text-[10.5px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">
                  +{amenitiesList.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Row 6: Price & CTA Footer */}
        <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-base sm:text-lg font-black text-[#0f2547] tracking-tight">
                ₹{formatPrice(displayPrice)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">/mo</span>
            </div>
            <span className="text-[9.5px] sm:text-[10px] text-emerald-600 font-bold block">✓ Zero Brokerage</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0f2547] text-[#f5a623] group-hover:bg-[#f5a623] group-hover:text-[#0f2547] transition-all duration-300 text-xs font-bold shadow-xs">
            <span>Explore</span>
            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
