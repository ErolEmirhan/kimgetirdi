import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc, runTransaction, serverTimestamp, type DocumentData } from "firebase/firestore";
import { getDb, INFLUENCERS_COLLECTION } from "./firebase";
import { getDeviceId } from "./influencerVotes";
import { normalizeInstagramUsername } from "./imageUrl";
import type { Review } from "@/app/types/influencer";

const DEVICE_DAILY_REVIEWS_COLLECTION = "deviceDailyReviews";

/** YYYY-MM-DD (cihazın yerel tarihi) */
function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Bu cihaz bu influencer için bugün zaten değerlendirme yaptı mı? */
export async function canSubmitReview(influencerId: string): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return true;
  const db = getDb();
  const ref = doc(db, DEVICE_DAILY_REVIEWS_COLLECTION, `${deviceId}_${influencerId}_${getTodayDateString()}`);
  const snap = await getDoc(ref);
  return !snap.exists();
}

const REVIEWS_SUBCOLLECTION = "reviews";
const VOTE_STORAGE_PREFIX = "kg-vote-";

function voteStorageKey(influencerId: string, reviewId: string): string {
  return `${VOTE_STORAGE_PREFIX}${influencerId}-${reviewId}`;
}

/** Bu cihazda bu değerlendirme için kayıtlı oy: "like" | "dislike" | null */
export function getStoredVote(influencerId: string, reviewId: string): "like" | "dislike" | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(voteStorageKey(influencerId, reviewId));
    if (v === "like" || v === "dislike") return v;
    return null;
  } catch {
    return null;
  }
}

export interface ReviewInput {
  businessName: string;
  stars: number;
  comment?: string;
  instagramHandle?: string;
  videoUrl?: string;
  /** Opsiyonel: birlikte çalışılan fiyat aralığı (değerlendirme görünümünde gösterilmez) */
  priceRange?: string;
}

/** Yönetimdeki profil resmi ile aynı: unavatar URL (Firestore'a yazıyoruz, gösterimde proxyImageUrl kullanılır) */
function buildReviewerAvatarUrl(instagramHandle: string | undefined): string | null {
  const username = normalizeInstagramUsername(instagramHandle);
  if (!username) return null;
  return `https://unavatar.io/instagram/${encodeURIComponent(username)}`;
}

const ONE_REVIEW_PER_DEVICE_PER_DAY_MESSAGE =
  "Bu cihazdan bu influencer için bugün zaten bir değerlendirme yapıldı. Yarın tekrar deneyebilirsiniz.";

/** Influencer'a değerlendirme ekler, Firestore'a yazar. Cihaz başına günde 1 değerlendirme. */
export async function addReview(
  influencerId: string,
  input: ReviewInput
): Promise<Review> {
  const db = getDb();
  const deviceId = getDeviceId();
  const dateStr = getTodayDateString();
  const instagramHandle = input.instagramHandle?.trim() || null;
  const reviewerAvatarUrl = buildReviewerAvatarUrl(instagramHandle ?? undefined);

  const reviewCol = collection(db, INFLUENCERS_COLLECTION, influencerId, REVIEWS_SUBCOLLECTION);
  const reviewRef = doc(reviewCol);
  const dailyRef = doc(db, DEVICE_DAILY_REVIEWS_COLLECTION, `${deviceId}_${influencerId}_${dateStr}`);

  await runTransaction(db, async (tx) => {
    const dailySnap = await tx.get(dailyRef);
    if (dailySnap.exists()) throw new Error(ONE_REVIEW_PER_DEVICE_PER_DAY_MESSAGE);

    tx.set(reviewRef, {
      businessName: input.businessName.trim(),
      stars: Math.min(5, Math.max(1, input.stars)),
      comment: input.comment?.trim() || null,
      instagramHandle,
      reviewerAvatarUrl,
      videoUrl: input.videoUrl?.trim() || null,
      priceRange: input.priceRange?.trim() || null,
      likeCount: 0,
      dislikeCount: 0,
      createdAt: serverTimestamp(),
    });
    tx.set(dailyRef, { createdAt: serverTimestamp() });
  });

  const date = new Date().toLocaleDateString("tr-TR");
  return {
    id: reviewRef.id,
    businessName: input.businessName.trim(),
    stars: input.stars,
    comment: input.comment?.trim() || "",
    date,
    instagramHandle: instagramHandle ?? undefined,
    reviewerAvatarUrl: reviewerAvatarUrl ?? undefined,
    videoUrl: input.videoUrl?.trim() ?? undefined,
    likeCount: 0,
    dislikeCount: 0,
  };
}

/** Bir influencer'ın tüm değerlendirmelerini getirir (en yeni önce) */
export async function getReviews(influencerId: string): Promise<Review[]> {
  const db = getDb();
  const col = collection(db, INFLUENCERS_COLLECTION, influencerId, REVIEWS_SUBCOLLECTION);
  const snapshot = await getDocs(col);
  const list = snapshot.docs.map((doc) => docToReview(doc.id, doc.data()));
  list.sort((a, b) => {
    const docA = snapshot.docs.find((d) => d.id === a.id)?.data();
    const docB = snapshot.docs.find((d) => d.id === b.id)?.data();
    const tA = docA?.createdAt?.toMillis?.() ?? 0;
    const tB = docB?.createdAt?.toMillis?.() ?? 0;
    return tB - tA;
  });
  return list;
}

/** Değerlendirmeyi siler (yönetim rapor incelemesi sonucu kaldırma için kullanılır) */
export async function deleteReview(influencerId: string, reviewId: string): Promise<void> {
  const db = getDb();
  const ref = doc(db, INFLUENCERS_COLLECTION, influencerId, REVIEWS_SUBCOLLECTION, reviewId);
  await deleteDoc(ref);
}

/** Cihaz başına en fazla 1 oy: like veya dislike veya hiçbiri. Oy verir; yeni likeCount/dislikeCount döner. */
export async function voteReview(
  influencerId: string,
  reviewId: string,
  vote: "like" | "dislike"
): Promise<{ likeCount: number; dislikeCount: number }> {
  const db = getDb();
  const current = getStoredVote(influencerId, reviewId);
  let likeDelta = 0;
  let dislikeDelta = 0;
  let newLocal: "like" | "dislike" | null = null;
  if (vote === "like") {
    if (current === "like") {
      likeDelta = -1;
      newLocal = null;
    } else if (current === "dislike") {
      likeDelta = 1;
      dislikeDelta = -1;
      newLocal = "like";
    } else {
      likeDelta = 1;
      newLocal = "like";
    }
  } else {
    if (current === "dislike") {
      dislikeDelta = -1;
      newLocal = null;
    } else if (current === "like") {
      likeDelta = -1;
      dislikeDelta = 1;
      newLocal = "dislike";
    } else {
      dislikeDelta = 1;
      newLocal = "dislike";
    }
  }

  const ref = doc(db, INFLUENCERS_COLLECTION, influencerId, REVIEWS_SUBCOLLECTION, reviewId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Değerlendirme bulunamadı.");
    const d = snap.data();
    const curLike = typeof d.likeCount === "number" ? Math.max(0, d.likeCount) : 0;
    const curDislike = typeof d.dislikeCount === "number" ? Math.max(0, d.dislikeCount) : 0;
    const likeCount = Math.max(0, curLike + likeDelta);
    const dislikeCount = Math.max(0, curDislike + dislikeDelta);
    tx.update(ref, { likeCount, dislikeCount });
    return { likeCount, dislikeCount };
  });

  try {
    if (newLocal === null) localStorage.removeItem(voteStorageKey(influencerId, reviewId));
    else localStorage.setItem(voteStorageKey(influencerId, reviewId), newLocal);
  } catch {
    /* ignore */
  }
  return result;
}

function docToReview(id: string, data: DocumentData): Review {
  const createdAt = data.createdAt;
  const date =
    createdAt?.toDate?.()?.toLocaleDateString?.("tr-TR") ??
    new Date().toLocaleDateString("tr-TR");
  const likeCount = typeof data.likeCount === "number" ? Math.max(0, data.likeCount) : 0;
  const dislikeCount = typeof data.dislikeCount === "number" ? Math.max(0, data.dislikeCount) : 0;
  return {
    id,
    businessName: data.businessName ?? "",
    stars: typeof data.stars === "number" ? data.stars : 0,
    comment: data.comment ?? "",
    date,
    instagramHandle: data.instagramHandle ?? undefined,
    reviewerAvatarUrl: typeof data.reviewerAvatarUrl === "string" ? data.reviewerAvatarUrl : undefined,
    videoUrl: data.videoUrl ?? undefined,
    priceRange: typeof data.priceRange === "string" ? data.priceRange : undefined,
    likeCount,
    dislikeCount,
  };
}
