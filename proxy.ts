import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Next.js 16+ convention (replaces root `middleware.ts`). Refreshes Supabase auth cookies + desk guard. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     * Needed so auth cookies stay fresh on navigation.
     */
    // Exclude all `/api/*` (see Next.js proxy docs) — webhooks must not hit OAuth/session logic.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
