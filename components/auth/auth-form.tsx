"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { setAuthNextCookieClient } from "@/lib/auth/auth-next-cookie.client";
import { safeAuthRedirectPath } from "@/lib/auth/redirect";
import { useSupabase } from "@/components/auth/supabase-provider";
import { LANDING_MICRO } from "@/components/landing/tokens";

/** OAuth / magic-link redirects must use the tab’s origin so dev (any host/port), previews, and prod all match Supabase allow-listed URLs. */
function getAuthOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

const fieldClass =
  "w-full rounded-xl border border-white/12 bg-black/35 px-3.5 py-2.5 text-sm text-white placeholder:text-white/32 outline-none transition focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/20";

const labelClass = "block text-[11px] font-semibold tracking-wide text-white/90";

const socialBtnClass = `flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${LANDING_MICRO} hover:border-sky-400/25 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_0_1px_rgba(56,189,248,0.12)] disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-px`;

const primaryCtaClass = `w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_12px_40px_rgba(0,0,0,0.35)] ${LANDING_MICRO} hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,0_18px_52px_rgba(0,0,0,0.42),0_0_0_1px_rgba(34,211,238,0.18),0_0_48px_rgba(34,211,238,0.18)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white disabled:hover:shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_12px_40px_rgba(0,0,0,0.35)] active:translate-y-px`;

function OrContinueWith() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-white/[0.1]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[#080c12] px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/75">
          Or continue with
        </span>
      </div>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export type AuthFormVariant = "login" | "register";

export function AuthForm({ variant }: { variant: AuthFormVariant }) {
  const supabase = useSupabase();
  const searchParams = useSearchParams();
  const next = useMemo(
    () => safeAuthRedirectPath(searchParams.get("next")),
    [searchParams]
  );
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState<"google" | "magic" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorParam === "auth" ? "Sign-in failed. Try again." : null
  );

  const nextQuery = useMemo(() => {
    const q = new URLSearchParams();
    q.set("next", next);
    return q.toString();
  }, [next]);

  async function signInWithGoogle() {
    setError(null);
    setMessage(null);
    setBusy("google");
    setAuthNextCookieClient(next);
    const origin = getAuthOrigin();
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(null);
    if (e) setError(e.message);
  }

  async function sendMagicLink() {
    setError(null);
    setMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email.");
      return;
    }
    setBusy("magic");
    setAuthNextCookieClient(next);
    const origin = getAuthOrigin();
    const { error: e } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        ...(variant === "register" && fullName.trim()
          ? { data: { full_name: fullName.trim() } }
          : {}),
      },
    });
    setBusy(null);
    if (e) {
      setError(e.message);
      return;
    }
    setMessage("Check your inbox for the sign-in link.");
  }

  const isRegister = variant === "register";

  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      <div
        className={`rounded-[1.35rem] border border-white/[0.11] bg-gradient-to-b from-white/[0.06] to-transparent p-px shadow-[0_32px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] ${LANDING_MICRO}`}
      >
        <div className="relative rounded-[1.28rem] bg-[#080c12]/96 px-7 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_0_0_1px_rgba(255,255,255,0.02)] sm:px-9 sm:py-10">
          <div
            className="pointer-events-none absolute inset-0 rounded-[1.28rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.06),transparent_58%)]"
            aria-hidden
          />
          <div className="relative">
            {isRegister ? (
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                  Create an account
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
                  Start tracking your prop firm accounts
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                  MyTradeDesk
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
                  Enter your email to access your account
                </p>
              </div>
            )}

            <div className="space-y-4">
              {isRegister ? (
                <div>
                  <label htmlFor="auth-full-name" className={labelClass}>
                    Full name <span className="font-normal text-white/40">(optional)</span>
                  </label>
                  <input
                    id="auth-full-name"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Smith"
                    className={`${fieldClass} mt-1.5`}
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor="auth-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`${fieldClass} mt-1.5`}
                />
              </div>

              <button
                type="button"
                onClick={() => void sendMagicLink()}
                disabled={busy !== null}
                className={`${primaryCtaClass} mt-1`}
              >
                {busy === "magic" ? "Sending…" : isRegister ? "Create account" : "Sign in"}
              </button>
            </div>

            <div className="mt-8 space-y-5">
              <OrContinueWith />

              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={busy !== null}
                className={socialBtnClass}
              >
                {busy === "google" ? (
                  "Redirecting…"
                ) : (
                  <>
                    <GoogleMark className="shrink-0" />
                    Google
                  </>
                )}
              </button>
            </div>

            {message ? (
              <p className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2.5 text-sm text-emerald-100/95">
                {message}
              </p>
            ) : null}
            {error ? (
              <p className="mt-6 rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2.5 text-sm text-rose-100/95">
                {error}
              </p>
            ) : null}

            <div className="mt-8 border-t border-white/[0.08] pt-6 text-center text-sm text-slate-400">
              {isRegister ? (
                <p>
                  Already have an account?{" "}
                  <Link
                    href={`/login?${nextQuery}`}
                    className={`font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline ${LANDING_MICRO}`}
                  >
                    Sign in
                  </Link>
                </p>
              ) : (
                <div className="space-y-3">
                  <p>
                    Don&apos;t have an account?{" "}
                    <Link
                      href={`/register?${nextQuery}`}
                      className={`font-medium text-sky-300/90 underline-offset-4 transition hover:text-sky-200 hover:underline ${LANDING_MICRO}`}
                    >
                      Sign up
                    </Link>
                  </p>
                  <p>
                    <Link
                      href="/demo"
                      className={`text-slate-500 transition hover:text-slate-300 ${LANDING_MICRO}`}
                    >
                      Or try the demo first <span aria-hidden>→</span>
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
