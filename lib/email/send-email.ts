import { Resend } from "resend";

import { firstNameFromAuthUserId } from "@/lib/email/auth-user-first-name";
import {
  brandAppBaseUrl,
  dearGreetingLine,
  heyGreetingLine,
  renderBrandTransactionalEmail,
} from "@/lib/email/brand-transactional-html";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
};

let client: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stripOuterQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2) {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1).trim();
    }
  }
  return t;
}

/**
 * Resend expects `email@domain.com` or `Display Name <email@domain.com>` (space before `<`).
 * Normalizes common .env mistakes: smart quotes, outer quotes, extra spaces in bracket form,
 * or `Name email@domain` without angle brackets when the last token is an email.
 */
function normalizeResendFrom(raw: string): string {
  let s = stripOuterQuotes(raw.replace(/\r|\n/g, ""))
    .replace(/[\u201c\u201d\u2018\u2019]/g, '"')
    .trim();

  const bracket = s.match(/^(.*?)\s*<\s*([^>]+?)\s*>$/);
  if (bracket) {
    const display = bracket[1].trim();
    const email = bracket[2].trim();
    if (!SIMPLE_EMAIL.test(email)) {
      throw new Error(
        `From header has invalid email inside <…>. Expected a plain address, got: "${email}"`,
      );
    }
    if (display.length > 0) return `${display} <${email}>`;
    return email;
  }

  if (SIMPLE_EMAIL.test(s)) return s;

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    if (SIMPLE_EMAIL.test(last)) {
      const display = parts.slice(0, -1).join(" ");
      return `${display} <${last}>`;
    }
  }

  throw new Error(
    `RESEND_FROM / EMAIL_FROM is not a valid Resend "from" after normalization. Use email@domain.com or "MyTradeDesk <noreply@yourdomain.com>". Raw value was: ${JSON.stringify(raw)}`,
  );
}

/**
 * Resend `from`: prefers `RESEND_FROM`, then `EMAIL_FROM` (same format rules).
 */
function getDefaultFrom(): string {
  const raw = (process.env.RESEND_FROM ?? process.env.EMAIL_FROM)?.trim();
  if (!raw) {
    throw new Error(
      "Set RESEND_FROM or EMAIL_FROM (e.g. MyTradeDesk <noreply@yourdomain.com>)",
    );
  }
  return normalizeResendFrom(raw);
}

/**
 * Sends a transactional email via Resend.
 * Requires `RESEND_API_KEY` and `RESEND_FROM` or `EMAIL_FROM` in the environment.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<{ id: string }> {
  const { data, error } = await getResend().emails.send({
    from: getDefaultFrom(),
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Resend email send failed",
    );
  }

  if (!data?.id) {
    throw new Error("Resend returned no message id");
  }

  return { id: data.id };
}

function premiumActivatedHtml(firstName: string | null): string {
  return renderBrandTransactionalEmail({
    documentTitle: "Your premium plan is active",
    greetingLineHtml: heyGreetingLine(firstName),
    paragraphs: ["Your Premium plan is now active.", "You have full access to all features."],
    cta: { label: "Run my Desk", href: `${brandAppBaseUrl()}/desk/dashboard` },
    complianceNote: "You are receiving this email because your MyTradeDesk Premium subscription is active.",
  });
}

export type SendPremiumActivatedEmailOptions = {
  /** When set, first name is read from `auth.users` for the Hey line. */
  supabaseUserId?: string;
};

export async function sendPremiumActivatedEmail(
  email: string,
  options?: SendPremiumActivatedEmailOptions,
): Promise<{ id: string }> {
  let firstName: string | null = null;
  if (options?.supabaseUserId) {
    try {
      const admin = createAdminSupabaseClient();
      firstName = await firstNameFromAuthUserId(admin, options.supabaseUserId);
    } catch {
      // Missing service role env, etc. — still send with generic greeting.
    }
  }
  return sendEmail({
    to: email,
    subject: "Your premium plan is active",
    html: premiumActivatedHtml(firstName),
  });
}

function onboardingFirstName(displayName?: string): string | null {
  const t = displayName?.trim() ?? "";
  if (!t) return null;
  return t.split(/\s+/)[0]?.trim() || null;
}

function onboardingHtml(displayName?: string): string {
  const first = onboardingFirstName(displayName);
  return renderBrandTransactionalEmail({
    documentTitle: "Welcome to MyTradeDesk",
    greetingLineHtml: dearGreetingLine(first),
    paragraphs: [
      "Welcome to MyTradeDesk.",
      "You're now set up with a workspace designed to give you full clarity over your prop firm journey.",
      "This is where structure replaces guesswork.",
      "We're building something serious here and you're part of it from the start.",
      "Your dashboard is ready.",
      "Let's get to work.",
    ],
    cta: { label: "Open MyTradeDesk", href: brandAppBaseUrl() },
    complianceNote: "You are receiving this because you just signed in to MyTradeDesk.",
  });
}

export async function sendOnboardingEmail(
  email: string,
  displayName?: string,
): Promise<{ id: string }> {
  return sendEmail({
    to: email,
    subject: "Welcome to MyTradeDesk",
    html: onboardingHtml(displayName),
  });
}
