import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";

export const CONTACT_MESSAGES_COLLECTION = "contactMessages";

export interface ContactMessageInput {
  subject: string;
  message: string;
  instagram?: string;
  phone?: string;
  email: string;
}

export interface ContactMessage {
  id: string;
  subject: string;
  message: string;
  instagram?: string;
  phone?: string;
  email: string;
  createdAt: number;
  date: string;
}

/** İletişim formundan gelen mesajı Firestore'a yazar */
export async function addContactMessage(input: ContactMessageInput): Promise<void> {
  const db = getDb();
  const email = input.email?.trim();
  if (!email) throw new Error("E-posta adresi zorunludur.");
  const col = collection(db, CONTACT_MESSAGES_COLLECTION);
  await addDoc(col, {
    subject: (input.subject ?? "").trim() || null,
    message: (input.message ?? "").trim() || null,
    instagram: (input.instagram ?? "").trim() || null,
    phone: (input.phone ?? "").trim() || null,
    email,
    createdAt: serverTimestamp(),
  });
}

/** Tüm iletişim mesajlarını getirir (en yeni önce). Yönetim paneli için. */
export async function getContactMessages(): Promise<ContactMessage[]> {
  const db = getDb();
  const col = collection(db, CONTACT_MESSAGES_COLLECTION);
  const snapshot = await getDocs(col);
  const list: ContactMessage[] = snapshot.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt?.toMillis?.() ?? 0;
    const date = data.createdAt?.toDate?.()?.toLocaleDateString?.("tr-TR") ?? "—";
    return {
      id: d.id,
      subject: data.subject ?? "",
      message: data.message ?? "",
      instagram: data.instagram ?? undefined,
      phone: data.phone ?? undefined,
      email: data.email ?? "",
      createdAt,
      date,
    };
  });
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}
