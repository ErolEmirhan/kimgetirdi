import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { getDb, INFLUENCERS_COLLECTION } from "./firebase";

export interface InfluencerSession {
  influencerId: string;
  loginUsername: string;
}

const SESSION_STORAGE_KEY = "kg-influencer-session";

export function getStoredInfluencerSession(): InfluencerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InfluencerSession;
    if (parsed && typeof parsed.influencerId === "string" && typeof parsed.loginUsername === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearInfluencerSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function loginInfluencer(
  username: string,
  password: string
): Promise<InfluencerSession> {
  const cleanUsername = username.trim();
  const cleanPassword = password;
  if (!cleanUsername || !cleanPassword) {
    throw new Error("Kullanıcı adı ve şifre zorunludur.");
  }

  const db = getDb();
  const col = collection(db, INFLUENCERS_COLLECTION);
  const q = query(
    col,
    where("loginUsername", "==", cleanUsername),
    where("loginPassword", "==", cleanPassword),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error("Kullanıcı adı veya şifre hatalı.");
  }
  const docSnap = snap.docs[0];
  const session: InfluencerSession = {
    influencerId: docSnap.id,
    loginUsername: cleanUsername,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }

  return session;
}

