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
