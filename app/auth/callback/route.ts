import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_NEXT_COOKIE,
  safeAuthRedirectPath,
} from "@/lib/auth/redirect";

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

/**
 * PKCE cookies must be written onto the same NextResponse we return; otherwise
 * `exchangeCodeForSession` succeeds but the session is never stored and users
 * fall back to the marketing site (or a loop).
 */
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const fromQuery = searchParams.get("next");
  const fromCookie = readCookie(request, AUTH_NEXT_COOKIE);
  const next = safeAuthRedirectPath(fromQuery ?? fromCookie ?? undefined);

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  const res = NextResponse.redirect(`${origin}/login?error=auth`);
  res.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
