import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to MyTradeDesk with Google or a magic link to open your TradeDesk workspace.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      <Suspense
        fallback={
          <div className="h-[28rem] w-full max-w-[440px] animate-pulse rounded-[1.35rem] border border-white/[0.1] bg-[#080c12]/60" />
        }
      >
        <AuthForm variant="login" />
      </Suspense>
    </AuthPageShell>
  );
}
