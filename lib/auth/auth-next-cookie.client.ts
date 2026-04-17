import { AUTH_NEXT_COOKIE } from "@/lib/auth/redirect";

/** Set before OAuth / magic-link redirect; read again in `/auth/callback` if `next` query is missing. */
export function setAuthNextCookieClient(path: string): void {
  if (typeof document === "undefined") return;
  const v = encodeURIComponent(path);
  const secure = window.location.protocol === "https:";
  document.cookie = `${AUTH_NEXT_COOKIE}=${v}; path=/; max-age=600; SameSite=Lax${secure ? "; Secure" : ""}`;
}
