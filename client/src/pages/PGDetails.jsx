import { useState } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { useData } from "../hooks/useData";
import { useAuth } from "../hooks/useAuth";
import VerifiedBadge from "../components/ui/VerifiedBadge";
import Modal from "../components/ui/Modal";
import { StarRating } from "../components/ui/index.jsx";

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
  const owner = users.find((u) => u.id === pg.ownerId);
  const isOwnPG = !!currentUser?.id && currentUser.id === pg.ownerId;
  const canReview =
    !!currentUser &&
    !isOwnPG &&
    (currentUser.role === "user" || currentUser.role === "owner");
  const formatPrice = (p) => new Intl.NumberFormat("en-IN").format(p);

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
      navigate("/login");
      return;
    }
    if (isOwnPG) {
      toast.error("You can't review your own PG");
      return;
    }
    if (reviewComment.trim().length < 10) {
      toast.error("Comment must be at least 10 characters");
      return;
    }
    try {
      await addReview(
        pg.id,
        currentUser.id,
        currentUser.name,
        reviewRating,
        reviewComment,
      );
      setReviewOpen(false);
      setReviewComment("");
      setReviewRating(5);
      toast.success("Review submitted!");
    } catch (e) {
      toast.error(
        e?.response?.data?.message || e.message || "Failed to submit review",
      );
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  {["reviews", "rules", "location"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-white text-primary-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {activeTab === "reviews" && (
                  <div>
                    {reviews.length > 0 && (
                      <div className="flex gap-8 mb-6 p-5 bg-slate-50 rounded-2xl">
                        <div className="text-center">
                          <div className="text-5xl font-bold font-display text-slate-900">
                            {pg.averageRating || 0}
                          </div>
                          <StarRating
                            rating={Math.round(pg.averageRating || 0)}
                          />
                          <p className="text-slate-500 text-xs mt-1">
                            {pg.totalReviews} reviews
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
                    {canReview && (
                      <button
                        onClick={() => setReviewOpen(true)}
                        className="btn-primary text-sm mb-6"
                      >
                        Write a Review
                      </button>
                    )}
                    {isOwnPG && (
                      <p className="text-slate-500 text-sm mb-6">
                        You can't review your own listed PG.
                      </p>
                    )}
                    <div className="space-y-4">
                      {reviews.map((r) => (
                        <div
                          key={r.id}
                          className="p-5 bg-white rounded-xl border border-slate-100"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                                {r.userName?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 text-sm">
                                  {r.userName}
                                </p>
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
                        <p className="text-slate-500 text-sm py-4">
                          No reviews yet. Be the first!
                        </p>
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
                  <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                    {owner?.name?.charAt(0) || "O"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {owner?.name || "Owner"}
                    </p>
                    <p className="text-slate-500 text-xs">Property Owner</p>
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
                    href={`tel:${pg.contactNumber}`}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
                  >
                    <Phone size={16} /> Call Owner
                  </a>
                  <a
                    href={`https://wa.me/${pg.contactNumber.replace(/\D/g, "")}`}
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
        onClose={() => setReviewOpen(false)}
        title="Write a Review"
        onConfirm={handleReview}
        confirmText="Submit Review"
        confirmVariant="primary"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rating
            </label>
            <StarRating
              rating={reviewRating}
              interactive
              size="lg"
              onChange={setReviewRating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comment
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
              placeholder="Share your experience..."
              className="input-field resize-none text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
