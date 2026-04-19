"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackUpgradePremium } from "@/lib/analytics/gtag-events";

export function GaCheckoutSuccessTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sid = searchParams.get("session_id") ?? "";
    const k = `mtd_ga_upgrade_${sid || "na"}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(k)) return;
    if (typeof window !== "undefined") sessionStorage.setItem(k, "1");
    trackUpgradePremium(sid ? { session_id: sid } : undefined);
  }, [searchParams]);

  return null;
}
