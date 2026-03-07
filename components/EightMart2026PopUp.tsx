"use client";

import { useState, useEffect, useCallback } from "react";
import {
  subscribeHeartCount,
  sendHeartClick,
  removeHeartClick,
  hasDeviceClicked,
} from "@/lib/eightMart2026";

const STORAGE_KEY = "kimgetirdi_8mart2026_closed";

const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";

/** 8 Mart 2026 (Türkiye saati) gününde mi? Geliştirme modunda her zaman true. */
function shouldShowPopUp(): boolean {
  if (isDev) return true;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return year === 2026 && month === 3 && day === 8;
}

export default function EightMart2026PopUp() {
  const [visible, setVisible] = useState(false);
  const [heartCount, setHeartCount] = useState(0);
  const [hasClicked, setHasClicked] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [showThankYouSplash, setShowThankYouSplash] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowPopUp()) return;
    try {
      if (!isDev && sessionStorage.getItem(STORAGE_KEY) === "1") return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const unsub = subscribeHeartCount(setHeartCount);
    return () => unsub();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    hasDeviceClicked().then(setHasClicked);
  }, [visible]);

  const close = useCallback(() => {
    setVisible(false);
    try {
      if (!isDev) sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }, []);

  const onHeartClick = useCallback(async () => {
    if (clicking) return;
    setClicking(true);
    if (hasClicked) {
      const { success } = await removeHeartClick();
      if (success) setHasClicked(false);
    } else {
      setHasClicked(true);
      const { success } = await sendHeartClick();
      if (success) {
        setShowThankYouSplash(true);
      } else {
        const already = await hasDeviceClicked();
        setHasClicked(already);
        if (isDev && !already) console.warn("[8Mart2026] Kalp gönderilemedi (transaction hatası).");
      }
    }
    setClicking(false);
  }, [hasClicked, clicking]);

  useEffect(() => {
    if (!showThankYouSplash) {
      setSplashVisible(false);
      return;
    }
    const start = requestAnimationFrame(() => setSplashVisible(true));
    const t = setTimeout(() => setShowThankYouSplash(false), 2500);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(t);
    };
  }, [showThankYouSplash]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eight-mart-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Teşekkür splash — sadece katkı verildiğinde */}
        {showThankYouSplash && (
          <button
            type="button"
            onClick={() => setShowThankYouSplash(false)}
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/95 via-teal-500/95 to-cyan-600/95 p-8 backdrop-blur-md transition-all duration-300 ${
              splashVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
            aria-label="Kapat"
          >
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/20 shadow-lg ring-2 ring-white/40">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </span>
            <p className="text-center font-semibold tracking-tight text-white text-xl drop-shadow-sm">
              Katkınız için teşekkür ederiz
            </p>
            <p className="mt-2 text-center text-sm font-medium text-white/90">
              Kutlamaya ortak olduğunuz için mutluyuz
            </p>
          </button>
        )}

        {/* Kapat — sağ üst çarpı */}
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-900"
          aria-label="Kapat"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Görsel — kare, tamamı görünsün */}
        <div className="relative w-full bg-stone-100">
          <img
            src="/8-mart-2026.png"
            alt="8 Mart Dünya Kadınlar Günü"
            className="w-full aspect-square object-contain object-center"
          />
        </div>

        {/* Açıklama metni */}
        <div className="px-5 pb-4 pt-2">
          <p id="eight-mart-title" className="text-center text-sm leading-relaxed text-slate-700">
            Güçleri, emekleri ve ilham veren başarılarıyla hayatın her alanında fark yaratan tüm
            kadınların <strong>8 Mart Dünya Kadınlar Günü</strong> kutlu olsun.
          </p>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
            Üreten, ilham veren ve bulunduğu her sektöre değer katan kadınların her zaman yanında
            olmaktan gurur duyuyoruz.
          </p>

          {/* Kalp + sayaç */}
          <div className="mt-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onHeartClick}
              disabled={clicking}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 transition ${
                hasClicked
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-70"
              }`}
              aria-label={hasClicked ? "Katkıyı geri al" : "Kalp gönder"}
            >
              {hasClicked ? (
                <svg className="h-7 w-7 text-emerald-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span className="font-semibold tabular-nums">
                {heartCount > 0 ? heartCount : "—"}
              </span>
            </button>
            <p className="text-xs text-slate-400">
              {hasClicked ? "Katkıyı geri almak için tekrar tıklayın" : "Kalbe tıklayarak kutlamaya katılın"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
