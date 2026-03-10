import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_B41kh3pS_DB8y3SoL9fNdwLmeMMbaJLQu";
const resend = new Resend(RESEND_API_KEY);

type Body = {
  to: string;
  influencerName: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://kimgetirdi.com";
}

function renderWelcomeEmailHtml(influencerName: string) {
  const baseUrl = getBaseUrl();
  const logoUrl = `${baseUrl}/kimgetirdi-logo.png`;

  return `
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KimGetirdi · Hoş geldiniz</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f5f5f7;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
        color: #0f172a;
      }
      .wrapper {
        width: 100%;
        background-color: #f5f5f7;
        padding: 32px 12px;
      }
      .card {
        max-width: 640px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 24px;
        padding: 32px 32px 28px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
      }
      .logo-row {
        display: flex;
        align-items: center;
        margin-bottom: 24px;
      }
      .logo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        overflow: hidden;
        margin-right: 12px;
      }
      .logo img {
        width: 32px;
        height: 32px;
        object-fit: contain;
        display: block;
      }
      .brand-text {
        font-size: 13px;
        line-height: 1.4;
        color: #0f172a;
        font-weight: 600;
      }
      .brand-sub {
        font-size: 11px;
        color: #6b7280;
      }
      .title {
        font-size: 22px;
        line-height: 1.3;
        font-weight: 700;
        letter-spacing: -0.02em;
        text-align: left;
        margin: 12px 0 4px;
      }
      .subtitle {
        font-size: 14px;
        line-height: 1.6;
        color: #6b7280;
        margin: 0 0 24px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        padding: 6px 12px;
        border-radius: 999px;
        background: #ecfdf3;
        color: #166534;
        margin-bottom: 16px;
      }
      .pill span {
        display: inline-block;
      }
      .pill-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background-color: #22c55e;
        margin-right: 8px;
      }
      .section {
        border-radius: 18px;
        background-color: #f9fafb;
        padding: 18px 18px 14px;
        margin-bottom: 14px;
      }
      .section-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0 0 6px;
      }
      .section-text {
        font-size: 13px;
        line-height: 1.7;
        color: #4b5563;
        margin: 0;
      }
      .button-row {
        margin: 24px 0 20px;
      }
      .button {
        display: inline-block;
        padding: 11px 22px;
        border-radius: 999px;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        color: #ffffff !important;
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .button-secondary {
        display: inline-block;
        padding: 9px 18px;
        border-radius: 999px;
        border: 1px solid #e5e7eb;
        color: #4b5563 !important;
        font-size: 12px;
        font-weight: 500;
        text-decoration: none;
        margin-left: 10px;
        background-color: #f9fafb;
      }
      .divider {
        height: 1px;
        background: linear-gradient(to right, rgba(148,163,184,0), rgba(148,163,184,0.7), rgba(148,163,184,0));
        margin: 8px 0 18px;
      }
      .meta {
        font-size: 11px;
        line-height: 1.7;
        color: #9ca3af;
      }
      .meta strong {
        color: #6b7280;
      }
      .sign {
        margin-top: 18px;
        font-size: 13px;
        line-height: 1.7;
        color: #4b5563;
      }
      .sign strong {
        display: block;
        font-size: 13px;
        color: #111827;
      }
      .footer {
        max-width: 640px;
        margin: 10px auto 0;
        text-align: center;
        font-size: 11px;
        color: #9ca3af;
      }
      a {
        color: #059669;
      }
      @media (max-width: 600px) {
        .card {
          padding: 24px 20px 22px;
          border-radius: 20px;
        }
        .title {
          font-size: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="card">
        <div class="logo-row">
          <a href="${baseUrl}" class="logo">
            <img src="${logoUrl}" alt="KimGetirdi" />
          </a>
          <div>
            <div class="brand-text">KimGetirdi</div>
            <div class="brand-sub">Influencer değerlendirme platformu</div>
          </div>
        </div>
        <div class="pill">
          <span class="pill-dot"></span>
          <span>Influencer hesabınız hazır</span>
        </div>
        <h1 class="title">${influencerName}, KimGetirdi&apos;ye hoş geldiniz.</h1>
        <p class="subtitle">
          Hesabınız başarıyla oluşturuldu. Artık iş birliği yaptığınız markalardan değerlendirme talep edebilir
          ve profilerinizi <strong style="font-weight:600;">kimgetirdi.com</strong> üzerinden takip edebilirsiniz.
        </p>

        <div class="section">
          <p class="section-title">Hesabınızla neler yapabilirsiniz?</p>
          <p class="section-text">
            • Çalıştığınız markalara profil linkinizi iletip şeffaf değerlendirme toplayabilirsiniz.<br />
            • Olumlu iş birliklerinizi tek bir yerde toplayarak markalar için güçlü bir referans oluşturursunuz.<br />
            • Platformdaki görünürlüğünüz; değerlendirmeniz, puanınız ve içerik kalitenizle birlikte artar.
          </p>
        </div>

        <div class="section">
          <p class="section-title">Profili inceleyin</p>
          <p class="section-text">
            Profilinizi güncel tutmanız, gelen iş birliği tekliflerinin kalitesini doğrudan etkiler.
            Düzenli olarak içeriklerinizi ve açıklamalarınızı kontrol etmenizi öneriyoruz.
          </p>
        </div>

        <div class="button-row">
          <a href="${baseUrl}" class="button">Profilinizi görüntüleyin</a>
          <a href="mailto:kimgetirdi@gmail.com" class="button-secondary">Destek ekibine yazın</a>
        </div>

        <div class="divider"></div>

        <div class="meta">
          <p style="margin:0 0 6px;">
            <strong>Destek</strong><br />
            Herhangi bir sorunuz olursa <a href="mailto:kimgetirdi@gmail.com">kimgetirdi@gmail.com</a>
            üzerinden bizimle iletişime geçebilirsiniz.
          </p>
          <p style="margin:0;">
            Bu e-posta, KimGetirdi platformunda hesabınız oluşturulduğu için gönderilmiştir.
          </p>
        </div>

        <div class="sign">
          <strong>KimGetirdi Ekibi</strong>
          İnfluencer değerlendirme ve iş birliği platformu
        </div>
      </div>

      <div class="footer">
        © ${new Date().getFullYear()} KimGetirdi. Tüm hakları saklıdır.
      </div>
    </div>
  </body>
</html>
`;
}

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as Body;
    const to = json.to?.trim();
    const influencerName = json.influencerName?.trim() || "Influencer";

    if (!to) {
      return NextResponse.json({ error: "E-posta adresi zorunludur." }, { status: 400 });
    }

    const html = renderWelcomeEmailHtml(influencerName);

    const { error } = await resend.emails.send({
      from: "KimGetirdi <noreply@kimgetirdi.info>",
      to,
      subject: `${influencerName}, KimGetirdi hesabınız hazır.`,
      html,
    });

    if (error) {
      console.error("Welcome email error from Resend:", error);
      return NextResponse.json({ error: "E-posta gönderilemedi." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Welcome email error", error);
    return NextResponse.json({ error: "E-posta gönderilemedi." }, { status: 500 });
  }
}

