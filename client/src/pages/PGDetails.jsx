import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Phone,
  MessageCircle,
  Heart,
  Flag,
  Wifi,
  Utensils,
  AirVent,
  Car,
  ShowerHead,
  Camera,
  Droplets,
  Dumbbell,
  Home,
  ChevronRight,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Star,
  PenLine,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import VerifiedBadge from "../components/ui/VerifiedBadge";
import Modal from "../components/ui/Modal";
import { StarRating } from "../components/ui/index.jsx";
import { generatePGInsightsWithAI } from "../services/aiService";

const AMENITY_ICONS = {
  WiFi: Wifi,
  Food: Utensils,
  AC: AirVent,
  Parking: Car,
  Laundry: ShowerHead,
  CCTV: Camera,
  Water: Droplets,
  Gym: Dumbbell,
};

export default function PGDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getPGById,
    savePGToggle,
    getSavedPGs,
    addReview,
    reportPG,
    getPGReviews,
    users,
  } = useData();
  const { currentUser } = useAuth();

  const pg = getPGById(id);
  const [mainImg, setMainImg] = useState(0);
  const [activeTab, setActiveTab] = useState("reviews");
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAiInsight, setLoadingAiInsight] = useState(false);

  useEffect(() => {
    if (pg?.id) {
      setLoadingAiInsight(true);
      generatePGInsightsWithAI(pg)
        .then((res) => setAiInsight(res))
        .catch((err) => console.error("AI Insight error:", err))
        .finally(() => setLoadingAiInsight(false));
    }
  }, [pg?.id]);

  const handleRefreshAiInsight = async () => {
    if (!pg || loadingAiInsight) return;
    setLoadingAiInsight(true);
    try {
      const res = await generatePGInsightsWithAI(pg);
      setAiInsight(res);
      toast.success("AI insights refreshed!");
    } catch {
      toast.error("Could not refresh AI insights");
    } finally {
      setLoadingAiInsight(false);
    }
  };

  if (!pg)
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            PG not found
          </h2>
          <button
            onClick={() => navigate("/find-pg")}
            className="btn-primary mt-4"
          >
            Browse PGs
          </button>
        </div>
      </div>
    );

  const savedPGs = currentUser ? getSavedPGs(currentUser.id) : [];
  const isSaved = savedPGs.some((s) => s.id === pg.id);
  const reviews = getPGReviews(pg.id);
  const owner = users?.find((u) => u.id === pg.ownerId);
  const isOwnPG = !!currentUser?.id && String(currentUser.id) === String(pg.ownerId);

  // Resolve real owner name & phone number from all available sources
  const ownerName =
    (isOwnPG && currentUser?.name) ||
    owner?.name ||
    pg?.ownerName ||
    pg?.profiles?.full_name ||
    'Property Owner';
  const ownerInitial = (ownerName && ownerName !== 'Property Owner' ? ownerName.charAt(0) : (isOwnPG ? currentUser?.name?.charAt(0) : 'P')).toUpperCase();
  const rawContactPhone =
    pg?.contactNumber ||
    pg?.contact_number ||
    (isOwnPG && currentUser?.phone) ||
    owner?.phone ||
    pg?.profiles?.phone ||
    '+919876543210';
  const canReview = !isOwnPG;
  const formatPrice = (p) => new Intl.NumberFormat("en-IN").format(p);

  const handleOpenReview = () => {
    if (!currentUser) {
      toast("Please log in to write a review", { icon: "🔒" });
      navigate("/login", { state: { from: `/pg/${pg.id}` } });
      return;
    }
    if (isOwnPG) {
      toast.error("You cannot review your own PG listing.");
      return;
    }
    setReviewOpen(true);
  };

  const handleSave = () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    savePGToggle(currentUser.id, pg.id);
    toast.success(isSaved ? "Removed from saved" : "Saved!");
  };

  const handleReport = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!reportReason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    try {
      await reportPG(pg.id, currentUser?.id, reportReason);
      setReportOpen(false);
      setReportReason("");
      toast.success("Report submitted to admin");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit report");
    }
  };

  const handleReview = async () => {
    if (!currentUser) {
      navigate("/login", { state: { from: `/pg/${pg.id}` } });
      return;
    }
    if (isOwnPG) {
      toast.error("You can't review your own PG");
      return;
    }
    if (!reviewComment.trim()) {
      toast.error("Please share a brief comment about your experience");
      return;
    }
    setSubmittingReview(true);
    try {
      await addReview(
        pg.id,
        currentUser.id,
        currentUser.name || "Student",
        reviewRating,
        reviewComment.trim(),
      );
      setReviewOpen(false);
      setReviewComment("");
      setReviewRating(5);
      toast.success("Review submitted! Thank you for your feedback.");
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Failed to submit review",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length
      ? Math.round(
          (reviews.filter((r) => r.rating === star).length / reviews.length) *
            100,
        )
      : 0,
  }));

  const sortedReviews = [...reviews].sort((a, b) => {
    const timeA = new Date(a.rawCreatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.rawCreatedAt || b.createdAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return Number(b.rating || 0) - Number(a.rating || 0);
  });

  const realAvgRating = reviews.length > 0
    ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1))
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 lg:pt-24">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm text-slate-500">
          <button
            onClick={() => navigate("/")}
            className="hover:text-primary-600"
          >
            Home
          </button>
          <ChevronRight size={14} />
          <button
            onClick={() => navigate("/find-pg")}
            className="hover:text-primary-600"
          >
            Find PG
          </button>
          <ChevronRight size={14} />
          <span className="text-slate-800 font-medium truncate">
            {pg.title}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div className="space-y-8">
            {/* Gallery */}
            <div className="mb-4">
              <div className="aspect-video max-h-[420px] rounded-2xl overflow-hidden bg-primary-100 mb-3">
                {pg.images?.[mainImg] ? (
                  <img
                    src={pg.images[mainImg]}
                    alt={pg.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Home size={60} className="text-primary-300" />
                  </div>
                )}
              </div>
              {pg.images?.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {pg.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setMainImg(i)}
                      className={`flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === mainImg ? "border-primary-600 shadow-md" : "border-transparent opacity-70 hover:opacity-100"}`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                {pg.status === "approved" && (
                  <div className="mb-3 flex items-center gap-2.5 flex-wrap">
                    <VerifiedBadge isVerified={pg.isVerified} size="md" />
                    {!pg.isVerified && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        Ownership documents pending verification
                      </span>
                    )}
                  </div>
                )}
                <h1 className="font-display text-3xl font-bold text-slate-900 mb-3">
                  {pg.title}
                </h1>
                <div className="flex items-center gap-1.5 text-slate-500 mb-4">
                  <MapPin size={16} className="text-primary-500" />
                  <span>
                    {pg.location.city} · {pg.location.area} ·{" "}
                    {pg.location.address}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-primary-600 font-bold text-2xl">
                    ₹{formatPrice(pg.price)}
                    <span className="text-slate-400 font-normal text-sm">
                      /month
                    </span>
                  </span>
                  <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                    {pg.roomType} Room
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm">
                    {pg.genderPreference}
                  </span>
                  {reviews.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("reviews")}
                      className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <Star size={13} className="text-[#f5a623] fill-[#f5a623]" />
                      <span>{realAvgRating.toFixed(1)}</span>
                      <span className="text-amber-700/70 font-normal">({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium">
                      ★ New Listing
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">
                  About this PG
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {pg.description}
                </p>
              </div>

              {/* ✨ Alaya AI Insights & Smart Summary */}
              <div className="border-t border-slate-100 pt-6">
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white p-5 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles size={14} className="text-amber-300" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">Alaya AI Insights</h3>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                        Smart Summary
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshAiInsight}
                      disabled={loadingAiInsight}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={12} className={loadingAiInsight ? "animate-spin" : ""} />
                      {loadingAiInsight ? "Refreshing..." : "Refresh Insight"}
                    </button>
                  </div>

                  {aiInsight ? (
                    <div className="space-y-3 text-xs">
                      <div className="bg-white/90 border border-indigo-100 rounded-xl p-3 shadow-2xs">
                        <span className="font-semibold text-indigo-950 block mb-1 text-[11px] uppercase tracking-wide">
                          🎯 Best Fit:
                        </span>
                        <p className="text-slate-700 leading-relaxed">{aiInsight.bestFor}</p>
                      </div>

                      {aiInsight.highlights?.length > 0 && (
                        <div>
                          <span className="font-semibold text-indigo-950 block mb-1.5 text-[11px] uppercase tracking-wide">
                            ✨ Key Highlights:
                          </span>
                          <ul className="space-y-1.5">
                            {aiInsight.highlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-2 text-slate-600 leading-relaxed">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiInsight.sikkimTip && (
                        <div className="bg-amber-50/90 border border-amber-200/70 rounded-xl p-3 text-amber-900 flex items-start gap-2.5">
                          <span className="text-base shrink-0">💡</span>
                          <p className="leading-relaxed text-[11px]">
                            <strong className="font-semibold">Local Sikkim Tip:</strong> {aiInsight.sikkimTip}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <RefreshCw size={13} className="animate-spin text-primary-600" />
                      Analyzing PG amenities & location with Gemini AI...
                    </div>
                  )}
                </div>
              </div>

              {/* Amenities */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-semibold text-slate-900 mb-4">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pg.amenities.map((a) => {
                    const Icon = AMENITY_ICONS[a] || Home;
                    return (
                      <div
                        key={a}
                        className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                      >
                        <Icon size={16} className="text-primary-600" />
                        <span className="text-sm font-medium text-slate-700">
                          {a}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-slate-100 pt-6">
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
                  {[
                    { id: "reviews", label: `Reviews (${reviews.length})` },
                    { id: "rules", label: "Rules" },
                    { id: "location", label: "Location" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                        activeTab === tab.id
                          ? "bg-white text-primary-600 shadow-sm font-semibold"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "reviews" && (
                  <div>
                    {/* Reviews Header Bar with Action Button */}
                    <div className="flex items-center justify-between gap-4 mb-6 flex-wrap pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          Student & Tenant Reviews
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Authentic experiences and ratings from students who stayed here
                        </p>
                      </div>

                      {!isOwnPG && reviews.length > 0 && (
                        <button
                          type="button"
                          onClick={handleOpenReview}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0f2547] to-primary-700 hover:from-primary-900 hover:to-primary-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer"
                        >
                          <PenLine size={14} className="text-[#f5a623]" />
                          Write a Review
                        </button>
                      )}
                      {isOwnPG && (
                        <span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
                          Property Owner (Tenants can review your PG)
                        </span>
                      )}
                    </div>

                    {reviews.length > 0 && (
                      <div className="flex gap-8 mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-center min-w-[120px]">
                          <div className="text-5xl font-bold font-display text-slate-900">
                            {realAvgRating.toFixed(1)}
                          </div>
                          <div className="flex justify-center mt-1">
                            <StarRating
                              rating={Math.round(realAvgRating)}
                            />
                          </div>
                          <p className="text-slate-500 text-xs mt-1">
                            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                          </p>
                        </div>
                        <div className="flex-1 space-y-2">
                          {ratingBreakdown.map((rb) => (
                            <div
                              key={rb.star}
                              className="flex items-center gap-3"
                            >
                              <span className="text-xs text-slate-500 w-4">
                                {rb.star}★
                              </span>
                              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all"
                                  style={{ width: `${rb.pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-6">
                                {rb.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {sortedReviews.map((r, idx) => (
                        <div
                          key={r.id}
                          className="p-5 bg-white rounded-xl border border-slate-100 shadow-2xs hover:border-slate-200 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                                {r.userName?.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-slate-900 text-sm">
                                    {r.userName}
                                  </p>
                                  {idx === 0 && (
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                                      Newest Review
                                    </span>
                                  )}
                                  {r.rating === 5 && idx > 0 && (
                                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                      Top Rated
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-400 text-xs">
                                  {r.createdAt}
                                </p>
                              </div>
                            </div>
                            <StarRating rating={r.rating} size="sm" />
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {r.comment}
                          </p>
                        </div>
                      ))}

                      {reviews.length === 0 && (
                        <div className="text-center py-12 px-6 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-100 text-[#f5a623]">
                            <Star size={28} className="fill-[#f5a623]" />
                          </div>
                          <h4 className="font-bold text-slate-900 text-base mb-1">
                            No reviews yet for this PG
                          </h4>
                          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-5 leading-relaxed">
                            Have you stayed here or visited this property? Be the first to share your honest experience with food, amenities, and host to help fellow students!
                          </p>
                          {!isOwnPG ? (
                            <button
                              type="button"
                              onClick={handleOpenReview}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0f2547] to-primary-700 hover:from-primary-900 hover:to-primary-800 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                            >
                              <PenLine size={15} className="text-[#f5a623]" />
                              Write the First Review
                            </button>
                          ) : (
                            <p className="text-xs text-slate-400">
                              Reviews from tenants will appear here as soon as they are submitted.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {activeTab === "rules" && (
                  <div className="space-y-3 text-sm text-slate-600">
                    {(pg.rules || []).length > 0 ? (
                      pg.rules.map((rule) => (
                        <div
                          key={rule}
                          className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl"
                        >
                          <span className="text-primary-500 font-bold">*</span>{" "}
                          {rule}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm py-2">
                        No custom rules added by owner.
                      </p>
                    )}
                  </div>
                )}
                {activeTab === "location" && (
                  <div className="bg-slate-100 rounded-2xl h-64 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin
                        size={32}
                        className="text-primary-400 mx-auto mb-3"
                      />
                      <p className="font-medium text-slate-700">
                        {pg.location.address}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        {pg.location.area}, {pg.location.city}
                      </p>
                      <a
                        href={`https://maps.google.com?q=${encodeURIComponent(pg.location.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-block text-primary-600 text-sm hover:underline"
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
              {/* Owner */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">
                  Property Owner
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0f2547] text-[#f5a623] flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                    {ownerInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {ownerName}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {rawContactPhone ? `Verified Host · ${rawContactPhone}` : 'Property Owner'}
                    </p>
                  </div>
                </div>
              </div>
              <hr className="border-slate-100" />

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  Contact Owner
                </p>
                <div className="space-y-3">
                  <a
                    href={`tel:${rawContactPhone}`}
                    className="w-full flex items-center justify-center gap-2 bg-[#0f2547] hover:bg-[#16335d] text-white font-medium py-3 rounded-xl transition-colors text-sm shadow-xs"
                  >
                    <Phone size={16} /> Call Owner
                  </a>
                  <a
                    href={`https://wa.me/${rawContactPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium py-3 rounded-xl transition-colors text-sm"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                </div>
              </div>
              <hr className="border-slate-100" />

              <button
                onClick={handleSave}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                  isSaved
                    ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                    : "border-slate-200 text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                }`}
              >
                <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
                {isSaved ? "Saved ✓" : "Save Property"}
              </button>

              {!isOwnPG && (
                <button
                  type="button"
                  onClick={handleOpenReview}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 hover:border-primary-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-primary-600 font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
                >
                  <Star size={15} className="text-[#f5a623] fill-[#f5a623]" />
                  Write a Review
                </button>
              )}

              <div className="text-center">
                <button
                  onClick={() => {
                    if (!currentUser) {
                      navigate("/login");
                      return;
                    }
                    setReportOpen(true);
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1.5 mx-auto transition-colors"
                >
                  <Flag size={12} /> Report this listing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Bottom Contact Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div>
          <span className="text-xs text-slate-500 block">Rent</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900 font-display">₹{formatPrice(pg.price)}</span>
            <span className="text-[11px] text-slate-500">/mo</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className={`p-2.5 rounded-xl border transition-colors ${
              isSaved
                ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title={isSaved ? "Saved" : "Save"}
          >
            <Heart size={16} fill={isSaved ? "currentColor" : "none"} />
          </button>
          <a
            href={`tel:${pg.contactNumber}`}
            className="flex items-center justify-center gap-1.5 bg-primary-600 active:bg-primary-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-xs sm:text-sm shadow-sm"
          >
            <Phone size={15} /> Call
          </a>
          <a
            href={`https://wa.me/${pg.contactNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 bg-emerald-600 active:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-xs sm:text-sm shadow-sm"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>
      </div>

      {/* Report Modal */}
      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this Listing"
        onConfirm={handleReport}
        confirmText="Submit Report"
        confirmVariant="danger"
      >
        <p className="text-sm text-slate-600 mb-4">
          Please describe the issue with this listing.
        </p>
        <textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          rows={4}
          placeholder="Describe the issue..."
          className="input-field resize-none text-sm"
        />
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewOpen}
        onClose={() => !submittingReview && setReviewOpen(false)}
        title="Write a Review"
        onConfirm={handleReview}
        confirmText={submittingReview ? "Submitting..." : "Submit Review"}
        confirmVariant="primary"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-800">
                Your Rating
              </label>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {{ 5: '5 ★ Excellent', 4: '4 ★ Very Good', 3: '3 ★ Good', 2: '2 ★ Fair', 1: '1 ★ Poor' }[reviewRating] || `${reviewRating} Stars`}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
              <StarRating
                rating={reviewRating}
                interactive
                size="lg"
                onChange={setReviewRating}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Your Review & Experience
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
              placeholder="Tell other students about the room quality, cleanliness, WiFi, food, host behaviour, and overall stay..."
              className="input-field resize-none text-sm"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
              <span>Helpful reviews get highlighted for other students</span>
              <span>{reviewComment.length}/500</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
