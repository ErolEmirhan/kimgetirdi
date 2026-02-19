"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useRef, useEffect, Fragment, type ReactNode } from "react";
import InfluencerCard from "@/components/InfluencerCard";
import { useInfluencers } from "./hooks/useInfluencers";
import { getReviews, voteReview, getStoredVote } from "@/lib/reviews";
import { getPlaceholderAvatar, proxyImageUrl, getInstagramAvatarUrl, getReviewerAvatarApiUrl, getInitialsAvatarUrl, normalizeInstagramUsername, getInstagramProfileUrl } from "@/lib/imageUrl";
import { getReelEmbedUrl } from "@/lib/reelEmbed";
import { getPriceRangeSortValue } from "@/lib/priceRange";
import type { Influencer, Review } from "@/app/types/influencer";

type FeedItem = { review: Review; influencer: { id: string; name: string; avatar: string } };

type SortOption = "rating" | "reviews" | "name-az" | "name-za" | "price-desc" | "price-asc";

const SORT_OPTIONS: { value: SortOption; label: string; icon: ReactNode }[] = [
  { value: "rating", label: "En yüksek puan", icon: <svg className="h-4 w-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg> },
  { value: "reviews", label: "En çok yorum", icon: <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg> },
  { value: "name-az", label: "İsim A-Z", icon: <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg> },
  { value: "name-za", label: "İsim Z-A", icon: <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m4-4l4 4m0 0l-4 4m4-4H3" /></svg> },
  { value: "price-desc", label: "Fiyat: Yüksekten düşüğe", icon: <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> },
  { value: "price-asc", label: "Fiyat: Düşükten yükseğe", icon: <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> },
];

export default function Home() {
  const router = useRouter();
  const { influencers, loading, error } = useInfluencers();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("rating");
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [hamburgerClosing, setHamburgerClosing] = useState(false);
  const [hamburgerReady, setHamburgerReady] = useState(false);
  const [currentPageLabel, setCurrentPageLabel] = useState("Ana sayfa");
  const [currentPageIcon, setCurrentPageIcon] = useState<"home" | "sort" | "star">("home");
  const [allReviewsFeed, setAllReviewsFeed] = useState<FeedItem[]>([]);
  const [allReviewsFeedLoading, setAllReviewsFeedLoading] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [feedVotingKey, setFeedVotingKey] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  const [splashLogoError, setSplashLogoError] = useState(false);
  const pageMenuRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentPageLabel !== "Değerlendirmeler" || !influencers.length) return;
    let cancelled = false;
    setAllReviewsFeedLoading(true);
    Promise.all(
      influencers.map((inf) =>
        getReviews(inf.id).then((reviews) =>
          reviews.map((r) => ({
            review: r,
            influencer: { id: inf.id, name: inf.name, avatar: inf.avatar },
          }))
        )
      )
    )
      .then((arrays) => {
        const flat = arrays.flat();
        const parseDate = (d: string) => {
          const parts = d.split(".");
          if (parts.length !== 3) return 0;
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day).getTime();
        };
        flat.sort((a, b) => parseDate(b.review.date) - parseDate(a.review.date));
        if (!cancelled) setAllReviewsFeed(flat);
      })
      .catch(() => {
        if (!cancelled) setAllReviewsFeed([]);
      })
      .finally(() => {
        if (!cancelled) setAllReviewsFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPageLabel, influencers]);

  const pageIcon = (type: "home" | "sort" | "star") => {
    if (type === "home")
      return (
        <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    if (type === "sort")
      return (
        <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      );
    return (
      <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    );
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pageMenuRef.current && !pageMenuRef.current.contains(e.target as Node)) {
        setPageMenuOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    if (pageMenuOpen || sortDropdownOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [pageMenuOpen, sortDropdownOpen]);

  // Splash ekranı: sayfa yüklendiğinde 2 saniye göster, sonra yumuşak kapat
  useEffect(() => {
    const t = setTimeout(() => {
      setSplashFadeOut(true);
      setTimeout(() => setShowSplash(false), 400);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hamburgerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [hamburgerOpen]);

  // Açılış: mount sonrası paneli kaydır
  useEffect(() => {
    if (!hamburgerOpen || hamburgerClosing) return;
    setHamburgerReady(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHamburgerReady(true));
    });
    return () => cancelAnimationFrame(t);
  }, [hamburgerOpen, hamburgerClosing]);

  // Kapanış: animasyon bitince unmount
  useEffect(() => {
    if (!hamburgerClosing) return;
    const id = setTimeout(() => {
      setHamburgerOpen(false);
      setHamburgerClosing(false);
      setHamburgerReady(false);
    }, 300);
    return () => clearTimeout(id);
  }, [hamburgerClosing]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list: Influencer[] = q
      ? influencers.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.handle.toLowerCase().includes(q) ||
            i.category?.toLowerCase().includes(q)
        )
      : [...influencers];

    if (sort === "rating") {
      list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));
    } else if (sort === "reviews") {
      list.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    } else if (sort === "name-az") {
      list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    } else if (sort === "name-za") {
      list.sort((a, b) => b.name.localeCompare(a.name, "tr"));
    } else if (sort === "price-desc") {
      list.sort((a, b) => getPriceRangeSortValue(b.estimatedPriceRange) - getPriceRangeSortValue(a.estimatedPriceRange));
    } else if (sort === "price-asc") {
      list.sort((a, b) => getPriceRangeSortValue(a.estimatedPriceRange) - getPriceRangeSortValue(b.estimatedPriceRange));
    }
    return list;
  }, [influencers, search, sort]);

  const handleIncele = (id: string) => {
    router.push(`/influencer/${id}`);
  };

  const handleDegerlendir = (id: string) => {
    router.push(`/influencer/${id}?degerlendir=1`);
  };

  const handleFeedVote = async (influencerId: string, review: Review, vote: "like" | "dislike") => {
    const key = `${influencerId}-${review.id}`;
    if (feedVotingKey) return;
    setFeedVotingKey(key);
    try {
      const { likeCount, dislikeCount } = await voteReview(influencerId, review.id, vote);
      setAllReviewsFeed((prev) =>
        prev.map((item) =>
          item.influencer.id === influencerId && item.review.id === review.id
            ? { ...item, review: { ...item.review, likeCount, dislikeCount } }
            : item
        )
      );
    } finally {
      setFeedVotingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Splash ekranı — beyaz arka plan, logo etrafında dairesel dolum */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-out ${splashFadeOut ? "opacity-0" : "opacity-100"}`}
          aria-hidden
        >
          {/* Üst gradient çizgi */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent opacity-60" />
          {/* Logo + etrafında dairesel dolum ring */}
          <div className="relative flex items-center justify-center w-[min(90vw,300px)] h-[min(90vw,300px)] max-w-[300px] max-h-[300px]">
            {/* Dairesel progress — logonun etrafında çember olarak dolar */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 text-slate-200"
              viewBox="0 0 100 100"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-slate-200"
              />
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="url(#splash-ring-gradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="295.3"
                strokeDashoffset="295.3"
                className="animate-[splash-circle_2s_ease-in-out_forwards]"
              />
              <defs>
                <linearGradient id="splash-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#0d9488" />
                </linearGradient>
              </defs>
            </svg>
            {/* Logo — ortada, ring içinde */}
            <div className="relative z-10 w-[min(85vw,260px)] max-w-[260px] animate-[splash-logo-in_0.8s_ease-out_both]">
              {!splashLogoError ? (
                <Image
                  src="/kimgetirdi-logo.png"
                  alt="KimGetirdi"
                  width={280}
                  height={140}
                  className="h-auto w-full object-contain drop-shadow-lg"
                  priority
                  unoptimized
                  onError={() => setSplashLogoError(true)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <span className="font-display text-3xl font-extrabold tracking-tight text-slate-800">
                    Kim<span className="text-emerald-500">Getirdi</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hamburger menü — soldan kayarak açılır/kapanır */}
      {hamburgerOpen && (
        <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog" aria-label="Influencer listesi">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
              hamburgerReady && !hamburgerClosing ? "opacity-100" : "opacity-0"
            } ${!hamburgerReady ? "pointer-events-none" : ""}`}
            onClick={() => !hamburgerClosing && setHamburgerClosing(true)}
            aria-hidden
          />
          <div
            className={`absolute left-0 top-0 bottom-0 z-10 flex w-[min(320px,85vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
              hamburgerReady && !hamburgerClosing ? "translate-x-0" : "-translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">İçerik Üreticileri</span>
              </div>
              <button
                type="button"
                onClick={() => setHamburgerClosing(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Menüyü kapat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : influencers.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Henüz influencer yok</p>
              ) : (
                <ul className="px-3 py-2">
                  {[...influencers]
                    .sort((a, b) => a.name.localeCompare(b.name, "tr"))
                    .map((inf, index) => {
                      const handleStr = inf.handle.startsWith("@") ? inf.handle : `@${inf.handle}`;
                      const avatarSrc = inf.avatar ? proxyImageUrl(inf.avatar) : getPlaceholderAvatar();
                      const rating = inf.avgRating != null ? Math.min(5, Math.max(0, inf.avgRating)) : null;
                      return (
                        <Fragment key={inf.id}>
                          {index > 0 && (
                            <li className="list-none py-1" aria-hidden>
                              <div
                                className="h-px w-full rounded-full bg-gradient-to-r from-transparent from-[15%] via-slate-300 to-transparent to-[85%]"
                                style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.5)" }}
                              />
                            </li>
                          )}
                          <li>
                            <Link
                              href={`/influencer/${inf.id}`}
                              onClick={() => setHamburgerClosing(true)}
                              className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left transition hover:bg-slate-100/80"
                            >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
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
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-900">{inf.name}</p>
                              <p className="truncate text-xs text-slate-500">{handleStr}</p>
                              {rating != null && (
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                                  <span className="font-medium tabular-nums">
                                    {rating % 1 === 0 ? rating : rating.toFixed(1)}
                                  </span>
                                  <span className="text-slate-400">/</span>
                                  <span className="text-slate-500">5</span>
                                  <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </p>
                              )}
                            </div>
                            <svg className="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                          </li>
                        </Fragment>
                      );
                    })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-surface-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 shrink items-center gap-3">
            <button
              type="button"
              onClick={() => setHamburgerOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Menüyü aç"
              aria-expanded={hamburgerOpen}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="flex items-center gap-3 font-display text-xl font-extrabold tracking-tight">
              <span>
                <span className="text-slate-900">Kim</span>
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent" style={{ WebkitTextFillColor: "transparent" }}>
                  Getirdi
                </span>
              </span>
            </h1>
          </div>
          <div className="relative flex w-max flex-col shrink-0 -mt-2.5" ref={pageMenuRef}>
            {/* En uzun sayfa ismi kadar genişlik için görünmez referans (dikey yer kaplamaz) */}
            <span className="invisible flex h-0 w-max items-center gap-2.5 overflow-hidden px-3 py-2.5 text-sm font-medium" aria-hidden>
              {pageIcon("star")}
              Değerlendirmeler
            </span>
            <button
              type="button"
              onClick={() => setPageMenuOpen((v) => !v)}
              className="relative flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
              aria-expanded={pageMenuOpen}
              aria-haspopup="true"
            >
              <span className="flex items-center gap-1.5">
                {pageIcon(currentPageIcon)}
                <span className="truncate">{currentPageLabel}</span>
              </span>
              <svg className={`absolute right-2.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition ${pageMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {pageMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                <a
                  href="/"
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  onClick={() => {
                    setPageMenuOpen(false);
                    setCurrentPageLabel("Ana sayfa");
                    setCurrentPageIcon("home");
                  }}
                >
                  {pageIcon("home")}
                  Ana sayfa
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setPageMenuOpen(false);
                    setCurrentPageLabel("Sıralama");
                    setCurrentPageIcon("sort");
                    document.getElementById("filtreleme")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {pageIcon("sort")}
                  Sıralama
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setPageMenuOpen(false);
                    setCurrentPageLabel("Değerlendirmeler");
                    setCurrentPageIcon("star");
                  }}
                >
                  {pageIcon("star")}
                  Değerlendirmeler
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Arama + Filtreleme — sadece Ana sayfa / grid görünümünde */}
      {currentPageLabel !== "Değerlendirmeler" && !loading && !error && influencers.length > 0 && (
        <div id="filtreleme" className="sticky top-16 z-40 border-b border-surface-border bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder="İsim veya hesap ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Arama"
                />
              </div>
              <div className="relative flex items-center gap-2" ref={sortDropdownRef}>
                <span className="text-sm font-medium text-slate-500">Sırala:</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen((v) => !v)}
                    className="flex min-w-[11rem] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50/80 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    aria-expanded={sortDropdownOpen}
                    aria-haspopup="listbox"
                    aria-label="Sıralama"
                  >
                    <span className="shrink-0 text-slate-400">
                      {SORT_OPTIONS.find((o) => o.value === sort)?.icon}
                    </span>
                    <span className="truncate">{SORT_OPTIONS.find((o) => o.value === sort)?.label}</span>
                    <svg className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition ${sortDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {sortDropdownOpen && (
                    <div
                      className="absolute right-0 top-full z-50 mt-1.5 w-full min-w-[11rem] rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                      role="listbox"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={sort === opt.value}
                          onClick={() => {
                            setSort(opt.value);
                            setSortDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition hover:bg-slate-50 ${sort === opt.value ? "bg-emerald-50/80 font-medium text-emerald-800" : "text-slate-700"}`}
                        >
                          <span className="shrink-0">{opt.icon}</span>
                          <span className="truncate">{opt.label}</span>
                          {sort === opt.value && (
                            <svg className="ml-auto h-4 w-4 shrink-0 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {search.trim() && (
              <p className="mt-2 text-sm text-muted">
                <strong>{filteredAndSorted.length}</strong> sonuç
              </p>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {currentPageLabel === "Değerlendirmeler" ? (
          <div className="mx-auto max-w-4xl">
            <header className="mb-10 text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Tüm Değerlendirmeler
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Platformdaki tüm değerlendirmeler, en yeniden eskiye
              </p>
              <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-r from-transparent via-slate-300 to-transparent" aria-hidden />
            </header>
            {allReviewsFeedLoading ? (
              <div className="mt-12 flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                <p className="mt-4 text-sm font-medium">Değerlendirmeler yükleniyor...</p>
              </div>
            ) : allReviewsFeed.length === 0 ? (
              <div className="mt-12 rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                <p className="font-medium text-slate-600">Henüz değerlendirme yok</p>
                <p className="mt-1 text-sm text-slate-500">Değerlendirmeler burada listelenecek.</p>
              </div>
            ) : (
              <ul className="mt-8 space-y-4">
                {allReviewsFeed.map(({ review, influencer }) => {
                  const videoEmbedUrl = review.videoUrl ? getReelEmbedUrl(review.videoUrl) : null;
                  return (
                    <li
                      key={`${influencer.id}-${review.id}`}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:flex-row"
                    >
                      <div className="min-w-0 flex-1 p-5 sm:p-6">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900">{review.businessName}</h3>
                            <span className="inline-flex gap-0.5 text-amber-500">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <span key={s}>{review.stars >= s ? "★" : "☆"}</span>
                              ))}
                            </span>
                          </div>
                            {review.comment ? (
                              <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                            ) : null}
                            {videoEmbedUrl && (
                              <div className="mt-4 w-full max-w-[300px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
                                <div className="relative w-full overflow-hidden bg-slate-900" style={{ aspectRatio: '9/16' }}>
                                  <iframe
                                    src={videoEmbedUrl}
                                    title="Video"
                                    className="absolute inset-0 h-full w-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ overflow: 'hidden' }}
                                  />
                                </div>
                              </div>
                            )}
                            {review.videoUrl && !videoEmbedUrl && (
                              <a
                                href={review.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline"
                              >
                                Videoyu aç
                              </a>
                            )}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="text-xs text-slate-400">{review.date}</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleFeedVote(influencer.id, review, "like")}
                                    disabled={feedVotingKey === `${influencer.id}-${review.id}`}
                                    title="Beğen"
                                    aria-label={`Beğen (${review.likeCount ?? 0})`}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                      getStoredVote(influencer.id, review.id) === "like"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    }`}
                                  >
                                    <span aria-hidden>👍</span>
                                    <span>{review.likeCount ?? 0}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFeedVote(influencer.id, review, "dislike")}
                                    disabled={feedVotingKey === `${influencer.id}-${review.id}`}
                                    title="Beğenme"
                                    aria-label={`Beğenme (${review.dislikeCount ?? 0})`}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                                      getStoredVote(influencer.id, review.id) === "dislike"
                                        ? "bg-red-100 text-red-700"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    }`}
                                  >
                                    <span aria-hidden>👎</span>
                                    <span>{review.dislikeCount ?? 0}</span>
                                  </button>
                                </div>
                              </div>
                              {review.instagramHandle && normalizeInstagramUsername(review.instagramHandle) && (
                                <a
                                  href={getInstagramProfileUrl(review.instagramHandle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-pink-300 bg-pink-50 px-2.5 py-1.5 text-xs font-medium text-pink-700 shadow-sm transition hover:bg-pink-100 hover:border-pink-400"
                                  title={`@${normalizeInstagramUsername(review.instagramHandle)}`}
                                >
                                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.205.012-3.584.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                  </svg>
                                  <span>Instagram</span>
                                </a>
                              )}
                            </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:border-t-0 sm:border-l sm:px-6">
                        <Link
                          href={`/influencer/${influencer.id}`}
                          className="flex items-center gap-3 rounded-xl py-2 pl-2 pr-4 transition hover:bg-white/80"
                        >
                          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-md ring-1 ring-slate-200">
                            <img
                              src={influencer.avatar ? proxyImageUrl(influencer.avatar) : getPlaceholderAvatar()}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = getPlaceholderAvatar();
                              }}
                            />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-900">{influencer.name}</p>
                            <p className="text-xs text-slate-500">Profili görüntüle</p>
                          </div>
                          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-muted">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <p className="mt-4">Influencer listesi yükleniyor...</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-700">
                <p className="font-medium">Veriler yüklenemedi</p>
                <p className="mt-1 text-sm opacity-90">{error}</p>
                <p className="mt-2 text-sm text-muted">
                  .env.local içinde Firebase ayarlarınızı kontrol edin.
                </p>
              </div>
            )}

            {!loading && !error && influencers.length === 0 && (
              <div className="rounded-xl border border-surface-border bg-surface-card px-6 py-12 text-center text-muted">
                <p className="font-medium text-primary">Henüz influencer yok</p>
                <p className="mt-1 text-sm">
                  Yönetim panelinden influencer eklediğinizde burada listelenecektir.
                </p>
              </div>
            )}

            {!loading && !error && influencers.length > 0 && (
              <>
                {filteredAndSorted.length === 0 ? (
                  <div className="rounded-xl border border-surface-border bg-surface-card px-6 py-12 text-center text-muted">
                    <p className="font-medium text-primary">Aramanıza uygun sonuç yok</p>
                    <p className="mt-1 text-sm">Farklı bir arama deneyin veya filtreyi değiştirin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 sm:gap-10">
                    {filteredAndSorted.map((influencer, index) => (
                      <InfluencerCard
                        key={influencer.id}
                        influencer={influencer}
                        rank={index + 1}
                        onIncele={handleIncele}
                        onDegerlendir={handleDegerlendir}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-surface-border py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted sm:px-6 lg:px-8">
          KimGetirdi — Profesyonel influencer değerlendirme platformu
        </div>
      </footer>
    </div>
  );
}
