/**
 * Shared dark / sky transactional layout (onboarding, trial reminders, etc.).
 *
 * **Logo URL**: mail clients cannot load `http://localhost…`. Set `EMAIL_ASSET_PUBLIC_URL`
 * (e.g. `https://www.mytradedesk.app`) on Vercel when `NEXT_PUBLIC_SITE_URL` is not a public https origin.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function brandAppBaseUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return base.length > 0 ? base : "https://mytradedesk.app";
}

/** Public https origin for `/mtd-logo.png` (embedded `<img>` in email). */
export function brandEmailAssetBaseUrl(): string {
  const explicit = process.env.EMAIL_ASSET_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (site.startsWith("https://")) return site;
  return "https://www.mytradedesk.app";
}

export function brandLogoAbsoluteUrl(): string {
  return `${brandEmailAssetBaseUrl()}/mtd-logo.png`;
}

export const DEFAULT_BRAND_SIGNATURE = {
  name: "Julian",
  titleLine: "Founder, MyTradeDesk",
} as const;

export function dearGreetingLine(firstName: string | null | undefined): string {
  const t = firstName?.trim() ?? "";
  if (t.length > 0) return `Dear ${escapeHtml(t)},`;
  return "Dear client,";
}

export function heyGreetingLine(firstName: string | null | undefined): string {
  const t = firstName?.trim() ?? "";
  if (t.length > 0) return `Hey ${escapeHtml(t)},`;
  return "Hey there,";
}

export type BrandTransactionalEmailParams = {
  documentTitle: string;
  /** First line (e.g. "Dear Anna,") — pass through `dearGreetingLine` / `heyGreetingLine` or pre-escaped fragment. */
  greetingLineHtml: string;
  /** Body copy as plain strings (escaped when rendered). */
  paragraphs: readonly string[];
  /**
   * Closing sign-off. Omit to use `DEFAULT_BRAND_SIGNATURE`. Pass `null` to hide.
   * Rendered as one block (no empty line between name and title).
   */
  signature?: { name: string; titleLine: string } | null;
  cta?: { label: string; href: string } | null;
  /** Small grey line under signature / CTA. */
  complianceNote: string;
};

export function renderBrandTransactionalEmail({
  documentTitle,
  greetingLineHtml,
  paragraphs,
  signature,
  cta,
  complianceNote,
}: BrandTransactionalEmailParams): string {
  const logoSrc = brandLogoAbsoluteUrl();
  const body = paragraphs
    .map(
      (t) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#94a3b8;">${escapeHtml(t)}</p>`,
    )
    .join("");

  const resolvedSig =
    signature === null ? null : (signature ?? DEFAULT_BRAND_SIGNATURE);
  const sigBlock =
    resolvedSig != null
      ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.45;color:#94a3b8;">
              <span style="color:#e2e8f0;font-weight:500;">${escapeHtml(resolvedSig.name)}</span><br />
              <span style="font-size:14px;color:#94a3b8;">${escapeHtml(resolvedSig.titleLine)}</span>
            </p>`
      : "";

  const ctaBlock =
    cta != null
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="border-radius:12px;background:linear-gradient(180deg,rgba(56,189,248,0.95),rgba(14,165,233,0.98));box-shadow:0 1px 0 rgba(255,255,255,0.35) inset,0 12px 32px rgba(8,145,178,0.35);">
                          <a href="${escapeHtml(cta.href)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:0.02em;color:#0f172a;text-decoration:none;">${escapeHtml(cta.label)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(documentTitle)}</title>
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
              <p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#e2e8f0;">${greetingLineHtml}</p>
              ${body}
              ${sigBlock}
              ${ctaBlock}
              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;">${escapeHtml(complianceNote)}</p>
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
