"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * When `NEXT_PUBLIC_*` are unset (e.g. Vercel build without env yet, or prerender of `/_not-found`),
 * use a non-throwing placeholder so `next build` can finish. Configure real keys in Vercel
 * Project → Settings → Environment Variables for runtime auth.
 */
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
/** Public anon JWT from Supabase local demo stack — only used as a parseable placeholder, not a live project. */
const BUILD_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) {
    return createBrowserClient(url, key);
  }
  // En `next dev`, ne pas rediriger vers placeholder.supabase.co (DNS introuvable) : erreur explicite.
  if (process.env.NODE_ENV === "development") {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!key) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    throw new Error(
      `Missing ${missing.join(" and ")} in .env.local (Supabase → Project Settings → API). ` +
        "URL = project base only, e.g. https://xxxxx.supabase.co (no …/rest/v1/). " +
        "Key = anon public JWT (eyJ…) or publishable key (sb_publishable_…) from the same page."
    );
  }
  return createBrowserClient(BUILD_PLACEHOLDER_URL, BUILD_PLACEHOLDER_ANON_KEY);
}
