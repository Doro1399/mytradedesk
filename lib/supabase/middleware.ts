import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeAuthRedirectPath } from "@/lib/auth/redirect";

const DESK_PREFIX = "/desk";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if ((pathname === "/login" || pathname === "/register") && user) {
    const dest = safeAuthRedirectPath(request.nextUrl.searchParams.get("next"));
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dest;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === DESK_PREFIX || pathname.startsWith(`${DESK_PREFIX}/`)) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
