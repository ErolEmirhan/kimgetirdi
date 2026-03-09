"use client";

import { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { getDeviceId } from "@/lib/influencerVotes";

export default function BannedDeviceCheck() {
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    const deviceId = getDeviceId();
    if (!deviceId) return;
    const db = getDb();
    getDoc(doc(db, "bannedDevices", deviceId))
      .then((snap) => {
        if (snap.exists()) setBanned(true);
      })
      .catch(() => {});
  }, []);

  if (!banned) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 99999 }}
      className="flex flex-col items-center justify-center bg-[#0a0a0a] px-6"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Üst ince gradient çizgi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        {/* İkon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/60 ring-1 ring-red-800/60">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.93 4.93l14.14 14.14"
            />
          </svg>
        </div>

        {/* Marka */}
        <p className="font-display text-sm font-semibold tracking-widest text-white/30 uppercase">
          KimGetirdi
        </p>

        {/* Başlık */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Erişim Kısıtlandı
          </h1>
          <p className="text-sm leading-relaxed text-white/50">
            Bu cihaz, platform kullanım koşullarının ihlali nedeniyle
            süresiz olarak platformdan uzaklaştırılmıştır.
          </p>
        </div>

        {/* Ayraç */}
        <div className="w-12 border-t border-white/10" />

        {/* Alt açıklama */}
        <p className="text-xs leading-relaxed text-white/25">
          Bu kararın hatalı olduğunu düşünüyorsanız platform yönetimi ile
          iletişime geçebilirsiniz.
        </p>
      </div>

      {/* Alt gradient çizgi */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}
