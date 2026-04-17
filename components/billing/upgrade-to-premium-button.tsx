"use client";

import { useState } from "react";

type Props = {
  className?: string;
  cycle?: "monthly" | "yearly";
};

export function UpgradeToPremiumButton({ className, cycle = "monthly" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Could not start checkout.");
      }

      window.location.href = payload.url;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not start checkout.");
    }
  }

  return (
    <>
      <button type="button" onClick={handleCheckout} disabled={busy} className={className}>
        {busy ? "Redirecting…" : "Upgrade to Premium"}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-200/85">{error}</p> : null}
    </>
  );
}
