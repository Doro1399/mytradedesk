import {
  brandAppBaseUrl,
  dearGreetingLine,
  heyGreetingLine,
  renderBrandTransactionalEmail,
} from "@/lib/email/brand-transactional-html";

const UPGRADE_LABEL = "Upgrade to premium - $24.99/mo";

function upgradeCtaHref(): string {
  return `${brandAppBaseUrl()}/pricing`;
}

const TRIAL_COMPLIANCE =
  "You are receiving this email because you have an active MyTradeDesk Premium trial.";

export function trialReminderDay7Email(firstName: string | null): { subject: string; html: string } {
  const subject = "7 days left in your premium trial";
  const html = renderBrandTransactionalEmail({
    documentTitle: subject,
    greetingLineHtml: dearGreetingLine(firstName),
    paragraphs: [
      "You're halfway through your trial — 7 days left.",
      "By now, your data is already building inside MyTradeDesk.",
      "Take a moment to review your performance, your consistency, and your risk.",
      "That's where the real value is.",
    ],
    cta: { label: UPGRADE_LABEL, href: upgradeCtaHref() },
    complianceNote: TRIAL_COMPLIANCE,
  });
  return { subject, html };
}

export function trialReminderDay11Email(firstName: string | null): { subject: string; html: string } {
  const subject = "Your premium trial ends in 3 days";
  const html = renderBrandTransactionalEmail({
    documentTitle: subject,
    greetingLineHtml: dearGreetingLine(firstName),
    paragraphs: [
      "Your trial ends in 3 days.",
      "If you've been using MyTradeDesk, you already know what it brings: clarity and structure.",
      "If not, now's a good time to explore your dashboard before your access ends.",
    ],
    cta: { label: UPGRADE_LABEL, href: upgradeCtaHref() },
    complianceNote: TRIAL_COMPLIANCE,
  });
  return { subject, html };
}

export function trialReminderDay14Email(firstName: string | null): { subject: string; html: string } {
  const subject = "Your premium trial has ended";
  const html = renderBrandTransactionalEmail({
    documentTitle: subject,
    greetingLineHtml: heyGreetingLine(firstName),
    paragraphs: [
      "Your trial has ended.",
      "Your account has been moved to the Free plan.",
      "Your data is safe, nothing has been deleted.",
      "But some features are now locked.",
      "You can upgrade anytime to instantly regain full access to your workspace.",
    ],
    cta: { label: UPGRADE_LABEL, href: upgradeCtaHref() },
    complianceNote:
      "You are receiving this email because your MyTradeDesk Premium trial has ended.",
  });
  return { subject, html };
}
