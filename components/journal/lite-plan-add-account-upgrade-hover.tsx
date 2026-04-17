"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Lite / free: hover (or keyboard focus within) on “Add account” shows a small upgrade hint.
 */
export function LitePlanAddAccountUpgradeHover({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  if (!show) return children;

  return (
    <div className="group/lite-add-cta relative inline-flex">
      {children}
      <div
        className="pointer-events-none absolute bottom-full right-0 z-[55] flex flex-col items-end pb-2 opacity-0 transition duration-150 ease-out group-hover/lite-add-cta:pointer-events-auto group-hover/lite-add-cta:opacity-100 group-focus-within/lite-add-cta:pointer-events-auto group-focus-within/lite-add-cta:opacity-100"
        role="tooltip"
      >
        <div className="pointer-events-auto w-[min(17.5rem,calc(100vw-2rem))] rounded-xl border border-white/12 bg-[#111722] p-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-black/50">
          <p className="text-xs font-semibold text-white">Upgrade to Premium</p>
          <p className="mt-1 text-[11px] leading-snug text-white/55">
            Higher account limits and full workspace features.
          </p>
          <Link
            href="/desk/settings"
            className="mt-2 inline-flex text-[11px] font-semibold text-sky-300 transition hover:text-sky-200"
          >
            Open Settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
