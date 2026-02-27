const PLACEHOLDER_AVATAR = "https://placehold.co/96/e2e8f0/64748b?text=?";
const PLACEHOLDER_THUMB = "https://placehold.co/400x300/e2e8f0/64748b?text=Görsel";

/**
 * Instagram URL'den veya @lı metinden sadece kullanıcı adını döndürür.
 */
export function normalizeInstagramUsername(input: string | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  try {
    if (/instagram\.com|instagr\.am/i.test(raw)) {
      const url = raw.startsWith("http") ? raw : "https://" + raw.replace(/^\/+/, "");
      const pathname = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
      const firstSegment = pathname.split("/")[0];
      if (firstSegment && !/^reel|^reels|^p\//i.test(firstSegment))
        return decodeURIComponent(firstSegment);
    }
  } catch {
    /* URL parse hatası */
  }
  return raw.replace(/^@+/, "").trim();
}

/**
 * Instagram handle'dan profil sayfası URL'si (değerlendirmede "Instagram" butonu için).
 */
export function getInstagramProfileUrl(instagramHandle: string | undefined): string {
  const username = normalizeInstagramUsername(instagramHandle);
  if (!username) return "#";
  return `https://www.instagram.com/${encodeURIComponent(username)}/`;
}

/**
 * Instagram kullanıcı adından profil resmi URL'si (yönetimde "Profil Resmi URL" alanına
 * yazdığınız ile aynı: unavatar.io/instagram/xxx). Influencer avatar'ı gibi proxyImageUrl ile kullanın.
 */
export function getInstagramAvatarUrl(instagramHandle: string | undefined): string {
  const username = normalizeInstagramUsername(instagramHandle);
  if (!username) return PLACEHOLDER_AVATAR;
  return `https://unavatar.io/instagram/${encodeURIComponent(username)}`;
}

/**
 * Yorumlarda kullan: ORB (cross-origin) engelini aşmak için resim kendi API'mizden gelir.
 * img src = getReviewerAvatarApiUrl(handle) → /api/avatar?username=xxx (same-origin).
 */
export function getReviewerAvatarApiUrl(instagramHandle: string | undefined): string {
  const username = normalizeInstagramUsername(instagramHandle);
  if (!username) return PLACEHOLDER_AVATAR;
  return `/api/avatar?username=${encodeURIComponent(username)}`;
}

/**
 * Kullanıcı adının baş harfiyle oluşturulmuş avatar URL (unavatar yüklenmezse kullanılır).
 */
export function getInitialsAvatarUrl(nameOrUsername: string | undefined, size = 96): string {
  const raw = (nameOrUsername ?? "").trim();
  if (!raw) return PLACEHOLDER_AVATAR;
  const initial = raw.replace(/^@+/, "").charAt(0).toUpperCase() || "?";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&size=${size}&background=e2e8f0&color=64748b&bold=true`;
}

/**
 * Hotlink engeli olan siteler (Instagram vb.) için proxy URL.
 * placehold.co ve data: URL'leri olduğu gibi döner. / ile başlayan (same-origin) URL'ler dokunulmaz.
 */
export function proxyImageUrl(url: string | undefined): string {
  if (!url || url.startsWith("data:") || url.includes("placehold.co")) return url || PLACEHOLDER_AVATAR;
  if (url.startsWith("/")) return url;
  return "https://wsrv.nl/?url=" + encodeURIComponent(url) + "&n=-1";
}

export function getPlaceholderAvatar(): string {
  return PLACEHOLDER_AVATAR;
}

export function getPlaceholderThumb(): string {
  return PLACEHOLDER_THUMB;
}
