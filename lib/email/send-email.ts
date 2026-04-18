import { Resend } from "resend";

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

function premiumActivatedHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Premium active</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:40px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;line-height:1.6;color:#18181b;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#18181b;">MyTradeDesk</p>
              <p style="margin:0;color:#3f3f46;">Your Premium plan is now active on MyTradeDesk.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPremiumActivatedEmail(
  email: string,
): Promise<{ id: string }> {
  return sendEmail({
    to: email,
    subject: "Your Premium plan is active",
    html: premiumActivatedHtml(),
  });
}

function onboardingHtml(displayName?: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const appUrl = baseUrl.length > 0 ? baseUrl : "https://mytradedesk.app";
  const logoSrc = `${appUrl}/mtd-logo.png`;
  const trimmed = displayName?.trim() ?? "";
  const firstName = trimmed.length > 0 ? (trimmed.split(/\s+/)[0] ?? "").trim() : "";
  const dearLine =
    firstName.length > 0 ? `Dear ${escapeHtml(firstName)},` : "Dear client,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to MyTradeDesk</title>
</head>
<body style="margin:0;padding:0;background-color:#070a10;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070a10;background-image:radial-gradient(ellipse 100% 80% at 50% -20%,rgba(56,189,248,0.12),transparent 55%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.09);background-color:#080c12;box-shadow:0 24px 64px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.06);">
          <tr>
            <td style="height:4px;line-height:4px;background:linear-gradient(90deg,#22d3ee,#38bdf8,#818cf8);font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:0 12px 0 0;vertical-align:middle;">
                    <img src="${escapeHtml(logoSrc)}" width="160" height="160" alt="" style="display:block;height:42px;width:auto;max-width:160px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:600;letter-spacing:-0.03em;color:#ffffff;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">MyTradeDesk</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#e2e8f0;">${dearLine}</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#94a3b8;">Welcome to MyTradeDesk.</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#94a3b8;">You&apos;re now set up with a workspace designed to give you full clarity over your prop firm journey.</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#94a3b8;">This is where structure replaces guesswork.</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#94a3b8;">We&apos;re building something serious here and you&apos;re part of it from the start.</p>
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#94a3b8;">Your dashboard is ready.</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#94a3b8;">Let&apos;s get to work.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(180deg,rgba(56,189,248,0.95),rgba(14,165,233,0.98));box-shadow:0 1px 0 rgba(255,255,255,0.35) inset,0 12px 32px rgba(8,145,178,0.35);">
                    <a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:#0f172a;text-decoration:none;">Open MyTradeDesk</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#e2e8f0;">Julian</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#94a3b8;">Founder, MyTradeDesk</p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">You are receiving this because you just signed in to MyTradeDesk.</p>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#475569;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">© MyTradeDesk</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendOnboardingEmail(
  email: string,
  displayName?: string,
): Promise<{ id: string }> {
  return sendEmail({
    to: email,
    subject: "Welcome to MyTradeDesk — your workspace is ready",
    html: onboardingHtml(displayName),
  });
}
