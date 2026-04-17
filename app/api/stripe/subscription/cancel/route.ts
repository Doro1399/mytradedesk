import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const stripe =
  stripeSecretKey && stripeSecretKey.length > 0
    ? new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" })
    : null;

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, cancel_at_period_end")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "No billable subscription found for this account." }, { status: 400 });
  }

  if (profile.cancel_at_period_end === true) {
    return NextResponse.json({ ok: true, alreadyScheduled: true });
  }

  try {
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: syncError } = await supabase
    .from("profiles")
    .update({ cancel_at_period_end: true })
    .eq("id", user.id);

  if (syncError) {
    console.warn("[stripe cancel] local profile sync failed; webhook will catch up", syncError.message);
  }

  return NextResponse.json({ ok: true });
}
