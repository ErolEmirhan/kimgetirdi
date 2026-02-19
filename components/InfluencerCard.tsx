"use client";

import type { Influencer } from "@/app/types/influencer";
import { proxyImageUrl, getPlaceholderAvatar, getPlaceholderThumb } from "@/lib/imageUrl";
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

  return (
    <article className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-lg shadow-slate-200/50 ring-1 ring-slate-100 card-hover">
      {/* Thumbnail / profil alanı */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden rounded-t-2xl">
        <img
          src={thumbSrc}
          alt={influencer.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = getPlaceholderThumb();
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
        {/* Sol üst — sıra numarası */}
        {rank != null && (
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
        )}
        {/* Sağ üst — yıldız puanı, kocaman ve şık */}
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-white/30 bg-white/95 px-5 py-3 shadow-xl backdrop-blur-md">
          <span className="text-3xl leading-none text-amber-500" aria-hidden>
            ★
          </span>
          <span className="font-display text-3xl font-bold tabular-nums tracking-tight text-slate-800">
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
                  e.currentTarget.src = getPlaceholderAvatar();
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
          className="absolute right-3 bottom-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40"
        >
          Profili İncele
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      {/* İçerik */}
      <div className="p-4 bg-white rounded-b-2xl">
        <button
          type="button"
          onClick={() => onDegerlendir?.(influencer.id)}
          className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:from-amber-500 hover:via-amber-600 hover:to-yellow-600 hover:shadow-amber-500/40"
        >
          Değerlendirme Yap ({influencer.reviewCount ?? 0})
        </button>
      </div>
    </article>
  );
}
