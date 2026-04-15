/** Visual language aligned with workspace / Compare — not a separate design system. */

/** Restrained motion: no bounce, 200ms ease-out. */
export const LANDING_MICRO =
  "transition-[border-color,box-shadow,transform,background-color] duration-200 ease-out";

export const LANDING_KICKER =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/85";

export const LANDING_PANEL =
  "rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)]";

/** Full-width preview blocks in landing pillars — glassy slab + soft hover lift. */
export const LANDING_PREVIEW_PLINTH =
  `${LANDING_MICRO} relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-black/35 p-1 shadow-[0_28px_80px_rgba(0,0,0,0.52),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[2px] hover:-translate-y-0.5 hover:border-cyan-500/16 hover:shadow-[0_32px_96px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-1.5`;

export const LANDING_TABLE_ROW =
  "rounded-xl border border-white/10 bg-black/25 transition-[border-color,background-color] duration-200 hover:border-sky-500/25 hover:bg-black/32";

export const LANDING_NUM = "font-mono tabular-nums tracking-tight";
