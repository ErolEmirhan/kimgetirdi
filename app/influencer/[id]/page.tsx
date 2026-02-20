"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import type { Influencer, Review } from "@/app/types/influencer";
import { getInfluencerById } from "@/lib/influencers";
import { addReview, getReviews, voteReview, getStoredVote, canSubmitReview } from "@/lib/reviews";
import { addReport } from "@/lib/reports";
import { PRICE_RANGE_OPTIONS } from "@/lib/priceRange";
import { proxyImageUrl, getPlaceholderAvatar, getPlaceholderThumb, getInstagramAvatarUrl, getReviewerAvatarApiUrl, getInitialsAvatarUrl, normalizeInstagramUsername, getInstagramProfileUrl } from "@/lib/imageUrl";
import { getReelEmbedUrl } from "@/lib/reelEmbed";

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
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((a, r) => a + r.stars, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const satisfactionPercent = useMemo(() => {
    if (reviews.length === 0) return 0;
    const fourPlus = reviews.filter((r) => r.stars >= 4).length;
    return Math.round((fourPlus / reviews.length) * 100);
  }, [reviews]);

  const starDistribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.stars >= 1 && r.stars <= 5) d[5 - r.stars]++;
    });
    return d;
  }, [reviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusiness.trim() || !id) return;
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const instagramUsername = normalizeInstagramUsername(formInstagram);
      const review = await addReview(id, {
        businessName: formBusiness.trim(),
        stars: formStars,
        comment: formComment.trim() || undefined,
        instagramHandle: instagramUsername ? `@${instagramUsername}` : undefined,
        videoUrl: formVideoUrl.trim() || undefined,
        priceRange: formPriceRange.trim() || undefined,
      });
      setReviews((prev) => [review, ...prev]);
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
            <span className="inline-flex w-max max-w-[110px] items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-2.5 py-1 font-display text-xs font-bold leading-tight text-white shadow-sm sm:max-w-[130px]">
              <span className="line-clamp-2 break-words text-center">{influencer.name}</span>
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
        {/* Tek geçişli, sade yeşil gradient — alttan üste yumuşak saydamlaşma */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 via-emerald-950/10 to-transparent"
          aria-hidden
        />
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
                {influencer.name}
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
              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Henüz değerlendirme yok. İlk değerlendirmeyi siz yapın.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {reviews.map((r) => {
                    const videoEmbedUrl = r.videoUrl ? getReelEmbedUrl(r.videoUrl) : null;
                    const hasVideo = !!(videoEmbedUrl || r.videoUrl);
                    const isExpanded = expandedReviewId === r.id;
                    return (
                      <li key={r.id} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-xl font-bold tracking-tight text-slate-900">{r.businessName}</h4>
                            <StarRating value={r.stars} />
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
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="text-xs text-slate-400">{r.date}</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleVote(r, "like")}
                                    disabled={votingReviewId === r.id}
                                    title="Beğen"
                                    aria-label={`Beğen (${r.likeCount ?? 0})`}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                      getStoredVote(id, r.id) === "like"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    }`}
                                  >
                                    <span aria-hidden>👍</span>
                                    <span>{r.likeCount ?? 0}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVote(r, "dislike")}
                                    disabled={votingReviewId === r.id}
                                    title="Beğenme"
                                    aria-label={`Beğenme (${r.dislikeCount ?? 0})`}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                      getStoredVote(id, r.id) === "dislike"
                                        ? "bg-red-100 text-red-700"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    }`}
                                  >
                                    <span aria-hidden>👎</span>
                                    <span>{r.dislikeCount ?? 0}</span>
                                  </button>
                                </div>
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
                            </div>
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
                Ortak iş yaptığınız video linki <span className="text-slate-400">(opsiyonel)</span>
              </label>
              <input
                id="review-video"
                type="url"
                placeholder="https://www.instagram.com/reel/..."
                value={formVideoUrl}
                onChange={(e) => setFormVideoUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
