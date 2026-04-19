/**
 * GA4 custom events (client). Requires gtag from root `layout.tsx` (production).
 * Measurement id: `NEXT_PUBLIC_GA_ID` (inlined at build).
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function isGaProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function trackGaEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>
): void {
  if (!isGaProduction()) return;
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", name, params ?? {});
  } catch {
    /* ignore */
  }
}

export function trackSignup(params?: Record<string, string | number | boolean | undefined>) {
  trackGaEvent("signup", params);
}

export function trackOpenDashboard(
  params?: Record<string, string | number | boolean | undefined>
) {
  trackGaEvent("open_dashboard", params);
}

export function trackUpgradePremium(
  params?: Record<string, string | number | boolean | undefined>
) {
  trackGaEvent("upgrade_premium", params);
}
