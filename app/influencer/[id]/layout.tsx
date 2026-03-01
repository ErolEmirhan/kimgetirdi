import type { Metadata } from "next";
import { getInfluencerById } from "@/lib/influencers";
import { getReviews } from "@/lib/reviews";
import { notFound } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kimgetirdi.com";

type Props = { params: { id: string }; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  if (!id) return {};
  const influencer = await getInfluencerById(id);
  if (!influencer) return { title: "Profil bulunamadı" };

  const title = `${influencer.name} — Influencer Değerlendirme | KimGetirdi`;
  const description =
    `${influencer.name} influencer puanı ve değerlendirmeleri. Kim getirdi? Konya ve Türkiye marka iş birliği yorumları. ${influencer.category}.`.slice(0, 160);
  const profileUrl = `${SITE_URL}/influencer/${id}`;
  const ogImage =
    influencer.thumbnail && influencer.thumbnail.startsWith("http")
      ? influencer.thumbnail
      : influencer.avatar && influencer.avatar.startsWith("http")
        ? influencer.avatar
        : `${SITE_URL}/kimgetirdi-logo.png`;

  return {
    title,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "profile",
      url: profileUrl,
      siteName: "KimGetirdi",
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: influencer.name }],
      locale: "tr_TR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function InfluencerLayout({ params, children }: Props) {
  const id = params.id;
  if (!id) return notFound();
  const influencer = await getInfluencerById(id);
  if (!influencer) return notFound();

  const reviews = await getReviews(id);
  const reviewCount = reviews.length;
  const avgRating =
    reviewCount > 0
      ? Math.round((reviews.reduce((a, r) => a + r.stars, 0) / reviewCount) * 10) / 10
      : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: influencer.name,
    url: `${SITE_URL}/influencer/${id}`,
    description: `${influencer.name} — ${influencer.category}. Influencer değerlendirme ve kim getirdi puanları.`,
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        bestRating: 5,
        worstRating: 1,
        ratingCount: reviewCount,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
