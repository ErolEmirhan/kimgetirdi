/**
 * Instagram Reel URL'sinden embed iframe src üretir.
 * Sitede embed ile izlenebilir; Instagram'a yönlendirme yapılmaz.
 */
export function getReelEmbedUrl(reelUrl: string): string | null {
  const trimmed = reelUrl.trim();
  if (!trimmed) return null;
  // /reel/SHORTCODE veya /reels/SHORTCODE (Instagram bazen reels kullanır)
  const match = trimmed.match(/\/reels?\/([A-Za-z0-9_-]{8,})/i);
  if (match) {
    return `https://www.instagram.com/reel/${match[1]}/embed/`;
  }
  // instagram.com veya instagr.am içeren herhangi bir reel linki
  if (/instagram|instagr\.am/i.test(trimmed)) {
    const slug = trimmed.split("/reel/")[1] || trimmed.split("/reels/")[1];
    if (slug) {
      const shortcode = slug.split("/")[0].split("?")[0].split("#")[0].trim();
      if (shortcode && /^[A-Za-z0-9_-]+$/.test(shortcode)) {
        return `https://www.instagram.com/reel/${shortcode}/embed/`;
      }
    }
  }
  return null;
}

export function isInstagramReelUrl(url: string): boolean {
  const u = url.trim();
  return /instagram|instagr\.am/i.test(u) && /\/reel(s)?\//i.test(u);
}
