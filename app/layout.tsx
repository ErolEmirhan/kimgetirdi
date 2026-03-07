import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import VisitTracker from "@/components/VisitTracker";
import EightMart2026PopUp from "@/components/EightMart2026PopUp";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
  weight: ["600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kimgetirdi.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KimGetirdi — Influencer Değerlendirme | Kim Getirdi? Konya Influencer",
    template: "%s | KimGetirdi",
  },
  description:
    "Kim getirdi? Kimgetirdi ile Konya influencer, Türkiye influencer listesi ve değerlendirmeleri. Marka iş birliği yapan influencer puanları, yorumları ve kim getirdi sorusunun cevabı tek platformda.",
  keywords: [
    "influencer",
    "kim getirdi",
    "kimgetirdi",
    "konya influencer",
    "influencer değerlendirme",
    "Türkiye influencer",
    "marka iş birliği",
    "influencer puan",
    "influencer listesi",
  ],
  authors: [{ name: "KimGetirdi", url: SITE_URL }],
  creator: "KimGetirdi",
  publisher: "KimGetirdi",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: "KimGetirdi",
    title: "KimGetirdi — Influencer Değerlendirme | Kim Getirdi? Konya Influencer",
    description:
      "Kim getirdi? Konya influencer ve Türkiye influencer değerlendirmeleri. Marka iş birliği puanları ve yorumları — Kimgetirdi.",
    images: [{ url: "/kimgetirdi-logo.png", width: 512, height: 512, alt: "KimGetirdi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KimGetirdi — Influencer Değerlendirme | Kim Getirdi? Konya Influencer",
    description:
      "Kim getirdi? Konya influencer ve Türkiye influencer değerlendirmeleri. Kimgetirdi.",
    images: ["/kimgetirdi-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: SITE_URL },
  category: "business",
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KimGetirdi",
  url: SITE_URL,
  description:
    "Influencer değerlendirme platformu. Kim getirdi sorusunun cevabı; Konya influencer ve Türkiye genelinde marka iş birliği puanları.",
  logo: `${SITE_URL}/kimgetirdi-logo.png`,
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${outfit.variable} ${plusJakarta.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <VisitTracker />
        <EightMart2026PopUp />
        {children}
      </body>
    </html>
  );
}
