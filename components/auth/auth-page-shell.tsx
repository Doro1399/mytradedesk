import type { ReactNode } from "react";

import Navbar from "@/components/navbar";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[#070a10] text-white antialiased">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:22px_22px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
          backgroundSize: "100% 56px, 72px 100%",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_65%)]"
        aria-hidden
      />

      <Navbar variant="auth" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        {children}
      </main>
    </div>
  );
}
