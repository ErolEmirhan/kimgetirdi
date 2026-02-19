import { NextRequest, NextResponse } from "next/server";

const PLACEHOLDER = "https://placehold.co/96/e2e8f0/64748b?text=?";

/**
 * unavatar.io cross-origin ORB hatasını önlemek için: tarayıcı sadece
 * /api/avatar?username=xxx ister, sunucu unavatar'dan çekip resmi aynı origin'de döner.
 */
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  const clean = username?.trim().replace(/^@+/, "") || "";
  if (clean.length === 0 || clean.length > 50 || /[<>"']/.test(clean)) {
    return NextResponse.redirect(PLACEHOLDER);
  }

  const unavatarUrl = `https://unavatar.io/instagram/${encodeURIComponent(clean)}`;
  try {
    const res = await fetch(unavatarUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KimGetirdi/1.0)" },
      redirect: "follow",
    });
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const isImage = res.ok && contentType.startsWith("image/");
    if (isImage) {
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > 100) {
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
    /* unavatar hatası */
  }

  return NextResponse.redirect(PLACEHOLDER);
}
