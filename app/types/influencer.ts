export interface ReelItem {
  url: string;
  views?: number;
  likes?: number;
  date?: string;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  thumbnail?: string;
  category: string;
  followers: string;
  engagement?: string;
  instagramUrl?: string;
  reels?: ReelItem[];
  /** Ana sayfada gösterilen ortalama puan (client tarafında hesaplanabilir) */
  avgRating?: number;
  /** Değerlendirme sayısı (sıralama için) */
  reviewCount?: number;
  /** Tahmini fiyat aralığı (değerlendirmelerdeki priceRange verisine göre hesaplanır) */
  estimatedPriceRange?: string;
  /** Marka önyüzü: true ise listede her zaman en üstte, premium çerçeve ve etiket ile gösterilir */
  brandFront?: boolean;
}

/** Profil sayfasında kullanılan değerlendirme */
export interface Review {
  id: string;
  businessName: string;
  stars: number;
  comment: string;
  date: string;
  /** Opsiyonel: yorumu yapanın Instagram kullanıcı adı (profil resmi için) */
  instagramHandle?: string;
  /** Yönetimdeki profil resmi gibi: unavatar URL (proxyImageUrl ile gösterilir) */
  reviewerAvatarUrl?: string;
  /** Opsiyonel: influencer ile ortak iş yapılan video linki (embed için) */
  videoUrl?: string;
  /** Opsiyonel: birlikte çalışılan fiyat aralığı (değerlendirme listesinde gösterilmez, sadece tahmini aralık hesabı için) */
  priceRange?: string;
  /** Beğeni sayısı (like) */
  likeCount?: number;
  /** Beğenmeme sayısı (dislike) */
  dislikeCount?: number;
}

/** Değerlendirme raporu (şikayet) */
export interface EvaluationReport {
  id: string;
  influencerId: string;
  reviewId: string;
  /** Rapor sebebi (kategori veya serbest metin) */
  reason: string;
  /** Açıklama */
  description: string;
  /** pending | resolved_removed | resolved_upheld */
  status: "pending" | "resolved_removed" | "resolved_upheld";
  /** Rapor tarihi (gösterim için) */
  date: string;
  /** İnceleme sonuç tarihi (gösterim için) */
  resolvedAt?: string;
  /** Yönetimde liste için: değerlendirme özeti (opsiyonel) */
  reviewSummary?: string;
}
