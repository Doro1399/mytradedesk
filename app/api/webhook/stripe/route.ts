/**
 * Stripe billing webhooks — Premium access is time-boxed (`premium_access_until`).
 *
 * Events to enable in Stripe Dashboard → Webhooks (exact list):
 * - `invoice.paid`
 * - `customer.subscription.updated`
 * - `customer.subscription.deleted`
 *
 * Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { ACCOUNTS_UNLIMITED_CAP, DEFAULT_ACCOUNTS_LIMIT } from "@/lib/auth/constants";
import {
  planLabelFromInterval,
  primarySubscriptionPrice,
  resolveSubscriptionIdFromInvoice,
  resolveSupabaseUserIdFromSubscriptionMetadata,
  stripeCustomerId,
  subscriptionPaidAccessUntilIso,
} from "@/lib/billing/stripe-subscription";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const listenedTypes = new Set([
  "invoice.paid",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

/** While cancel_at_period_end is true, Stripe keeps `status: active` until the period ends. */
function subscriptionGrantsPaidAccess(sub: Stripe.Subscription): boolean {
  return sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
}

async function resolveUserIdForSubscription(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sub: Stripe.Subscription
): Promise<string | null> {
  const fromMeta = resolveSupabaseUserIdFromSubscriptionMetadata(sub);
  if (fromMeta) return fromMeta;

  const { data: bySub } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (bySub?.id) return bySub.id as string;

  const cid = stripeCustomerId(sub.customer);
  if (cid) {
    const { data: byCust } = await admin.from("profiles").select("id").eq("stripe_customer_id", cid).maybeSingle();
    if (byCust?.id) return byCust.id as string;
  }
  return null;
}

async function upsertPaidPremiumFromSubscription(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  sub: Stripe.Subscription
): Promise<void> {
  const customerId = stripeCustomerId(sub.customer);
  const untilIso = subscriptionPaidAccessUntilIso(sub);
  if (!untilIso) {
    console.warn("[stripe webhook] subscription missing current_period_end", sub.id);
    return;
  }

  const { priceId, interval } = primarySubscriptionPrice(sub);
  const plan = planLabelFromInterval(interval);
  const grant = subscriptionGrantsPaidAccess(sub);

  if (!grant) {
    await expirePaidPremium(admin, userId);
    return;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      subscription_interval: interval,
      cancel_at_period_end: sub.cancel_at_period_end === true,
      premium_access_until: untilIso,
      subscription_current_period_end: untilIso,
      premium_status: "active",
      plan,
      accounts_limit: ACCOUNTS_UNLIMITED_CAP,
    })
    .eq("id", userId);

  if (error) console.error("[stripe webhook] profile update failed", userId, error.message);
}

async function expirePaidPremium(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({
      premium_status: "expired",
      plan: "lite",
      accounts_limit: DEFAULT_ACCOUNTS_LIMIT,
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_interval: null,
      premium_access_until: null,
      subscription_current_period_end: null,
    })
    .eq("id", userId)
    .eq("premium_status", "active");

  if (error) console.error("[stripe webhook] expire paid failed", userId, error.message);
}

async function handleInvoicePaid(
  stripeSdk: Stripe,
  admin: ReturnType<typeof createAdminSupabaseClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  const subId = resolveSubscriptionIdFromInvoice(invoice);
  if (!subId) return;

  const sub = await stripeSdk.subscriptions.retrieve(subId);
  const userId = await resolveUserIdForSubscription(admin, sub);
  if (!userId) {
    console.warn("[stripe webhook] invoice.paid: could not resolve user for subscription", subId);
    return;
  }

  await upsertPaidPremiumFromSubscription(admin, userId, sub);
}

async function handleSubscriptionUpdated(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sub: Stripe.Subscription
): Promise<void> {
  const userId = await resolveUserIdForSubscription(admin, sub);
  if (!userId) {
    console.warn("[stripe webhook] subscription.updated: could not resolve user", sub.id);
    return;
  }
  await upsertPaidPremiumFromSubscription(admin, userId, sub);
}

async function handleSubscriptionDeleted(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sub: Stripe.Subscription
): Promise<void> {
  const userId =
    resolveSupabaseUserIdFromSubscriptionMetadata(sub) ??
    ((
      await admin.from("profiles").select("id").eq("stripe_subscription_id", sub.id).maybeSingle()
    ).data?.id as string | undefined) ??
    null;

  if (!userId) {
    const cid = stripeCustomerId(sub.customer);
    if (cid) {
      const { data } = await admin.from("profiles").select("id").eq("stripe_customer_id", cid).maybeSingle();
      if (data?.id) await expirePaidPremium(admin, data.id as string);
    }
    return;
  }

  await expirePaidPremium(admin, userId);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripeSdk = getStripe();
    event = stripeSdk.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (!listenedTypes.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    const stripeSdk = getStripe();
    const admin = createAdminSupabaseClient();

    if (event.type === "invoice.paid") {
      await handleInvoicePaid(stripeSdk, admin, event.data.object as Stripe.Invoice);
    } else if (event.type === "customer.subscription.updated") {
      await handleSubscriptionUpdated(admin, event.data.object as Stripe.Subscription);
    } else if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(admin, event.data.object as Stripe.Subscription);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
