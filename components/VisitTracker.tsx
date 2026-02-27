"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/dailyVisits";

const VISIT_KEY = "kimgetirdi_visit_recorded";

/**
 * Ana sitede bir kez (oturum başına) ziyaret sayacını artırır.
 */
export default function VisitTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(VISIT_KEY)) return;
      recordVisit().then(
        () => sessionStorage.setItem(VISIT_KEY, "1"),
        () => {}
      );
    } catch {
      // sessizce bırak
    }
  }, []);
  return null;
}
