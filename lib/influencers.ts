import { collection, getDocs, getDoc, doc, type DocumentData } from "firebase/firestore";
import { getDb, INFLUENCERS_COLLECTION } from "./firebase";
import type { Influencer, ReelItem } from "@/app/types/influencer";

function normalizeReels(data: unknown): ReelItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item): ReelItem | null => {
      if (typeof item === "string" && item.trim()) return { url: item.trim() };
      if (item && typeof item === "object" && "url" in item && typeof (item as { url: unknown }).url === "string") {
        const o = item as { url: string; views?: number; likes?: number; date?: string };
        return { url: o.url.trim(), views: o.views, likes: o.likes, date: o.date };
      }
      return null;
    })
    .filter((r): r is ReelItem => r !== null);
}

/** Firestore'daki influencer dokümanını uygulama tipine çevirir */
function docToInfluencer(id: string, data: DocumentData): Influencer {
  const name = data.name ?? "İsimsiz";
  const username = data.username ?? "";
  const handle = username || name.toLowerCase().replace(/\s+/g, "");
  const profileImageUrl = data.profileImageUrl ?? "";
  const thumbnailUrl = data.thumbnailUrl ?? "";

  return {
    id,
    name,
    handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : name,
    avatar: profileImageUrl || "https://i.pravatar.cc/150?u=" + id,
    thumbnail: thumbnailUrl || profileImageUrl || undefined,
    category: data.category ?? "—",
    followers: data.followers ?? "—",
    engagement: data.engagement ?? undefined,
    instagramUrl: typeof data.instagramUrl === "string" ? data.instagramUrl : undefined,
    reels: normalizeReels(data.reels),
    brandFront: data.brandFront === true,
  };
}

/** Tüm influencer'ları Firestore'dan getirir */
export async function fetchInfluencers(): Promise<Influencer[]> {
  const db = getDb();
  const col = collection(db, INFLUENCERS_COLLECTION);
  const snapshot = await getDocs(col);

  const docs = [...snapshot.docs].sort((a, b) => {
    const aData = a.data();
    const bData = b.data();
    const aFront = aData.brandFront === true;
    const bFront = bData.brandFront === true;
    if (aFront && !bFront) return -1;
    if (!aFront && bFront) return 1;
    const tA = aData.createdAt?.toMillis?.() ?? 0;
    const tB = bData.createdAt?.toMillis?.() ?? 0;
    return tB - tA;
  });
  return docs.map((d) => docToInfluencer(d.id, d.data()));
}

/** Tek bir influencer'ı id ile Firestore'dan getirir */
export async function getInfluencerById(id: string): Promise<Influencer | null> {
  const db = getDb();
  const ref = doc(db, INFLUENCERS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToInfluencer(snap.id, snap.data());
}
