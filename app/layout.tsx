import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import VisitTracker from "@/components/VisitTracker";

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

export const metadata: Metadata = {
  title: "KimGetirdi — Influencer Değerlendirme",
  description: "Influencer profillerini inceleyin ve değerlendirme yapın.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${outfit.variable} ${plusJakarta.variable}`}>
      <body className="font-sans antialiased">
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
