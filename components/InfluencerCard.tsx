"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Influencer } from "@/app/types/influencer";
import { proxyImageUrl, getPlaceholderAvatar, getPlaceholderThumb, getInstagramAvatarUrl } from "@/lib/imageUrl";
import { getPriceRangeShortLabel, getPriceRangeBadgeTier } from "@/lib/priceRange";

interface InfluencerCardProps {
  influencer: Influencer;
  rank?: number;
  onIncele?: (id: string) => void;
  onDegerlendir?: (id: string) => void;
}

export default function InfluencerCard({
  influencer,
  rank,
  onIncele,
  onDegerlendir,
}: InfluencerCardProps) {
  const thumbUrl = influencer.thumbnail || influencer.avatar;
  const thumbSrc = thumbUrl ? proxyImageUrl(thumbUrl) : getPlaceholderThumb();
  const avatarSrc = influencer.avatar ? proxyImageUrl(influencer.avatar) : getPlaceholderAvatar();
  const fallbackAvatarByHandle = influencer.handle
    ? proxyImageUrl(getInstagramAvatarUrl(influencer.handle))
    : getPlaceholderAvatar();
  const isBrandFront = influencer.brandFront;
  const [showCardSplash, setShowCardSplash] = useState(false);

  const closeSplashAndNavigate = useCallback(() => {
    setShowCardSplash(false);
    onIncele?.(influencer.id);
  }, [influencer.id, onIncele]);

  useEffect(() => {
    if (!showCardSplash) return;
    const t = setTimeout(closeSplashAndNavigate, 2500);
    return () => clearTimeout(t);
  }, [showCardSplash, closeSplashAndNavigate]);

  const articleClass = isBrandFront
    ? "group relative overflow-hidden rounded-[12px] bg-white shadow-none ring-0 border-0 card-hover"
    : "group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-100 card-hover";

  const thumbTopRadius = isBrandFront ? "rounded-t-[12px]" : "rounded-t-2xl";

  const card = (
    <article className={articleClass}>
      {/* Thumbnail / profil alanı — Marka Önyüzü'nde splash, diğerlerinde direkt profile */}
      <div
        className={`relative aspect-[4/3] bg-slate-100 overflow-hidden ${thumbTopRadius} cursor-pointer`}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isBrandFront) setShowCardSplash(true);
          else onIncele?.(influencer.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isBrandFront) setShowCardSplash(true);
            else onIncele?.(influencer.id);
          }
        }}
        aria-label={isBrandFront ? "Marka Önyüzü profilini aç" : "Profili aç"}
      >
        <img
          src={thumbSrc}
          alt={influencer.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (influencer.handle && target.src !== fallbackAvatarByHandle) {
              target.src = fallbackAvatarByHandle;
            } else {
              target.src = getPlaceholderThumb();
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/50 via-emerald-400/25 to-emerald-300/10" />
        {/* Tahmini fiyat aralığı — beyaz kart, gradient parlak çerçeve (tutara göre renk) */}
        {influencer.estimatedPriceRange && (() => {
          const tier = getPriceRangeBadgeTier(influencer.estimatedPriceRange);
          const frameGradient =
            tier === "green"
              ? "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 shadow-lg shadow-emerald-500/40"
              : tier === "yellow"
                ? "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 shadow-lg shadow-amber-500/40"
                : "bg-gradient-to-r from-rose-400 via-red-500 to-red-600 shadow-lg shadow-rose-500/40";
          const textColor =
            tier === "green"
              ? "text-emerald-700"
              : tier === "yellow"
                ? "text-amber-700"
                : "text-red-700";
          return (
            <div className="absolute left-4 bottom-[4.5rem] flex items-center">
              {/* Sadece arka plan gömülü: soldan taşan gradient kuyruk (kesilir) */}
              <span
                className={`absolute left-0 z-0 h-10 w-14 -translate-x-1/2 rounded-r-full ${frameGradient}`}
                aria-hidden
              />
              {/* Beyaz kart + içinde etiket + fiyat */}
              <span
                className={`relative z-10 inline-flex rounded-full p-[1px] ${frameGradient} ring-1 ring-white/50 ring-offset-1 ring-offset-black/10`}
              >
                <span
                  className={`inline-flex flex-col items-start gap-0 rounded-full bg-white px-4 py-2 ${textColor}`}
                >
                  <span className="text-[8px] font-medium uppercase tracking-widest text-slate-400 leading-none">
                    Değerlendirmelerin tahmini fiyat aralığı
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-tight leading-tight">
                    <span className="opacity-90 text-base" aria-hidden>₺</span>
                    <span>{getPriceRangeShortLabel(influencer.estimatedPriceRange)}</span>
                  </span>
                </span>
              </span>
            </div>
          );
        })()}
        {/* Sol üst — Marka Önyüzü etiketi veya sıra numarası */}
        {isBrandFront ? (
          <div className="absolute left-4 top-4 flex items-center justify-center gap-1.5 rounded-xl border border-red-400/60 bg-gradient-to-r from-red-500 to-rose-600 px-3 py-2 font-display text-sm font-bold tracking-wide text-white shadow-lg shadow-red-500/30 backdrop-blur-sm">
            <span aria-hidden>★</span>
            Marka Önyüzü
          </div>
        ) : rank != null ? (
          <div
            className={`absolute left-4 top-4 flex items-center justify-center rounded-xl border px-3 py-2 font-display text-lg font-bold tabular-nums shadow-lg backdrop-blur-sm ${
              rank === 1
                ? "border-amber-400/60 bg-gradient-to-br from-amber-500/95 to-amber-600/95 text-white"
                : rank === 2
                  ? "border-slate-300/60 bg-gradient-to-br from-slate-400/95 to-slate-500/95 text-white"
                  : rank === 3
                    ? "border-amber-700/60 bg-gradient-to-br from-amber-800/95 to-amber-900/95 text-amber-100"
                    : "border-white/25 bg-black/60 text-white"
            }`}
          >
            #{rank}
          </div>
        ) : null}
        {/* Sağ üst — yıldız puanı, kocaman ve şık */}
        <div
          className={
            isBrandFront
              ? "absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-white/40 bg-gradient-to-r from-red-500 to-rose-600 px-5 py-3 shadow-xl shadow-red-500/30 backdrop-blur-md"
              : "absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-white/30 bg-white/95 px-5 py-3 shadow-xl backdrop-blur-md"
          }
        >
          <span
            className={`text-3xl leading-none ${isBrandFront ? "text-white" : "text-amber-500"}`}
            aria-hidden
          >
            ★
          </span>
          <span
            className={`font-display text-3xl font-bold tabular-nums tracking-tight ${
              isBrandFront ? "text-white" : "text-slate-800"
            }`}
          >
            {influencer.avgRating != null && influencer.avgRating > 0 ? influencer.avgRating.toFixed(1) : "—"}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/75 to-transparent">
          <div className="flex items-end gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white/90 ring-offset-2 ring-offset-black/30 shadow-lg">
              <img
                src={avatarSrc}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (influencer.handle && target.src !== fallbackAvatarByHandle) {
                    target.src = fallbackAvatarByHandle;
                  } else {
                    target.src = getPlaceholderAvatar();
                  }
                }}
              />
            </div>
            <div className="min-w-0 flex-1 pb-0.5">
              <h3 className="font-display font-semibold text-white truncate drop-shadow-sm">
                {influencer.name}
              </h3>
              <p className="text-sm text-white/90 truncate drop-shadow-sm">
                {influencer.handle.startsWith("@")
                  ? influencer.handle
                  : influencer.handle.includes(" ")
                    ? influencer.handle
                    : `@${influencer.handle}`}
              </p>
            </div>
          </div>
        </div>
        {/* Sağ alt — Profili İncele */}
        <button
          type="button"
          onClick={() => onIncele?.(influencer.id)}
          className={
            isBrandFront
              ? "absolute right-3 bottom-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:from-red-600 hover:via-red-700 hover:to-rose-700 hover:shadow-red-500/40"
              : "absolute right-3 bottom-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40"
          }
        >
          Profili İncele
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      {/* İçerik */}
      <div className={`p-4 bg-white ${isBrandFront ? "rounded-b-[12px]" : "rounded-b-2xl"}`}>
        <button
          type="button"
          onClick={() => onDegerlendir?.(influencer.id)}
          className={
            isBrandFront
              ? "w-full rounded-xl bg-gradient-to-r from-red-500 via-red-600 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition hover:from-red-600 hover:via-red-700 hover:to-rose-700 hover:shadow-red-500/40"
              : "w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:from-amber-500 hover:via-amber-600 hover:to-yellow-600 hover:shadow-amber-500/40"
          }
        >
          Değerlendirme Yap ({influencer.reviewCount ?? 0})
        </button>
      </div>
    </article>
  );

  if (isBrandFront) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_24px_-4px_rgba(239,68,68,0.2),0_16px_40px_-12px_rgba(0,0,0,0.1)]"
        style={{
          background: "linear-gradient(135deg, #f87171 0%, #ef4444 40%, #dc2626 70%, #b91c1c 100%)",
          boxShadow: "0 0 0 1px rgba(248,113,113,0.5), 0 16px 40px -12px rgba(0,0,0,0.08)",
        }}
      >
        {/* Splash — kart boyutu kadar, çerçevenin içinde; profesyonel animasyon */}
        {showCardSplash && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Kim Getirdi Marka Önyüzü"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-[4px] z-20 flex flex-col items-center justify-center rounded-[12px] overflow-hidden"
            onClick={(e) => { e.stopPropagation(); closeSplashAndNavigate(); }}
            style={{
              background: "linear-gradient(160deg, #b91c1c 0%, #dc2626 28%, #ef4444 55%, #e11d48 82%, #be123c 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)",
            }}
          >
            {/* Üst ışık */}
            <motion.div
              className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.2)_0%,transparent_60%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              aria-hidden
            />
            {/* Parlak orb */}
            <motion.div
              className="absolute left-1/2 top-1/4 h-[120%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-white/15 to-transparent"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
              style={{ filter: "blur(28px)" }}
              aria-hidden
            />
            {/* İçerik */}
            <div className="relative z-10 flex w-full flex-1 min-h-0 flex-col items-center justify-center px-5 text-center">
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -12 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 24, delay: 0.12 }}
                className="mb-3 flex items-center justify-center rounded-2xl bg-white p-3 shadow-lg ring-2 ring-white/40"
              >
                <Image
                  src="/kimgetirdi-logo.png"
                  alt="Kim Getirdi"
                  width={240}
                  height={120}
                  className="h-20 w-auto object-contain sm:h-24"
                  unoptimized
                />
              </motion.div>
              <motion.h2
                initial={{ y: 14, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
                className="font-display text-2xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-3xl"
              >
                Kim Getirdi
              </motion.h2>
              <motion.p
                initial={{ y: 10, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.35 }}
                className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-white/95 sm:text-base"
              >
                Marka Önyüzü
              </motion.p>
              <motion.p
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.35 }}
                className="mt-5 text-xs font-medium text-white/75"
              >
                Profiline gidiliyor...
              </motion.p>
              {/* İlerleme çizgisi */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                <motion.div
                  className="h-full w-full bg-white/90"
                  style={{ transformOrigin: "left" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
                />
              </motion.div>
            </div>
          </motion.div>
        )}
        <div className="m-[4px] rounded-[12px] overflow-hidden bg-white">
          {card}
        </div>
      </div>
    );
  }

  return card;
}
