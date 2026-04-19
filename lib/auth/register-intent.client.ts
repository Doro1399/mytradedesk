"use client";

import {
  REGISTER_INTENT_COOKIE_NAME,
  REGISTER_INTENT_VALUE,
} from "@/lib/auth/register-intent";

export function setRegisterIntentForAnalytics() {
  document.cookie = `${REGISTER_INTENT_COOKIE_NAME}=${REGISTER_INTENT_VALUE}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
