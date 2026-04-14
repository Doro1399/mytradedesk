import Link from "next/link";
import { LANDING_CONTENT_CLASS } from "@/components/landing/landing-layout";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0f18]/88 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className={`flex items-center justify-between py-4 ${LANDING_CONTENT_CLASS}`}>
        <Link
          href="/"
          className="text-2xl font-semibold tracking-[-0.03em] text-white"
        >
          MyTradeDesk
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/compare"
            className="rounded-lg px-2 py-1 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            Compare
          </Link>
          <Link
            href="/journal"
            className="rounded-lg px-2 py-1 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            Journal
          </Link>
          <a
            href="#"
            className="rounded-lg px-2 py-1 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            Discord
          </a>
          <Link
            href="/#why"
            className="rounded-lg px-2 py-1 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            Why
          </Link>
          <a
            href="#"
            className="rounded-lg px-2 py-1 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            Blog
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button className="rounded-lg px-2 py-1 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white">
            Login
          </button>
          <Link
            href="/journal"
            className="rounded-xl border border-white/15 bg-gradient-to-b from-white to-white/90 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.25)] transition active:translate-y-px hover:border-sky-400/40 hover:from-sky-50 hover:to-white"
          >
            Open workspace
          </Link>
        </div>
      </div>
    </header>
  );
}