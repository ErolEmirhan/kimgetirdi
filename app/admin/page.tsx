"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfluencers } from "@/app/hooks/useInfluencers";
import type { Influencer } from "@/app/types/influencer";
import { getStoredAdminSession, clearAdminSession } from "@/lib/adminAuth";
import { proxyImageUrl, getPlaceholderAvatar } from "@/lib/imageUrl";

interface SelectedInfluencer extends Influencer {
  email?: string;
}

export default function AdminPage() {
  const { influencers, loading, error } = useInfluencers();
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [singleEmail, setSingleEmail] = useState("");
  const [singleSending, setSingleSending] = useState(false);
  const [singleMessage, setSingleMessage] = useState<string | null>(null);

  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkSubject, setBulkSubject] = useState("KimGetirdi · Platforma hoş geldiniz");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredAdminSession();
    if (session) {
      setAdminUsername(session.username);
    }
  }, []);

  const selectedInfluencer: SelectedInfluencer | null = useMemo(() => {
    if (!selectedId) return null;
    const inf = influencers.find((i) => i.id === selectedId);
    if (!inf) return null;
    return inf;
  }, [selectedId, influencers]);

  const handleSendWelcome = async () => {
    if (!selectedInfluencer) {
      setSingleMessage("Lütfen bir influencer seçin.");
      return;
    }
    const email = singleEmail.trim();
    if (!email) {
      setSingleMessage("Lütfen alıcı e-posta adresini yazın.");
      return;
    }
    setSingleSending(true);
    setSingleMessage(null);
    try {
      const res = await fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, influencerName: selectedInfluencer.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "E-posta gönderilemedi.");
      }
      setSingleMessage("Hoş geldiniz e-postası başarıyla gönderildi.");
    } catch (e) {
      setSingleMessage(e instanceof Error ? e.message : "E-posta gönderilemedi.");
    } finally {
      setSingleSending(false);
    }
  };

  const handleSendBulk = async () => {
    const list = bulkEmails
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (!list.length) {
      setBulkMessage("Lütfen en az bir alıcı e-posta adresi girin.");
      return;
    }
    if (!bulkSubject.trim()) {
      setBulkMessage("Lütfen bir konu başlığı girin.");
      return;
    }

    setBulkSending(true);
    setBulkMessage(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kimgetirdi.com";
      const logoUrl = `${baseUrl}/kimgetirdi-logo.png`;
      const html = `
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${bulkSubject}</title>
  </head>
  <body style="margin:0;padding:24px 0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px 26px;box-shadow:0 18px 45px rgba(15,23,42,0.16);">
      <div style="text-align:center;margin-bottom:20px;">
        <img src="${logoUrl}" alt="KimGetirdi" style="max-width:190px;height:auto;display:block;margin:0 auto;" />
      </div>
      <div style="font-size:14px;line-height:1.7;color:#374151;">
        <!-- Buraya admin panelden gönderilen HTML gövdesi yerleşir -->
        ${bulkSubject}
      </div>
    </div>
  </body>
</html>`;

      const res = await fetch("/api/email/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: list, subject: bulkSubject, html }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "E-postalar gönderilemedi.");
      }
      const data = await res.json().catch(() => ({}));
      setBulkMessage(`Toplu e-posta gönderimi tamamlandı. (${data.count ?? list.length} alıcı)`);
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : "E-postalar gönderilemedi.");
    } finally {
      setBulkSending(false);
    }
  };

  if (!adminUsername) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Bu sayfayı görmek için önce ana sayfadaki girişten patron hesabı ile giriş yapın.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span>KimGetirdi · Yönetim</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">Giriş: {adminUsername}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAdminSession();
              window.location.href = "/";
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Çıkış yap
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900">Influencer listesi</h2>
            <p className="mt-1 text-xs text-slate-500">
              Soldan bir influencer seçin, sağda e-posta gönderin.
            </p>
            <div className="mt-3 max-h-[480px] space-y-1 overflow-y-auto pr-1">
              {loading ? (
                <p className="py-4 text-sm text-slate-500">Yükleniyor…</p>
              ) : error ? (
                <p className="py-4 text-sm text-red-600">{error}</p>
              ) : influencers.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">Henüz influencer yok.</p>
              ) : (
                influencers.map((inf) => {
                  const active = selectedId === inf.id;
                  const avatar = inf.avatar ? proxyImageUrl(inf.avatar) : getPlaceholderAvatar();
                  return (
                    <button
                      type="button"
                      key={inf.id}
                      onClick={() => setSelectedId(inf.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                        active ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"
                      }`}
                    >
                      <img
                        src={avatar}
                        alt={inf.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{inf.name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {inf.handle}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Seçili influencera hoş geldiniz maili</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sağda alıcı e-postayı girin, butona bastığınızda profesyonel hoş geldiniz maili gönderilir.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Seçili influencer</label>
                  <p className="mt-1 text-sm text-slate-800">
                    {selectedInfluencer ? selectedInfluencer.name : "Henüz seçilmedi"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Alıcı e-posta</label>
                  <input
                    type="email"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder="ornek@firma.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {singleMessage && (
                  <p className="text-xs text-slate-600">{singleMessage}</p>
                )}
                <button
                  type="button"
                  disabled={singleSending}
                  onClick={handleSendWelcome}
                  className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {singleSending ? "Gönderiliyor…" : "Hoş geldiniz mailini gönder"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">Toplu HTML e-posta gönderimi</h2>
              <p className="mt-1 text-xs text-slate-500">
                Aşağıya e-posta adreslerini (virgülle veya satır satır) ve konu başlığını girerek toplu gönderim yapabilirsiniz.
              </p>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Alıcılar</label>
                  <textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    rows={4}
                    placeholder={"ornek1@firma.com, ornek2@firma.com\nornek3@firma.com"}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Konu</label>
                  <input
                    type="text"
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {bulkMessage && (
                  <p className="text-xs text-slate-600">{bulkMessage}</p>
                )}
                <button
                  type="button"
                  disabled={bulkSending}
                  onClick={handleSendBulk}
                  className="mt-1 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-60"
                >
                  {bulkSending ? "Gönderiliyor…" : "Toplu e-posta gönder"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

