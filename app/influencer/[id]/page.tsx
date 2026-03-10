"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import type { Influencer, Review } from "@/app/types/influencer";
import { getInfluencerById } from "@/lib/influencers";
import { addReview, getReviews, voteReview, getStoredVote, canSubmitReview, setReviewReply, setReviewOwnerLike } from "@/lib/reviews";
import { addReport } from "@/lib/reports";
import { PRICE_RANGE_OPTIONS } from "@/lib/priceRange";
import { proxyImageUrl, getPlaceholderAvatar, getPlaceholderThumb, getInstagramAvatarUrl, getReviewerAvatarApiUrl, getInitialsAvatarUrl, normalizeInstagramUsername, getInstagramProfileUrl } from "@/lib/imageUrl";
import { getReelEmbedUrl } from "@/lib/reelEmbed";
import { getStoredInfluencerSession } from "@/lib/influencerAuth";

const REPORT_REASONS = [
  { value: "fake", label: "Yanıltıcı veya sahte değerlendirme" },
  { value: "inappropriate", label: "Hakaret veya uygunsuz içerik" },
  { value: "spam", label: "Reklam / spam" },
  { value: "copyright", label: "Telif veya kişilik hakkı ihlali" },
  { value: "other", label: "Diğer" },
] as const;

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".", ",") + "K";
  return String(n);
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const v = Math.min(max, Math.max(0, value));
  return (
    <span className="inline-flex gap-0.5 text-amber-500" aria-label={`${v} yıldız`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i}>{i < Math.floor(v) ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

const VerifiedBadge = () => (
  <span
    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/70"
    aria-label="Marka önyüzü onaylı"
  >
    <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3" aria-hidden>
      <circle cx="10" cy="10" r="9" className="fill-sky-500" />
      <path
        d="M6.5 10.3 8.9 12.7 13.5 7.8"
        stroke="white"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export default function InfluencerProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"icerikler" | "degerlendirmeler">("icerikler");

  const [formBusiness, setFormBusiness] = useState("");
  const [formStars, setFormStars] = useState(3);
  const [formComment, setFormComment] = useState("");
  const [formInstagram, setFormInstagram] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formPriceRange, setFormPriceRange] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetReview, setReportTargetReview] = useState<Review | null>(null);
  const [reportReason, setReportReason] = useState<string>("");
  const [reportReasonOther, setReportReasonOther] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [votingReviewId, setVotingReviewId] = useState<string | null>(null);
  const [canSubmitToday, setCanSubmitToday] = useState<boolean | null>(null);
  const degerlendirHandled = useRef(false);
  const [canReplyAsInfluencer, setCanReplyAsInfluencer] = useState(false);
  const [replyEditingId, setReplyEditingId] = useState<string | null>(null);
  const [replySavingId, setReplySavingId] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [showPendingNotice, setShowPendingNotice] = useState(false);
  const [ownerLikeLoadingId, setOwnerLikeLoadingId] = useState<string | null>(null);

  // Protokol yorumlarını istatistiklerin dışında tut
  const normalReviews = useMemo(
    () => reviews.filter((r) => !r.isProtocol),
    [reviews]
  );

  // Protokol yorumları en üstte, sonra normal yorumlar
  const orderedReviews = useMemo(() => {
    const protos = reviews.filter((r) => r.isProtocol);
    const normals = reviews.filter((r) => !r.isProtocol);
    return [...protos, ...normals];
  }, [reviews]);

  useEffect(() => {
    const onScroll = () => setHeaderSolid(window.scrollY > 180);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (id && searchParams.get("degerlendir") === "1" && !degerlendirHandled.current) {
      degerlendirHandled.current = true;
      setActiveTab("degerlendirmeler");
      setShowReviewForm(true);
      window.history.replaceState({}, "", `/influencer/${id}`);
    }
  }, [searchParams, id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    canSubmitReview(id)
      .then((ok) => { if (!cancelled) setCanSubmitToday(ok); })
      .catch(() => { if (!cancelled) setCanSubmitToday(true); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const session = getStoredInfluencerSession();
    if (session && session.influencerId === id) {
      setCanReplyAsInfluencer(true);
    } else {
      setCanReplyAsInfluencer(false);
    }
  }, [id]);

  useEffect(() => {
    if (!showReviewForm) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowReviewForm(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReviewForm]);

  useEffect(() => {
    if (!showReportModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReportModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getInfluencerById(id)
      .then((data) => {
        if (!cancelled) setInfluencer(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getReviews(id)
      .then((list) => {
        if (!cancelled) setReviews(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const avgRating = useMemo(() => {
    if (normalReviews.length === 0) return 0;
    const sum = normalReviews.reduce((a, r) => a + r.stars, 0);
    return Math.round((sum / normalReviews.length) * 10) / 10;
  }, [normalReviews]);

  const satisfactionPercent = useMemo(() => {
    if (normalReviews.length === 0) return 0;
    const fourPlus = normalReviews.filter((r) => r.stars >= 4).length;
    return Math.round((fourPlus / normalReviews.length) * 100);
  }, [normalReviews]);

  const starDistribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    normalReviews.forEach((r) => {
      if (r.stars >= 1 && r.stars <= 5) d[5 - r.stars]++;
    });
    return d;
  }, [normalReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const business = formBusiness.trim();
    const rawVideoUrl = formVideoUrl.trim();
    if (!business) {
      setSubmitError("Lütfen işletme ismini girin.");
      return;
    }
    if (!rawVideoUrl) {
      setSubmitError("İş birliği yaptığınız Instagram Reels video linki zorunludur.");
      return;
    }
    if (!getReelEmbedUrl(rawVideoUrl)) {
      setSubmitError("Lütfen geçerli bir Instagram Reels linki girin (https://www.instagram.com/reel/...).");
      return;
    }
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const instagramUsername = normalizeInstagramUsername(formInstagram);
      const review = await addReview(id, {
        businessName: business,
        stars: formStars,
        comment: formComment.trim() || undefined,
        instagramHandle: instagramUsername ? `@${instagramUsername}` : undefined,
        videoUrl: rawVideoUrl,
        priceRange: formPriceRange.trim() || undefined,
      });

      // İnceleme modu açıksa (status: pending) yorumu hemen göstermeyelim, sadece bilgilendirme gösterelim
      if (review.status === "pending") {
        setShowPendingNotice(true);
      } else {
        setReviews((prev) => [review, ...prev]);
      }
      setFormBusiness("");
      setFormStars(3);
      setFormComment("");
      setFormInstagram("");
      setFormVideoUrl("");
      setFormPriceRange("");
      setShowReviewForm(false);
      setCanSubmitToday(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Kayıt gönderilemedi.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const openReportModal = (review: Review) => {
    setReportTargetReview(review);
    setReportReason("");
    setReportReasonOther("");
    setReportDescription("");
    setReportError(null);
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportTargetReview(null);
    setReportReason("");
    setReportReasonOther("");
    setReportDescription("");
    setReportError(null);
  };

  const handleVote = async (r: Review, vote: "like" | "dislike") => {
    if (!id || votingReviewId) return;
    setVotingReviewId(r.id);
    try {
      const { likeCount, dislikeCount } = await voteReview(id, r.id, vote);
      setReviews((prev) => prev.map((rev) => (rev.id === r.id ? { ...rev, likeCount, dislikeCount } : rev)));
    } finally {
      setVotingReviewId(null);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reportTargetReview) return;
    const reasonText = reportReason === "other" ? reportReasonOther.trim() : REPORT_REASONS.find((r) => r.value === reportReason)?.label ?? reportReason;
    if (!reasonText) {
      setReportError("Lütfen bir rapor sebebi seçin veya yazın.");
      return;
    }
    setReportError(null);
    setReportSubmitting(true);
    try {
      const reviewSummary = [reportTargetReview.businessName, reportTargetReview.comment?.slice(0, 100)].filter(Boolean).join(" — ") || undefined;
      await addReport(id, reportTargetReview.id, {
        reason: reasonText,
        description: reportDescription.trim() || reasonText,
        reviewSummary,
      });
      closeReportModal();
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Rapor gönderilemedi.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleOwnerLikeToggle = async (r: Review) => {
    if (!id || !r.isProtocol || !canReplyAsInfluencer || ownerLikeLoadingId) return;
    setOwnerLikeLoadingId(r.id);
    const next = !r.ownerLiked;
    try {
      await setReviewOwnerLike(id, r.id, next);
      setReviews((prev) =>
        prev.map((rev) => (rev.id === r.id ? { ...rev, ownerLiked: next } : rev))
      );
    } finally {
      setOwnerLikeLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Yükleniyor...</p>
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-700">Profil bulunamadı.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  const thumbSrc = influencer.thumbnail
    ? proxyImageUrl(influencer.thumbnail)
    : getPlaceholderThumb();
  const avatarSrc = influencer.avatar
    ? proxyImageUrl(influencer.avatar)
    : getPlaceholderAvatar();
  const reels = influencer.reels ?? [];
  const handleStr = influencer.handle?.startsWith("@")
    ? influencer.handle
    : "@" + (influencer.handle ?? "");
  const isBrandFront = influencer.brandFront === true;
  const showVerifiedBadge = isBrandFront || influencer.verified === true;

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className={`fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b px-4 transition-[background-color,border-color,color] duration-300 sm:px-6 ${
          headerSolid
            ? "border-slate-200 bg-white"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="flex min-w-0 shrink items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition hover:opacity-90 ${
              headerSolid
                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                : "text-white/90 drop-shadow-md hover:bg-white/10 hover:text-white"
            }`}
            title="Ana sayfaya dön"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Ana sayfaya dön</span>
          </Link>
          <span className={`h-4 w-px ${headerSolid ? "bg-slate-200" : "bg-white/30"}`} aria-hidden />
          <Link
            href="/"
            className={`flex min-w-0 shrink items-center gap-2 transition hover:opacity-90 ${
              headerSolid ? "text-slate-700 hover:text-slate-900" : "drop-shadow-md"
            }`}
          >
            <span className="shrink-0 font-display text-xl font-extrabold tracking-tight">
              <span className={headerSolid ? "text-slate-900" : "text-white"}>Kim</span>
              <span
                className={`bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent ${headerSolid ? "" : "drop-shadow-sm"}`}
                style={{ WebkitTextFillColor: "transparent" }}
              >
                Getirdi
              </span>
            </span>
            <span className={`shrink-0 ${headerSolid ? "text-slate-400" : "text-white/70"}`}>·</span>
            <span
              className={`inline-flex w-max max-w-[110px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1 font-display text-xs font-bold leading-tight text-white shadow-sm sm:max-w-[130px] ${
                isBrandFront
                  ? "bg-gradient-to-r from-red-500 via-red-600 to-rose-600"
                  : "bg-gradient-to-r from-violet-600 to-purple-600"
              }`}
            >
              <span className="line-clamp-2 break-words text-center">{influencer.name}</span>
              {showVerifiedBadge && <VerifiedBadge />}
            </span>
          </Link>
        </div>
        <a
          href={influencer.instagramUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 transition hover:opacity-90 ${
            headerSolid ? "text-slate-600 hover:text-slate-900" : "text-white drop-shadow-md"
          }`}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span className="text-sm font-medium">Instagram</span>
        </a>
      </header>

      {/* Hero — tam genişlik, uzun thumbnail */}
      <section className="relative h-[min(85vh,28rem)] w-full sm:h-[min(88vh,32rem)] md:h-[min(90vh,36rem)]">
        <img
          src={thumbSrc}
          alt=""
          className="h-full w-full object-cover object-center"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = getPlaceholderThumb();
          }}
        />
        {/* Thumbnail overlay — Marka Önyüzü'nde kırmızı gradient */}
        <div
          className={`absolute inset-0 ${
            isBrandFront
              ? "bg-gradient-to-t from-red-950/75 via-red-950/15 to-transparent"
              : "bg-gradient-to-t from-emerald-950/70 via-emerald-950/10 to-transparent"
          }`}
          aria-hidden
        />
        {/* Marka Önyüzü rozeti — soldan gömülü, sağa doğru etiket */}
        {isBrandFront && (
          <div className="absolute left-0 top-[66%] z-10 -translate-y-1/2">
            <span className="inline-flex items-center gap-2 rounded-r-xl border-y border-r border-white/40 bg-gradient-to-r from-red-500 via-red-600 to-rose-600 py-2.5 pl-6 pr-5 font-display text-sm font-bold tracking-wide text-white shadow-lg shadow-red-500/30 ring-2 ring-white/30 ring-offset-2 ring-offset-transparent backdrop-blur-sm">
              <span aria-hidden>★</span>
              Marka Önyüzü
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-4 p-4 sm:p-6">
          <div className="flex items-end gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-lg sm:h-20 sm:w-20">
              <img
                src={avatarSrc}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = getPlaceholderAvatar();
                }}
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white drop-shadow sm:text-2xl">
                <span className="inline-flex items-center gap-1.5">
                  <span>{influencer.name}</span>
                  {showVerifiedBadge && <VerifiedBadge />}
                </span>
              </h1>
              <p className="text-sm text-white/90">{handleStr}</p>
              <p className="mt-0.5 text-xs text-white/80">{influencer.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white">
            <StarRating value={avgRating} />
            <span className="ml-1 text-sm font-medium">{avgRating.toFixed(1)}</span>
          </div>
        </div>
      </section>

      {/* Sekmeler — renkli, ilgi çekici, ortada */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="mx-auto flex max-w-5xl justify-center gap-2 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab("icerikler")}
            className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === "icerikler"
                ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-violet-300 hover:text-violet-700"
            }`}
          >
            <span className={activeTab === "icerikler" ? "text-white" : "text-violet-500"}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </span>
            <span>İçerikler</span>
            <span className={`tabular-nums ${activeTab === "icerikler" ? "text-white/90" : "text-slate-400"}`}>
              {reels.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("degerlendirmeler")}
            className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
              activeTab === "degerlendirmeler"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-amber-300 hover:text-amber-700"
            }`}
          >
            <span className={activeTab === "degerlendirmeler" ? "text-white" : "text-amber-500"}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </span>
            <span>Değerlendirmeler</span>
            <span className={`tabular-nums ${activeTab === "degerlendirmeler" ? "text-white/90" : "text-slate-400"}`}>
              {reviews.length}
            </span>
          </button>
        </div>
      </div>

      {/* İçerik alanı */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === "icerikler" && (
          <div>
            {reels.length === 0 ? (
              <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-200/80 text-slate-400">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-slate-600">Henüz video eklenmemiş</p>
                <p className="mt-1 text-xs text-slate-400">İçerikler burada listelenecek</p>
              </div>
            ) : (
              <ul
                className="mt-6 grid gap-5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
              >
                {reels.map((reel, index) => {
                  const embedUrl = getReelEmbedUrl(reel.url);
                  const canEmbed = !!embedUrl;
                  return (
                    <li key={`${reel.url}-${index}`} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                      <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-900">
                        {canEmbed ? (
                          <>
                            <iframe
                              src={embedUrl!}
                              title={`Reel ${index + 1}`}
                              className="h-full w-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </>
                        ) : (
                          <a
                            href={reel.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-200 to-slate-300"
                          >
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-slate-500">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </span>
                            <span className="text-sm font-medium text-slate-600">Linke git</span>
                          </a>
                        )}
                      </div>
                      <div className="flex gap-4 px-4 py-3 text-xs text-slate-500">
                        {reel.views != null && (
                          <span>{formatNumber(reel.views)} görüntülenme</span>
                        )}
                        {reel.likes != null && (
                          <span>{formatNumber(reel.likes)} beğeni</span>
                        )}
                        {reel.views == null && reel.likes == null && (
                          <span>—</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === "degerlendirmeler" && (
          <div className="mx-auto max-w-2xl space-y-8">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Ortalama puan</h3>
              <div className="mt-3 flex items-baseline gap-3">
                <StarRating value={avgRating} />
                <span className="text-2xl font-semibold text-slate-900">
                  {avgRating.toFixed(1)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Memnuniyet: %{satisfactionPercent} · {reviews.length} değerlendirme
              </p>
              <div className="mt-5 space-y-2.5">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-6 text-slate-500">{star}</span>
                    <span className="inline-flex gap-0.5 text-amber-500">★</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: reviews.length
                            ? `${(starDistribution[5 - star] / reviews.length) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="w-6 text-right text-slate-500 tabular-nums">
                      {starDistribution[5 - star]}
                    </span>
                  </div>
                ))}
              </div>
              {canSubmitToday === false ? (
                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
                  Bu cihazdan bu influencer için bugün zaten bir değerlendirme yaptınız. Yarın tekrar deneyebilirsiniz.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={canSubmitToday === null}
                  onClick={() => setShowReviewForm(true)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Değerlendirme Yap
                </button>
              )}
            </div>

            <div className="mb-8 text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Tüm Değerlendirmeler
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Bu profile yapılan tüm yorumlar
              </p>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-slate-300 to-transparent" aria-hidden />
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              {orderedReviews.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Henüz değerlendirme yok. İlk değerlendirmeyi siz yapın.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                {orderedReviews.map((r) => {
                    const videoEmbedUrl = r.videoUrl ? getReelEmbedUrl(r.videoUrl) : null;
                    const hasVideo = !!(videoEmbedUrl || r.videoUrl);
                    const isExpanded = expandedReviewId === r.id;
                    const existingReply = r.reply;
                    const draft = replyDrafts[r.id] ?? existingReply ?? "";
                    const isReplySaving = replySavingId === r.id;
                    const isProtocol = r.isProtocol === true;
                    return (
                      <li
                        key={r.id}
                        className={`border-t pt-4 first:border-0 first:pt-0 ${
                          isProtocol ? "border-emerald-200/80 bg-emerald-50/60 rounded-xl px-3 pb-3" : "border-slate-100"
                        }`}
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              {!isProtocol && (
                                <h4 className="text-xl font-bold tracking-tight text-slate-900">
                                  {r.businessName}
                                </h4>
                              )}
                              {isProtocol && (
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-emerald-500">
                                    <img
                                      src="/kimgetirdi-logo.png"
                                      alt="KimGetirdi"
                                      className="h-9 w-9 object-contain"
                                    />
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-900">
                                    KimGetirdi Marka Yorumu
                                  </span>
                                </div>
                              )}
                            </div>
                            {!isProtocol && (
                              <div className="text-[20px] leading-none">
                                <StarRating value={r.stars} />
                              </div>
                            )}
                          </div>
                            <p className="mt-1.5 text-sm text-slate-600">{r.comment || "—"}</p>
                            {hasVideo && (
                              <>
                                {videoEmbedUrl ? (
                                  <>
                                    {isExpanded ? (
                                      <div className="mt-3 w-full max-w-[300px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                                        <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-900">
                                          <iframe
                                            src={videoEmbedUrl}
                                            title="Ortak iş videosu"
                                            className="h-full w-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedReviewId(null)}
                                          className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                          Daralt
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedReviewId(r.id)}
                                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Videoyu göster
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <a
                                    href={r.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Videoyu aç
                                  </a>
                                )}
                              </>
                            )}
                            {existingReply && (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                <div className="mb-1 flex items-center gap-2">
                                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white shadow-sm ring-1 ring-slate-200">
                                    <img
                                      src={avatarSrc}
                                      alt={influencer.name}
                                      className="h-full w-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.src = getPlaceholderAvatar();
                                      }}
                                    />
                                  </div>
                                  <div className="flex min-w-0 flex-col">
                                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-900">
                                      <span className="truncate max-w-[140px] sm:max-w-[220px]">
                                        {influencer.name}
                                      </span>
                                      {isBrandFront && <VerifiedBadge />}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      Profil sahibi yanıtı
                                    </span>
                                  </div>
                                </div>
                                <p className="mt-1 whitespace-pre-line leading-relaxed">
                                  {existingReply}
                                </p>
                              </div>
                            )}
                            {canReplyAsInfluencer && (
                              <div className="mt-3 space-y-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyError(null);
                                    setReplyEditingId((prev) => (prev === r.id ? null : r.id));
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [r.id]: prev[r.id] ?? existingReply ?? "",
                                    }));
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h11M3 6h11M3 14h7m8-4v10m0 0l-3-3m3 3l3-3" />
                                  </svg>
                                  {existingReply ? "Yanıtı düzenle" : "Yanıtla"}
                                </button>
                                {replyEditingId === r.id && (
                                  <form
                                    className="space-y-2"
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      if (!id) return;
                                      setReplyError(null);
                                      setReplySavingId(r.id);
                                      try {
                                        await setReviewReply(id, r.id, draft);
                                        setReviews((prev) =>
                                          prev.map((rv) =>
                                            rv.id === r.id ? { ...rv, reply: draft.trim() } : rv
                                          )
                                        );
                                        setReplyEditingId(null);
                                      } catch (err) {
                                        setReplyError(
                                          err instanceof Error
                                            ? err.message
                                            : "Yanıt kaydedilemedi. Lütfen tekrar deneyin."
                                        );
                                      } finally {
                                        setReplySavingId(null);
                                      }
                                    }}
                                  >
                                    <textarea
                                      value={draft}
                                      onChange={(e) =>
                                        setReplyDrafts((prev) => ({
                                          ...prev,
                                          [r.id]: e.target.value,
                                        }))
                                      }
                                      rows={3}
                                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      placeholder="Değerlendirmeye yanıtınızı yazın..."
                                    />
                                    {replyError && (
                                      <p className="text-xs font-medium text-red-600">{replyError}</p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="submit"
                                        disabled={isReplySaving}
                                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        {isReplySaving ? "Kaydediliyor…" : "Yanıtı kaydet"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setReplyEditingId(null)}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                      >
                                        İptal
                                      </button>
                                      {existingReply && (
                                        <button
                                          type="button"
                                          disabled={isReplySaving}
                                          onClick={async () => {
                                            if (!id) return;
                                            setReplyError(null);
                                            setReplySavingId(r.id);
                                            try {
                                              await setReviewReply(id, r.id, "");
                                              setReviews((prev) =>
                                                prev.map((rv) =>
                                                  rv.id === r.id ? { ...rv, reply: undefined } : rv
                                                )
                                              );
                                              setReplyEditingId(null);
                                              setReplyDrafts((prev) => {
                                                const next = { ...prev };
                                                delete next[r.id];
                                                return next;
                                              });
                                            } catch (err) {
                                              setReplyError(
                                                err instanceof Error
                                                  ? err.message
                                                  : "Yanıt silinemedi. Lütfen tekrar deneyin."
                                              );
                                            } finally {
                                              setReplySavingId(null);
                                            }
                                          }}
                                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                                        >
                                          Yanıtı sil
                                        </button>
                                      )}
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}
                            {/* Normal yorumlar için etkileşim alanı; protokol yorumları rapor / like almaz */}
                            {!isProtocol && (
                              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <p className="text-xs text-slate-400">{r.date}</p>
                                  <button
                                    type="button"
                                    onClick={() => openReportModal(r)}
                                    title="Değerlendirmeyi raporla"
                                    aria-label="Değerlendirmeyi raporla"
                                    className="rounded p-1 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                                  >
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                      <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-6.4z" />
                                    </svg>
                                  </button>
                                </div>
                                {r.instagramHandle && normalizeInstagramUsername(r.instagramHandle) && (
                                  <a
                                    href={getInstagramProfileUrl(r.instagramHandle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-pink-300 bg-pink-50 px-2.5 py-1.5 text-xs font-medium text-pink-700 shadow-sm transition hover:bg-pink-100 hover:border-pink-400"
                                    title={`@${normalizeInstagramUsername(r.instagramHandle)}`}
                                  >
                                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.205.012-3.584.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    <span>Instagram</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleVote(r, "like")}
                                  disabled={votingReviewId === r.id}
                                  title="Beğen"
                                  aria-label={`Beğen (${r.likeCount ?? 0})`}
                                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                                    getStoredVote(id, r.id) === "like"
                                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                                      : "border-emerald-500/70 bg-white text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  <svg
                                    className={`h-4 w-4 ${
                                      getStoredVote(id, r.id) === "like"
                                        ? "fill-emerald-500 stroke-emerald-500"
                                        : "fill-white stroke-emerald-500"
                                    }`}
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                  >
                                    <path
                                      d="M12.1 5.1C10-0.2 2.4 1.4 2.4 7.1c0 3.9 3.4 6.4 6.7 9.1.9.7 1.8 1.5 2.5 2.3.7-.8 1.6-1.6 2.5-2.3 3.3-2.7 6.7-5.2 6.7-9.1 0-5.7-7.6-7.3-9.7-2z"
                                      strokeWidth="1.6"
                                    />
                                  </svg>
                                  <span className="tabular-nums">{r.likeCount ?? 0}</span>
                                </button>
                              </div>
                            )}

                            {/* Marka/protokol yorumu için profil sahibine özel beğeni kalbi */}
                            {isProtocol && (
                              <div className="mt-3 flex items-center justify-between">
                                <p className="text-xs text-slate-400">{r.date}</p>
                                <div className="flex items-center gap-2">
                                  {r.ownerLiked && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">
                                      <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-hidden
                                      >
                                        <path d="M12.1 5.1C10-0.2 2.4 1.4 2.4 7.1c0 3.9 3.4 6.4 6.7 9.1.9.7 1.8 1.5 2.5 2.3.7-.8 1.6-1.6 2.5-2.3 3.3-2.7 6.7-5.2 6.7-9.1 0-5.7-7.6-7.3-9.7-2z" />
                                      </svg>
                                      <span>Profil sahibi beğendi</span>
                                    </span>
                                  )}
                                  {canReplyAsInfluencer && (
                                    <button
                                      type="button"
                                      onClick={() => handleOwnerLikeToggle(r)}
                                      disabled={ownerLikeLoadingId === r.id}
                                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                        r.ownerLiked
                                          ? "border-emerald-500 bg-emerald-500 text-white"
                                          : "border-emerald-500/60 bg-white text-emerald-700 hover:bg-emerald-50"
                                      }`}
                                    >
                                      <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 24 24"
                                        fill={r.ownerLiked ? "currentColor" : "none"}
                                        stroke="currentColor"
                                        aria-hidden
                                      >
                                        <path
                                          d="M12.1 5.1C10-0.2 2.4 1.4 2.4 7.1c0 3.9 3.4 6.4 6.7 9.1.9.7 1.8 1.5 2.5 2.3.7-.8 1.6-1.6 2.5-2.3 3.3-2.7 6.7-5.2 6.7-9.1 0-5.7-7.6-7.3-9.7-2z"
                                          strokeWidth="1.6"
                                        />
                                      </svg>
                                      <span>{r.ownerLiked ? "Beğeniyi kaldır" : "Marka olarak beğen"}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Değerlendirme modalı */}
      {showReviewForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
          onClick={() => setShowReviewForm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 id="review-modal-title" className="text-base font-semibold text-slate-900">
              Değerlendirme yap
            </h3>
            {canSubmitToday === false ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Bu cihazdan bu influencer için bugün zaten bir değerlendirme yaptınız. Yarın tekrar deneyebilirsiniz.
              </p>
            ) : (
          <form
            onSubmit={handleSubmitReview}
            className="mt-4"
          >
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-600">5 üzerinden puan</p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormStars(s)}
                    className={`rounded p-1.5 text-2xl transition ${
                      formStars >= s ? "text-amber-500" : "text-slate-300 hover:text-slate-400"
                    }`}
                    aria-label={`${s} yıldız`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="review-business" className="text-xs font-medium text-slate-600">
                İşletme ismi <span className="text-red-500">*</span>
              </label>
              <input
                id="review-business"
                type="text"
                placeholder="İşletme adınızı girin"
                value={formBusiness}
                onChange={(e) => setFormBusiness(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="mt-4">
              <label htmlFor="review-comment" className="text-xs font-medium text-slate-600">
                Yorum <span className="text-slate-400">(zorunlu değil)</span>
              </label>
              <textarea
                id="review-comment"
                placeholder="İsteğe bağlı yorumunuzu yazın..."
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                rows={5}
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4">
              <label htmlFor="review-instagram" className="text-xs font-medium text-slate-600">
                Instagram hesabınız <span className="text-slate-400">(opsiyonel)</span>
              </label>
              <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white">
                <span className="pl-3 text-sm text-slate-500" aria-hidden>@</span>
                <input
                  id="review-instagram"
                  type="text"
                  placeholder="kullaniciadi veya profil linki"
                  value={formInstagram}
                  onChange={(e) => setFormInstagram(normalizeInstagramUsername(e.target.value))}
                  className="w-full border-0 bg-transparent py-2 pr-3 pl-1 text-sm outline-none focus:ring-0"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="review-video" className="text-xs font-medium text-slate-600">
                Ortak iş yaptığınız Instagram Reels video linki <span className="text-red-500">*</span>
              </label>
              <input
                id="review-video"
                type="url"
                placeholder="https://www.instagram.com/reel/..."
                value={formVideoUrl}
                onChange={(e) => setFormVideoUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="mt-4">
              <label htmlFor="review-price-range" className="text-xs font-medium text-slate-600">
                Birlikte çalıştığınız fiyat aralığı <span className="text-slate-400">(opsiyonel)</span>
              </label>
              <select
                id="review-price-range"
                value={formPriceRange}
                onChange={(e) => setFormPriceRange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Seçiniz</option>
                {PRICE_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {submitError && (
              <p className="mt-3 text-sm text-red-600">{submitError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={submitLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitLoading ? "Gönderiliyor..." : "Gönder"}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
            </div>
          </form>
            )}
          </div>
        </div>
      )}

      {/* İnceleme modunda gönderilen değerlendirme için bilgilendirme */}
      {showPendingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Değerlendirmeniz alındı
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Güvenliği korumak için bu profil için yapılan yeni değerlendirmeler önce ekip
              tarafından inceleniyor. Uygun görülürse kısa süre içinde yayına alınacaktır.
            </p>
            <button
              type="button"
              onClick={() => setShowPendingNotice(false)}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* Rapor modalı */}
      {showReportModal && reportTargetReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
          onClick={closeReportModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          <form
            onSubmit={handleSubmitReport}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h3 id="report-modal-title" className="text-base font-semibold text-slate-900">
              Değerlendirmeyi raporla
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Bu değerlendirme hakkında şikayetinizi girin. İnceleme sonrası gerekirse değerlendirme kaldırılabilir.
            </p>
            <div className="mt-4">
              <label htmlFor="report-reason" className="text-xs font-medium text-slate-600">
                Rapor sebebi <span className="text-red-500">*</span>
              </label>
              <select
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Seçiniz</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {reportReason === "other" && (
                <input
                  type="text"
                  placeholder="Sebebi yazın..."
                  value={reportReasonOther}
                  onChange={(e) => setReportReasonOther(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              )}
            </div>
            <div className="mt-4">
              <label htmlFor="report-description" className="text-xs font-medium text-slate-600">
                Açıklama
              </label>
              <textarea
                id="report-description"
                placeholder="Detaylı açıklama (isteğe bağlı)"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {reportError && (
              <p className="mt-3 text-sm text-red-600">{reportError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={reportSubmitting}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {reportSubmitting ? "Gönderiliyor..." : "Raporu gönder"}
              </button>
              <button
                type="button"
                onClick={closeReportModal}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
