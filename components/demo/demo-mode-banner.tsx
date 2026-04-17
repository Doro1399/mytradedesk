"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function DemoModeBanner() {
  const router = useRouter();

  const leaveDemo = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-white/[0.07] bg-[#0c1018] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
      <p className="min-w-0 text-[13px] leading-snug text-slate-400 sm:flex-1 sm:text-[13px]">
        <span className="font-medium text-slate-300">Demo mode</span>
        {" — "}
        This is example data. Run your desk to track your own accounts.
      </p>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Link
          href="/register?next=/desk/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-900 transition hover:bg-white"
        >
          Run my Desk
          <span aria-hidden>→</span>
        </Link>
        <button
          type="button"
          onClick={leaveDemo}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
          aria-label="Close demo and return to home"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
