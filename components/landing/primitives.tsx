import Link from "next/link";
import type { ReactNode } from "react";

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
    <p className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
      {children}
    </p>
  );
}

export function PrimaryCta({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_12px_40px_rgba(0,0,0,0.35)] transition hover:bg-sky-50 active:translate-y-px"
    >
      {children}
    </Link>
  );
}

export function SecondaryCta({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/80 transition hover:border-sky-400/25 hover:bg-white/[0.07] hover:text-white active:translate-y-px"
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
