"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GA_SIGNUP_QUERY, GA_SIGNUP_VALUE } from "@/lib/analytics/ga-signup-url";
import { trackOpenDashboard, trackSignup } from "@/lib/analytics/gtag-events";

const OPEN_DASHBOARD_DEBOUNCE_MS = 2000;

function debouncedOpenDashboard() {
  if (typeof window === "undefined") return;
  const k = "mtd_ga_open_dashboard_ts";
  const now = Date.now();
  const prev = Number(sessionStorage.getItem(k) || 0);
  if (now - prev < OPEN_DASHBOARD_DEBOUNCE_MS) return;
  sessionStorage.setItem(k, String(now));
  trackOpenDashboard();
}

export function GaEventsBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const signupHandled = useRef(false);

  useEffect(() => {
    if (searchParams.get(GA_SIGNUP_QUERY) !== GA_SIGNUP_VALUE) {
      signupHandled.current = false;
      return;
    }
    if (signupHandled.current) return;
    signupHandled.current = true;
    trackSignup();
    const next = new URLSearchParams(searchParams.toString());
    next.delete(GA_SIGNUP_QUERY);
    const q = next.toString();
    const href = q ? `${pathname}?${q}` : pathname;
    router.replace(href, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (pathname !== "/desk/dashboard") return;
    if (searchParams.get(GA_SIGNUP_QUERY) === GA_SIGNUP_VALUE) return;
    debouncedOpenDashboard();
  }, [pathname, searchParams]);

  return null;
}
