"use client";

import {
  doc,
  getDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { getDeviceId } from "./influencerVotes";

const COLLECTION = "eightMart2026";
const STATS_DOC_ID = "heart";
const DEVICES_SUBCOLLECTION = "devices";

/** Gösterilen sayının başlangıç değeri (bot/seed veri gibi) */
const DISPLAY_OFFSET = 3217;

/** Kalp sayacını canlı dinler; dönen değer = Firestore count + DISPLAY_OFFSET */
export function subscribeHeartCount(callback: (count: number) => void): Unsubscribe {
  const db = getDb();
  const ref = doc(db, COLLECTION, STATS_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      const stored = snap.exists() ? (snap.data().count ?? 0) : 0;
      callback(stored + DISPLAY_OFFSET);
    },
    (err) => {
      if (typeof console !== "undefined" && console.error) {
        console.error("[8Mart2026] subscribeHeartCount error:", err);
      }
      callback(DISPLAY_OFFSET);
    }
  );
}

/** Bu cihaz daha önce kalbe tıkladı mı? */
export async function hasDeviceClicked(): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return false;
  const db = getDb();
  const deviceRef = doc(db, COLLECTION, STATS_DOC_ID, DEVICES_SUBCOLLECTION, deviceId);
  const snap = await getDoc(deviceRef);
  return snap.exists();
}

/** Kalbe tıkla: cihaz ilk kez tıklıyorsa sayacı 1 artır ve cihazı kaydet */
export async function sendHeartClick(): Promise<{ success: boolean; newCount?: number }> {
  const deviceId = getDeviceId();
  if (!deviceId) return { success: false };
  const db = getDb();
  const statsRef = doc(db, COLLECTION, STATS_DOC_ID);
  const deviceRef = doc(db, COLLECTION, STATS_DOC_ID, DEVICES_SUBCOLLECTION, deviceId);

  try {
    const newCount = await runTransaction(db, async (tx) => {
      const deviceSnap = await tx.get(deviceRef);
      const statsSnap = await tx.get(statsRef);
      if (deviceSnap.exists()) return null;
      const current = statsSnap.exists() ? (statsSnap.data().count ?? 0) : 0;
      tx.set(deviceRef, { at: serverTimestamp() });
      tx.set(statsRef, { count: current + 1, updatedAt: serverTimestamp() }, { merge: true });
      return current + 1;
    });
    return { success: newCount != null, newCount: newCount ?? undefined };
  } catch (err) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[8Mart2026] sendHeartClick error:", err);
    }
    return { success: false };
  }
}

/** Katkıyı geri al: cihaz kaydını sil, sayacı 1 azalt */
export async function removeHeartClick(): Promise<{ success: boolean }> {
  const deviceId = getDeviceId();
  if (!deviceId) return { success: false };
  const db = getDb();
  const statsRef = doc(db, COLLECTION, STATS_DOC_ID);
  const deviceRef = doc(db, COLLECTION, STATS_DOC_ID, DEVICES_SUBCOLLECTION, deviceId);

  try {
    await runTransaction(db, async (tx) => {
      const deviceSnap = await tx.get(deviceRef);
      const statsSnap = await tx.get(statsRef);
      if (!deviceSnap.exists()) return;
      const current = statsSnap.exists() ? (statsSnap.data().count ?? 0) : 0;
      const newCount = Math.max(0, current - 1);
      tx.delete(deviceRef);
      tx.set(statsRef, { count: newCount, updatedAt: serverTimestamp() }, { merge: true });
    });
    return { success: true };
  } catch (err) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[8Mart2026] removeHeartClick error:", err);
    }
    return { success: false };
  }
}
