import type { MetadataRoute } from "next";
import { fetchInfluencers } from "@/lib/influencers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kimgetirdi.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");

  let influencerUrls: MetadataRoute.Sitemap = [];
  try {
    const influencers = await fetchInfluencers();
    influencerUrls = influencers.map((inf) => ({
      url: `${base}/influencer/${inf.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Firestore erişilemezse sadece ana sayfa
  }

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    ...influencerUrls,
  ];
}
