import type Stripe from "stripe";

/** Stripe unix seconds → ISO string for Postgres `timestamptz`. */
export function isoFromStripeUnixSeconds(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

type SubscriptionWithPeriod = Stripe.Subscription & { current_period_end?: number };

/**
 * End of the period the customer has already paid for.
 * Uses `current_period_end` (Stripe’s canonical field; cast tolerates narrow generated types per API version).
 */
export function subscriptionPaidAccessUntilIso(sub: Stripe.Subscription): string | null {
  const end = (sub as SubscriptionWithPeriod).current_period_end;
  return isoFromStripeUnixSeconds(end);
}

export function stripeCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer): string | null {
  if (typeof customer === "string" && customer.length > 0) return customer;
  if (customer && typeof customer === "object" && "deleted" in customer && customer.deleted) return null;
  if (customer && typeof customer === "object" && "id" in customer && typeof customer.id === "string") {
    return customer.id;
  }
  return null;
}

/** Primary recurring price on the subscription (first item). */
export function primarySubscriptionPrice(
  sub: Stripe.Subscription
): { priceId: string | null; interval: "month" | "year" | null } {
  const item = sub.items.data[0];
  const price = item?.price;
  const priceId = price?.id ?? null;
  const interval = price?.recurring?.interval;
  if (interval === "month" || interval === "year") return { priceId, interval };
  return { priceId, interval: null };
}

export function planLabelFromInterval(interval: "month" | "year" | null): string {
  if (interval === "year") return "premium_annual";
  return "premium_monthly";
}

/**
 * Resolves `sub_…` from an Invoice across Stripe API shapes (expanded object, string id,
 * parent.subscription_details, line items).
 */
type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

export function resolveSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const inv = invoice as InvoiceWithSubscription;
  const direct = inv.subscription;
  if (typeof direct === "string" && direct.length > 0) return direct;
  if (direct && typeof direct === "object" && "id" in direct && typeof direct.id === "string") {
    return direct.id;
  }

  const parentSub = (
    invoice as Stripe.Invoice & {
      parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } };
    }
  ).parent?.subscription_details?.subscription;
  if (typeof parentSub === "string" && parentSub.length > 0) return parentSub;
  if (parentSub && typeof parentSub === "object" && "id" in parentSub && typeof parentSub.id === "string") {
    return parentSub.id;
  }

  const lines = invoice.lines?.data;
  if (!lines) return null;
  for (const line of lines) {
    const lineSub = (line as Stripe.InvoiceLineItem & { subscription?: string | null }).subscription;
    if (typeof lineSub === "string" && lineSub.length > 0) return lineSub;

    const nested = (
      line as Stripe.InvoiceLineItem & {
        parent?: { subscription_item_details?: { subscription?: string | null } };
      }
    ).parent?.subscription_item_details?.subscription;
    if (typeof nested === "string" && nested.length > 0) return nested;
  }

  return null;
}

export function resolveSupabaseUserIdFromSubscriptionMetadata(sub: Stripe.Subscription): string | null {
  const m = sub.metadata ?? {};
  const v = m.supabase_user_id ?? m.user_id;
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}
