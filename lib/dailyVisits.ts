import { getDb } from "@/lib/firebase";
import { doc, setDoc, increment } from "firebase/firestore";

export const DAILY_VISITS_COLLECTION = "dailyVisits";

/** Bugünün tarih anahtarı (YYYY-MM-DD). */
export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Site ziyaretini bugünün sayacına +1 ekler. Client'tan çağrılır (oturumda bir kez).
 */
export async function recordVisit(): Promise<void> {
  const db = getDb();
  const today = getTodayKey();
  const ref = doc(db, DAILY_VISITS_COLLECTION, today);
  await setDoc(ref, { count: increment(1), date: today }, { merge: true });
}
