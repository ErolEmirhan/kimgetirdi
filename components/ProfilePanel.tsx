"use client";

import { useState, useEffect } from "react";
import type { Influencer } from "@/app/types/influencer";
import { proxyImageUrl, getPlaceholderAvatar, getPlaceholderThumb } from "@/lib/imageUrl";
import { getReelEmbedUrl, isInstagramReelUrl } from "@/lib/reelEmbed";
import ReelEmbed from "@/components/ReelEmbed";

interface ProfilePanelProps {
  influencer: Influencer;
  onClose: () => void;
}

export default function ProfilePanel({ influencer, onClose }: ProfilePanelProps) {
  const [reelModalUrl, setReelModalUrl] = useState<string | null>(null);

  const thumbUrl = influencer.thumbnail || influencer.avatar;
  const thumbSrc = thumbUrl ? proxyImageUrl(thumbUrl) : getPlaceholderThumb();
  const avatarSrc = influencer.avatar ? proxyImageUrl(influencer.avatar) : getPlaceholderAvatar();
  const reels = influencer.reels ?? [];

  const openReelModal = (url: string) => {
    if (getReelEmbedUrl(url)) setReelModalUrl(url);
  };

  useEffect(() => {
    if (reelModalUrl) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [reelModalUrl]);

  const handle = influencer.handle.startsWith("@")
    ? influencer.handle
    : influencer.handle.includes(" ")
      ? influencer.handle
      : `@${influencer.handle}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
        {/* Üst çubuk — minimalist */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="-ml-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Kapat"
          >
            <span className="text-slate-400">←</span>
            <span>Geri</span>
          </button>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Profil
          </span>
          <div className="w-16" />
        </header>

        {/* Kısa thumbnail — tam genişlik, sığdırılmış (sabit yükseklik, object-cover) */}
        <div className="relative h-24 w-full shrink-0 sm:h-28">
          <img
            src={thumbSrc}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = getPlaceholderThumb();
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
        </div>

        {/* Profil bilgisi — avatar thumbnail’e taşacak şekilde, tek satır ergonomik */}
        <div className="relative shrink-0 border-b border-slate-200/80 bg-white px-4 pb-5 pt-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-4">
            <div className="relative -mt-10 h-16 w-16 shrink-0 overflow-hidden rounded-full border-[3px] border-white bg-slate-100 shadow-md sm:h-[4.5rem] sm:w-[4.5rem]">
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
              <h1 className="truncate font-display text-lg font-semibold text-slate-900 sm:text-xl">
                {influencer.name}
              </h1>
              <p className="truncate text-sm text-slate-500">{handle}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                <span>{influencer.category}</span>
                <span>·</span>
                <span>{influencer.followers} takipçi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Videolar — net bölüm, bol boşluk */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Videolar
            </h2>
            {reels.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Henüz video eklenmemiş.</p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {reels.map((reel, index) => {
                  const url = reel.url;
                  const canEmbed = isInstagramReelUrl(url) && getReelEmbedUrl(url);
                  const handleClick = () => {
                    if (canEmbed) openReelModal(url);
                    else window.open(url, "_blank", "noopener");
                  };
                  return (
                    <li key={`${url}-${index}`}>
                      <button
                        type="button"
                        onClick={handleClick}
                        className="group w-full rounded-xl bg-white p-1.5 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:ring-slate-300 hover:shadow"
                      >
                        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-slate-100">
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-100">
                            <span
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition group-hover:bg-emerald-50 group-hover:text-emerald-600"
                              style={{ fontSize: "0.6rem" }}
                            >
                              ▶
                            </span>
                          </span>
                          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
                            {index + 1}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-[11px] text-slate-400 group-hover:text-slate-600">
                          Video {index + 1}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Reel modal — içerik viewport'a sığar, modal içi kaydırma yok */}
      {reelModalUrl && (
        <div
          className="fixed inset-0 z-[60] flex h-dvh items-center justify-center overflow-hidden bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setReelModalUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setReelModalUrl(null)}
          aria-label="Modalı kapat"
        >
          <div
            className="relative flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReelModalUrl(null)}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Kapat"
            >
              ×
            </button>
            <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden p-2 pt-10">
              {getReelEmbedUrl(reelModalUrl) && (
                <>
                  <div
                    className="w-full max-w-full overflow-hidden rounded-2xl"
                    style={{
                      aspectRatio: "9/16",
                      maxHeight: "min(calc(90dvh - 4rem), calc(100dvh - 5rem))",
                    }}
                  >
                    <iframe
                      src={getReelEmbedUrl(reelModalUrl)!}
                      title="Reel oynatıcı"
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ overflow: "hidden" }}
                    />
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-4 shrink-0 rounded-r-2xl bg-slate-900 pointer-events-none"
                    aria-hidden
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
