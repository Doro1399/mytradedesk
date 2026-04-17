"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabase } from "@/components/auth/supabase-provider";

/**
 * If Supabase returns tokens in the URL hash (implicit-style) on `/` or auth pages,
 * the browser client picks them up — then send the user to the desk.
 */
export function OauthHashRedirect() {
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || (!hash.includes("access_token") && !hash.includes("error"))) return;
    if (pathname !== "/" && pathname !== "/login" && pathname !== "/register") return;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.history.replaceState(null, "", pathname + window.location.search);
        router.replace("/desk/dashboard");
      }
    });
  }, [pathname, router, supabase]);

  return null;
}
