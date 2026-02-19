"use client";

import { useState, useEffect } from "react";
import { fetchInfluencers } from "@/lib/influencers";
import { getReviews } from "@/lib/reviews";
import { getEstimatedPriceRangeFromReviews } from "@/lib/priceRange";
import type { Influencer, Review } from "@/app/types/influencer";

/** Değerlendirmelerdeki fiyat aralıklarının ortalamasını alıp en yakın banda döner */
function getEstimatedPriceRange(reviews: Review[]): string | undefined {
  const priceRanges = reviews.map((r) => r.priceRange).filter(Boolean) as string[];
  return getEstimatedPriceRangeFromReviews(priceRanges);
}

export function useInfluencers() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const data = await fetchInfluencers();
        if (cancelled) return;
        const withStats = await Promise.all(
          data.map(async (inf) => {
            try {
              const reviews = await getReviews(inf.id);
              const avg =
                reviews.length > 0
                  ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length
                  : 0;
              const estimatedPriceRange = getEstimatedPriceRange(reviews);
              return {
                ...inf,
                avgRating: Math.round(avg * 10) / 10,
                reviewCount: reviews.length,
                estimatedPriceRange,
              };
            } catch {
              return { ...inf, avgRating: 0, reviewCount: 0 };
            }
          })
        );
        if (!cancelled) setInfluencers(withStats);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Veriler yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { influencers, loading, error };
}
