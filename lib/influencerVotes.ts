"use client";

import {
  doc,
  getDoc,
  runTransaction,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";

const DEVICE_ID_KEY = "kg-device-id";
const DEVICE_VOTES_COLLECTION = "deviceVotes";
const AGGREGATES_DOC = "aggregates";
const INFLUENCER_VOTES_FIELD = "influencerVotes";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Cihaz için kalıcı ID (localStorage); her cihaz 1 oy. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

/** Oy ver / oyu kaldır / oyu başka influencer'a taşı. */
export async function setInfluencerVote(influencerId: string): Promise<void> {
  const db = getDb();
  const deviceId = getDeviceId();
  if (!deviceId) return;

  const deviceRef = doc(db, DEVICE_VOTES_COLLECTION, deviceId);
  const countsRef = doc(db, AGGREGATES_DOC, INFLUENCER_VOTES_FIELD);

  await runTransaction(db, async (tx) => {
    const [deviceSnap, countsSnap] = await Promise.all([
      tx.get(deviceRef),
      tx.get(countsRef),
    ]);

    const prevInfluencerId = deviceSnap.exists()
      ? (deviceSnap.data()?.influencerId as string | undefined)
      : undefined;

    const counts: Record<string, number> = countsSnap.exists()
      ? { ...(countsSnap.data()?.counts as Record<string, number> || {}) }
      : {};

    const prevCount = prevInfluencerId ? counts[prevInfluencerId] ?? 0 : 0;
    const newCount = counts[influencerId] ?? 0;

    if (prevInfluencerId === influencerId) {
      // Aynı kişiye tıklandı: oyu kaldır
      if (prevCount > 0) counts[prevInfluencerId] = prevCount - 1;
      if (counts[prevInfluencerId] === 0) delete counts[prevInfluencerId];
      tx.set(deviceRef, { influencerId: "" });
    } else {
      // Yeni oy veya transfer
      if (prevInfluencerId && prevCount > 0) {
        counts[prevInfluencerId] = prevCount - 1;
        if (counts[prevInfluencerId] === 0) delete counts[prevInfluencerId];
      }
      counts[influencerId] = newCount + 1;
      tx.set(deviceRef, { influencerId });
    }

    tx.set(countsRef, { counts });
  });
}

/** Bir influencer'ın oy sayısını döndür (canlı değil, tek seferlik). */
export async function getInfluencerVoteCount(
  influencerId: string
): Promise<number> {
  const db = getDb();
  const ref = doc(db, AGGREGATES_DOC, INFLUENCER_VOTES_FIELD);
  const snap = await getDoc(ref);
  const counts = snap.exists() ? (snap.data()?.counts as Record<string, number>) : {};
  return counts[influencerId] ?? 0;
}

/** Tüm influencer oy sayılarını canlı dinle. */
export function subscribeVoteCounts(
  callback: (counts: Record<string, number>) => void
): Unsubscribe {
  const db = getDb();
  const ref = doc(db, AGGREGATES_DOC, INFLUENCER_VOTES_FIELD);
  return onSnapshot(ref, (snap) => {
    const counts = snap.exists()
      ? (snap.data()?.counts as Record<string, number> || {})
      : {};
    callback(counts);
  });
}

/** Bu cihazın verdiği oyu canlı dinle. */
export function subscribeMyVote(
  callback: (influencerId: string | null) => void
): Unsubscribe {
  const deviceId = getDeviceId();
  if (!deviceId) {
    callback(null);
    return () => {};
  }
  const db = getDb();
  const ref = doc(db, DEVICE_VOTES_COLLECTION, deviceId);
  return onSnapshot(ref, (snap) => {
    const id = snap.exists() ? (snap.data()?.influencerId as string) || null : null;
    callback(id);
  });
}
