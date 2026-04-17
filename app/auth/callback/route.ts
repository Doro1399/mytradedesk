import { NextResponse } from "next/server";
import {
  AUTH_NEXT_COOKIE,
  safeAuthRedirectPath,
} from "@/lib/auth/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get("cookie");
  if (!raw) return undefined;
  const prefix = `${name}=`;
  for (const part of raw.split(";")) {
    const c = part.trim();
    if (!c.startsWith(prefix)) continue;
    const v = c.slice(prefix.length);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const fromQuery = searchParams.get("next");
  const fromCookie = readCookie(request, AUTH_NEXT_COOKIE);
  const next = safeAuthRedirectPath(fromQuery ?? fromCookie ?? undefined);

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      res.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  const res = NextResponse.redirect(`${origin}/login?error=auth`);
  res.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
