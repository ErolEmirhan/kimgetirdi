"use client";

import { useState } from "react";
  /** Instagram embed iframe src */
import { useIsMobile } from "@/app/hooks/useIsMobile";

  /** Orijinal reel linki (embed yoksa veya hata durumunda kullanılır) */
  /** Kart için ek wrapper class (örn. max-w-[300px]) */
type ReelEmbedProps = {
  embedUrl: string;
  videoUrl: string;
  title?: string;
  className?: string;
  containerClassName?: string;
};

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; playsinline";

/**
 * Reel: masaüstünde iframe inline; mobilde tıklayınca sitede tam ekran oynatıcı açılır (Instagram'a gitmeden).
 */
export default function ReelEmbed({
  embedUrl,
  videoUrl,
  title = "Video",
  className = "",
  containerClassName = "",
}: ReelEmbedProps) {
  const isMobile = useIsMobile();
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false);

  const iframeEl = (
    <iframe
      src={embedUrl}
      title={title}
      className={`absolute inset-0 h-full w-full border-0 ${className}`}
      allow={IFRAME_ALLOW}
      allowFullScreen
      style={{ overflow: "hidden" }}
    />
  );

  // Mobil: tıklayınca sitede tam ekran overlay ile oynat
  if (isMobile) {
    return (
      <>
        <div className={`w-full shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 ${containerClassName}`}>
          <button
            type="button"
            onClick={() => setMobileOverlayOpen(true)}
            className="relative flex aspect-[9/16] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-900 text-white transition active:opacity-90"
            aria-label="Videoyu oynat"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20" aria-hidden>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="px-4 text-center text-sm font-medium">Oynat</span>
            <span className="text-xs text-white/70">Sitede izle</span>
          </button>
        </div>

        {mobileOverlayOpen && (
          <div
            className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-black"
            role="dialog"
            aria-modal="true"
            aria-label="Video oynatıcı"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden p-4 pt-12">
              <div
                className="relative h-auto w-full max-w-[min(100%,400px)] shrink-0 overflow-hidden"
                style={{ aspectRatio: "9/16", maxHeight: "min(60vh, calc(100dvh - 11rem))" }}
              >
                <iframe
                  key={embedUrl + "-overlay"}
                  src={embedUrl}
                  title={title}
                  className="absolute inset-0 h-full w-full border-0"
                  allow={IFRAME_ALLOW}
                  allowFullScreen
                  style={{ overflow: "hidden" }}
                />
              </div>
              <p className="shrink-0 text-center text-xs text-white/60 px-4">
                Video donuyorsa aşağıdaki bağlantıdan Instagram’da açabilirsiniz.
              </p>
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                Instagram’da aç
              </a>
            </div>
            <button
              type="button"
              onClick={() => setMobileOverlayOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition hover:bg-white/30"
              aria-label="Kapat"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </>
    );
  }

  // Masaüstü: iframe doğrudan yerinde
  return (
    <div className={`w-full max-w-[300px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 ${containerClassName}`}>
      <div className="relative w-full overflow-hidden bg-slate-900" style={{ aspectRatio: "9/16" }}>
        {iframeEl}
      </div>
    </div>
  );
}
