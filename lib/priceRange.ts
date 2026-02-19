/** Değerlendirme formunda kullanılan fiyat aralığı seçenekleri (opsiyonel) */
export const PRICE_RANGE_OPTIONS = [
  { value: "1000-3000", label: "1.000-3.000 TL / reels" },
  { value: "3000-5000", label: "3.000-5.000 TL / reels" },
  { value: "5000-8000", label: "5.000-8.000 TL / reels" },
  { value: "8000-10000", label: "8.000-10.000 TL / reels" },
  { value: "10000+", label: "10.000 TL+ / reels" },
] as const;

export type PriceRangeKey = (typeof PRICE_RANGE_OPTIONS)[number]["value"];

/** Ana sayfa kartında kısa etiket (TL sembollü) */
export function getPriceRangeShortLabel(value: string): string {
  const map: Record<string, string> = {
    "1000-3000": "1.000-3.000 TL",
    "3000-5000": "3.000-5.000 TL",
    "5000-8000": "5.000-8.000 TL",
    "8000-10000": "8.000-10.000 TL",
    "10000+": "10.000 TL+",
  };
  return map[value] ?? value;
}

/** Her fiyat aralığının orta değeri (TL) — ortalama ve sıralama için */
export const PRICE_RANGE_MIDPOINTS: Record<string, number> = {
  "1000-3000": 2000,
  "3000-5000": 4000,
  "5000-8000": 6500,
  "8000-10000": 9000,
  "10000+": 12000,
};

/** Sıralama için sayısal değer (yoksa 0 — listenin sonuna) */
export function getPriceRangeSortValue(estimatedPriceRange: string | undefined): number {
  if (!estimatedPriceRange?.trim()) return 0;
  return PRICE_RANGE_MIDPOINTS[estimatedPriceRange.trim()] ?? 0;
}

/** Ortalama tutarı en yakın fiyat aralığı bandına eşler (band sınırları: 2.5K, 5.25K, 7.75K, 10.5K) */
function averageToNearestBand(average: number): string {
  if (average < 2500) return "1000-3000";
  if (average < 5250) return "3000-5000";
  if (average < 7750) return "5000-8000";
  if (average < 10500) return "8000-10000";
  return "10000+";
}

/** Değerlendirmelerdeki fiyat aralıklarının ortalamasını alır, en yakın banda düşer (örn. 1–3K + 8–10K → 5–8K) */
export function getEstimatedPriceRangeFromReviews(priceRanges: string[]): string | undefined {
  const valid = priceRanges.filter((r) => r?.trim());
  if (valid.length === 0) return undefined;
  const midpoints = valid
    .map((key) => PRICE_RANGE_MIDPOINTS[key.trim() as keyof typeof PRICE_RANGE_MIDPOINTS])
    .filter((n) => typeof n === "number");
  if (midpoints.length === 0) return undefined;
  const average = midpoints.reduce((a, b) => a + b, 0) / midpoints.length;
  return averageToNearestBand(average);
}

/** Fiyat aralığına göre rozet rengi: green | yellow | red (InfluencerCard'da sınıflar buna göre seçilir) */
export function getPriceRangeBadgeTier(
  value: string
): "green" | "yellow" | "red" {
  switch (value) {
    case "1000-3000":
    case "3000-5000":
      return "green";
    case "5000-8000":
      return "yellow";
    case "8000-10000":
    case "10000+":
      return "red";
    default:
      return "yellow";
  }
}
