import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePriceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
const stripePriceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY;

const stripe =
  stripeSecretKey && stripeSecretKey.trim().length > 0
    ? new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" })
    : null;

type CheckoutRequestBody = {
  cycle?: "monthly" | "yearly";
};

export async function POST(request: Request) {
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

    const cycle = body?.cycle === "yearly" ? "yearly" : "monthly";
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
  } catch {
    return NextResponse.json({ error: "Checkout session failed" }, { status: 500 });
  }
}
