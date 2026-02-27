import { NextRequest, NextResponse } from "next/server";

const PLACEHOLDER = "https://placehold.co/96/e2e8f0/64748b?text=?";

/** İzin verilen host'lar (güvenlik: rastgele sitelere proxy yapmayalım) */
const ALLOWED_HOSTS = [
  "instagram.com",
  "cdninstagram.com",
  "fbcdn.net",
  "unavatar.io",
  "placehold.co",
  "pravatar.cc",
  "picsum.photos",
  "i.pravatar.cc",
  "wsrv.nl",
  "images.weserv.nl",
  "firebasestorage.googleapis.com",
  "firebasestorage.app",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
];

function isAllowedUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith("." + allowed));
  } catch {
    return false;
  }
}

/**
 * Görsel proxy: tarayıcı aynı origin'den ister, sunucu dış URL'den çekip döner.
 * Böylece deploy ortamında referrer/CORS/hotlink engeli olmaz.
 */
export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  const decoded = urlParam ? decodeURIComponent(urlParam) : "";

  if (!decoded || !decoded.startsWith("http")) {
    return NextResponse.redirect(PLACEHOLDER);
  }

  if (!isAllowedUrl(decoded)) {
    return NextResponse.redirect(PLACEHOLDER);
  }

  try {
    const res = await fetch(decoded, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KimGetirdi/1.0)",
        Accept: "image/*",
      },
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
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }
    }
  } catch {
    /* fetch hatası */
  }

  return NextResponse.redirect(PLACEHOLDER);
}
