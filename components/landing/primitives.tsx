import Link from "next/link";
import type { ReactNode } from "react";

import { LANDING_MICRO } from "./tokens";

const glassBase =
  "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300";

export function GlassPanel({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`${glassBase} ${hover ? "hover:border-sky-500/20 hover:bg-white/[0.045] hover:shadow-[0_28px_90px_rgba(0,0,0,0.5)]" : ""} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_38%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex max-w-[min(100%,22rem)] flex-wrap items-center justify-center gap-x-1 rounded-full border border-white/14 bg-white/[0.06] px-2.5 py-1 text-center text-[10px] font-medium uppercase leading-snug tracking-[0.14em] text-slate-200/72 min-[400px]:px-3 min-[400px]:text-[11px] min-[400px]:tracking-[0.18em] sm:tracking-[0.18em]">
      {children}
    </p>
  );
}

export function PrimaryCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_12px_40px_rgba(0,0,0,0.35)] ${LANDING_MICRO} hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,0_18px_52px_rgba(0,0,0,0.42),0_0_0_1px_rgba(34,211,238,0.18),0_0_48px_rgba(34,211,238,0.2)] active:translate-y-px ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/80 transition-[border-color,background-color,color,box-shadow] duration-200 ease-out hover:border-sky-400/25 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)] active:translate-y-px ${className}`}
    >
      {children}
    </Link>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline"
    >
      {children}
    </Link>
  );
}
