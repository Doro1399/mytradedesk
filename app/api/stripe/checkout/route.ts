import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Trim + strip accidental quotes (common in .env / dashboard paste). */
function normalizeEnvValue(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim().replace(/^["']|["']$/g, "");
  return t.length > 0 ? t : undefined;
}

/**
 * Checkout + Billing API mode is driven only by `STRIPE_SECRET_KEY`, not `STRIPE_WEBHOOK_SECRET`.
 * - `sk_test_…` / `rk_test_…` → Stripe Checkout **test** (sandbox UI)
 * - `sk_live_…` / `rk_live_…` → Stripe Checkout **live**
 */
function stripeSecretKeyMode(secret: string): "live" | "test" | "unknown" {
  if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) return "live";
  if (secret.startsWith("sk_test_") || secret.startsWith("rk_test_")) return "test";
  return "unknown";
}

type CheckoutRequestBody = {
  cycle?: string;
};

export async function POST(request: Request) {
  const stripeSecretKey = normalizeEnvValue(process.env.STRIPE_SECRET_KEY);
  const stripePriceIdMonthly = normalizeEnvValue(process.env.STRIPE_PRICE_ID_MONTHLY);
  const stripePriceIdYearly = normalizeEnvValue(process.env.STRIPE_PRICE_ID_YEARLY);

  const stripe =
    stripeSecretKey && stripeSecretKey.length > 0
      ? new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" })
      : null;

  try {
    const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const origin = new URL(request.url).origin;
    if (!stripe) {
      return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawCycle = typeof body?.cycle === "string" ? body.cycle.trim().toLowerCase() : "";
    const cycle = rawCycle === "yearly" || rawCycle === "annual" ? "yearly" : "monthly";
    const selectedPriceId = cycle === "yearly" ? stripePriceIdYearly : stripePriceIdMonthly;

    if (!selectedPriceId) {
      return NextResponse.json(
        {
          error:
            cycle === "yearly" ? "Missing STRIPE_PRICE_ID_YEARLY" : "Missing STRIPE_PRICE_ID_MONTHLY",
        },
        { status: 500 }
      );
    }

    if (!selectedPriceId.startsWith("price_")) {
      return NextResponse.json(
        {
          error: `Invalid Stripe Price id for ${cycle} (must start with price_). Check your env value.`,
        },
        { status: 500 }
      );
    }

    const apiMode = stripeSecretKeyMode(stripeSecretKey ?? "");
    console.info("[stripe checkout]", { stripe_api_mode: apiMode, cycle });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: selectedPriceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        billing_cycle: cycle,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      success_url: `${origin}/checkout/success?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/desk/settings?canceled=true`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[api/stripe/checkout]", err);
    const message =
      err instanceof Stripe.errors.StripeError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Checkout session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
