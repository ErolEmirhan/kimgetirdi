import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { getDb, INFLUENCERS_COLLECTION } from "./firebase";
import type { EvaluationReport } from "@/app/types/influencer";

const REPORTS_COLLECTION = "evaluationReports";
const REVIEWS_SUBCOLLECTION = "reviews";

export interface ReportInput {
  reason: string;
  description: string;
  /** Yönetim listesinde gösterilmek üzere değerlendirme özeti (opsiyonel) */
  reviewSummary?: string;
}

/** Değerlendirme hakkında rapor (şikayet) oluşturur */
export async function addReport(
  influencerId: string,
  reviewId: string,
  input: ReportInput
): Promise<EvaluationReport> {
  const db = getDb();
  const col = collection(db, REPORTS_COLLECTION);
  const ref = await addDoc(col, {
    influencerId,
    reviewId,
    reason: input.reason.trim(),
    description: input.description.trim(),
    reviewSummary: input.reviewSummary?.trim() || null,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  const date = new Date().toLocaleDateString("tr-TR");
  return {
    id: ref.id,
    influencerId,
    reviewId,
    reason: input.reason.trim(),
    description: input.description.trim(),
    status: "pending",
    date,
    reviewSummary: input.reviewSummary?.trim(),
  };
}

/** Tüm değerlendirme raporlarını getirir (en yeni önce). İnceleme için yönetim panelinde kullanılır. */
export async function getReports(): Promise<EvaluationReport[]> {
  const db = getDb();
  const col = collection(db, REPORTS_COLLECTION);
  const snapshot = await getDocs(col);
  const list = snapshot.docs.map((d) => docToReport(d.id, d.data()));
  list.sort((a, b) => {
    const docA = snapshot.docs.find((x) => x.id === a.id)?.data();
    const docB = snapshot.docs.find((x) => x.id === b.id)?.data();
    const tA = docA?.createdAt?.toMillis?.() ?? 0;
    const tB = docB?.createdAt?.toMillis?.() ?? 0;
    return tB - tA;
  });
  return list;
}

/** Raporu "Değerlendirmeyi kaldır" ile sonuçlandırır; değerlendirme silinir, rapor güncellenir. */
export async function resolveReportRemove(reportId: string): Promise<void> {
  const db = getDb();
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  const reportSnap = await getDoc(reportRef);
  if (!reportSnap.exists()) throw new Error("Rapor bulunamadı.");
  const data = reportSnap.data();
  const influencerId = data.influencerId;
  const reviewId = data.reviewId;
  if (!influencerId || !reviewId) throw new Error("Rapor verisi eksik.");
  const reviewRef = doc(db, INFLUENCERS_COLLECTION, influencerId, REVIEWS_SUBCOLLECTION, reviewId);
  await deleteDoc(reviewRef);
  await updateDoc(reportRef, {
    status: "resolved_removed",
    resolvedAt: serverTimestamp(),
  });
}

/** Raporu "Şikayet gerekçesiz" ile sonuçlandırır; değerlendirme kalır, sadece rapor güncellenir. */
export async function resolveReportUpheld(reportId: string): Promise<void> {
  const db = getDb();
  const reportRef = doc(db, REPORTS_COLLECTION, reportId);
  await updateDoc(reportRef, {
    status: "resolved_upheld",
    resolvedAt: serverTimestamp(),
  });
}

function docToReport(id: string, data: DocumentData): EvaluationReport {
  const createdAt = data.createdAt;
  const resolvedAt = data.resolvedAt;
  const date =
    createdAt?.toDate?.()?.toLocaleDateString?.("tr-TR") ??
    new Date().toLocaleDateString("tr-TR");
  const resolvedAtStr = resolvedAt?.toDate?.()?.toLocaleDateString?.("tr-TR");
  const status = data.status === "resolved_removed" || data.status === "resolved_upheld"
    ? data.status
    : "pending";
  return {
    id,
    influencerId: data.influencerId ?? "",
    reviewId: data.reviewId ?? "",
    reason: data.reason ?? "",
    description: data.description ?? "",
    status,
    date,
    resolvedAt: resolvedAtStr,
    reviewSummary: data.reviewSummary ?? undefined,
  };
}
