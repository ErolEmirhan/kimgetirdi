import { NextRequest, NextResponse } from "next/server";

/** İzin verilen host'lar (SSRF önlemi). Instagram CDN (cdninstagram + fbcdn), wsrv, placeholder vb. */
const ALLOWED_HOSTS = [
  /^scontent[.-][a-z0-9-]+\.cdninstagram\.com$/i,
  /^[a-z0-9-]+\.cdninstagram\.com$/i,
  /\.fbcdn\.net$/i, // Instagram profil görselleri: instagram.xxx.fna.fbcdn.net
  /^wsrv\.nl$/i,
  /^placehold\.co$/i,
  /^unavatar\.io$/i,
  /^i\.pravatar\.cc$/i,
  /^ui-avatars\.com$/i,
  /^firebasestorage\.googleapis\.com$/i,
  /^[a-z0-9-]+\.googleapis\.com$/i,
  /^images\.unsplash\.com$/i,
  /^picsum\.photos$/i,
];

function isUrlAllowed(targetUrl: string): boolean {
  try {
    const u = new URL(targetUrl);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.replace(/^\.+/, "");
    return ALLOWED_HOSTS.some((re) => re.test(host));
  } catch {
    return false;
  }
}

const PLACEHOLDER = "https://placehold.co/96/e2e8f0/64748b?text=?";

/**
 * Same-origin image proxy: tarayıcı sadece kimgetirdi.com/api/image ister,
 * sunucu wsrv.nl üzerinden görseli çekip döner. Böylece .com domain'inde
 * referrer/origin farkından kaynaklanan görünmeme sorunu ortadan kalkar.
 */
export async function GET(request: NextRequest) {
  // URL parametresi içinde & olabiliyor; query string'den tam değeri elle al (kesilmesin)
  const search = request.nextUrl.search || "";
  const urlEncoded =
    search.startsWith("?url=") ? search.slice(5) : request.nextUrl.searchParams.get("url") || "";
  if (!urlEncoded.trim()) {
    return NextResponse.redirect(PLACEHOLDER);
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlEncoded.trim());
  } catch {
    decoded = urlEncoded.trim();
  }

  if (!decoded || !decoded.startsWith("http") || !isUrlAllowed(decoded)) {
    return NextResponse.redirect(PLACEHOLDER);
  }

  let host = "";
  try {
    host = new URL(decoded).hostname;
  } catch {
    return NextResponse.redirect(PLACEHOLDER);
  }
  const isInstagramCdn =
    /\.fbcdn\.net$/i.test(host) || /cdninstagram\.com$/i.test(host);

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };
  if (isInstagramCdn) {
    headers["Referer"] = "https://www.instagram.com/";
    headers["Origin"] = "https://www.instagram.com";
  }

  async function tryFetchImage(url: string): Promise<NextResponse | null> {
    try {
      const res = await fetch(url, {
        headers,
        redirect: "follow",
      });
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const isImage = res.ok && contentType.startsWith("image/");
      if (isImage) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > 0) {
          return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400",
            },
          });
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  // 1) Doğrudan kaynak (Instagram CDN için Referer ile; çoğu zaman işe yarıyor)
  const directRes = await tryFetchImage(decoded);
  if (directRes) return directRes;

  // 2) wsrv.nl proxy
  const proxyUrl = "https://wsrv.nl/?url=" + encodeURIComponent(decoded) + "&n=-1";
  const proxyRes = await tryFetchImage(proxyUrl);
  if (proxyRes) return proxyRes;

  // İkisi de başarısızsa placeholder
  return NextResponse.redirect(PLACEHOLDER, 307);
}
