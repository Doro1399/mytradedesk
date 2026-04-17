import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <Suspense
        fallback={
          <div className="h-[28rem] w-full max-w-[440px] animate-pulse rounded-[1.35rem] border border-white/[0.1] bg-[#080c12]/60" />
        }
      >
        <AuthForm variant="register" />
      </Suspense>
    </AuthPageShell>
  );
}
