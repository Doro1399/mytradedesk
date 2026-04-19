import Link from "next/link";
import { Suspense } from "react";
import { GaCheckoutSuccessTracker } from "@/components/analytics/ga-checkout-success-tracker";

export const metadata = {
  title: "Payment successful",
  description: "Your MyTradeDesk Premium subscription is active.",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="relative flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden bg-[#070a10] px-4 py-12">
      <Suspense fallback={null}>
        <GaCheckoutSuccessTracker />
      </Suspense>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-10%,rgba(56,189,248,0.12),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_100%,rgba(15,23,42,0.55),transparent_60%)]" />
      </div>
      <section className="relative z-[1] w-full max-w-xl rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300/90">Checkout complete</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Welcome to MyTradeDesk Premium
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
          Congratulations and thank you for upgrading. Your subscription is now active, and your premium features are
          ready to use.
        </p>

        <div className="mt-6 flex items-center justify-center">
          <Link
            href="/desk/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/20 px-5 py-2.5 text-sm font-semibold text-sky-50 transition hover:border-sky-300/60 hover:bg-sky-500/30"
          >
            Go to TradeDesk
          </Link>
        </div>
      </section>
    </main>
  );
}
