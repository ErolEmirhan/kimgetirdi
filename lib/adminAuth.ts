import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";

export interface AdminSession {
  username: string;
}

const ADMIN_SESSION_STORAGE_KEY = "kg-admin-session";

export function getStoredAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (parsed && typeof parsed.username === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function loginAdmin(username: string, password: string): Promise<AdminSession> {
  const cleanUsername = username.trim();
  const cleanPassword = password;

  if (!cleanUsername || !cleanPassword) {
    throw new Error("Kullanıcı adı ve şifre zorunludur.");
  }

  // Özel admin hesabı: patron / Malemirhan121.
  const isPatron =
    cleanUsername === "patron" &&
    cleanPassword === "Malemirhan121.";

  if (!isPatron) {
    throw new Error("Kullanıcı adı veya şifre hatalı.");
  }

  const db = getDb();

  // Admin kullanıcısını Firestore'a kaydet / güncelle
  const ref = doc(db, "adminUsers", cleanUsername);
  await setDoc(
    ref,
    {
      username: cleanUsername,
      // Güvenlik açısından prod'da şifreyi plaintext saklamak önerilmez;
      // burada kullanıcı isteği doğrultusunda kayıt ediyoruz.
      password: cleanPassword,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const session: AdminSession = { username: cleanUsername };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
  }

  return session;
}

