import { propFirms } from "./prop-firms";

const LUCID_EVAL_SIZE_ORDER = ["25k", "50k", "100k", "150k"] as const;

function priceUsd(f: (typeof propFirms)[number]): number {
  return f.discountedPrice ?? f.regularPrice;
}

/** Lucid Pro / Flex eval rows — same order as compare (25k → 150k). */
function sortedLucidEvalAccount(accountName: "LucidPro" | "LucidFlex") {
  return propFirms
    .filter(
      (f) =>
        f.name === "Lucid Trading" &&
        f.accountName === accountName &&
        f.accountType === "Eval"
    )
    .sort(
      (a, b) =>
        LUCID_EVAL_SIZE_ORDER.indexOf(
          a.size as (typeof LUCID_EVAL_SIZE_ORDER)[number]
        ) -
        LUCID_EVAL_SIZE_ORDER.indexOf(
          b.size as (typeof LUCID_EVAL_SIZE_ORDER)[number]
        )
    );
}

/** Per-tier eval fees (USD) — matches compare `discountedPrice`. */
export function lucidProEvalSpecPricesUsd(): number[] {
  return sortedLucidEvalAccount("LucidPro").map(priceUsd);
}

export function lucidFlexEvalSpecPricesUsd(): number[] {
  return sortedLucidEvalAccount("LucidFlex").map(priceUsd);
}

/** Lucid Direct — same order as compare (25k → 150k). */
function sortedLucidDirect() {
  return propFirms
    .filter(
      (f) =>
        f.name === "Lucid Trading" && f.accountName === "LucidDirect"
    )
    .sort(
      (a, b) =>
        LUCID_EVAL_SIZE_ORDER.indexOf(
          a.size as (typeof LUCID_EVAL_SIZE_ORDER)[number]
        ) -
        LUCID_EVAL_SIZE_ORDER.indexOf(
          b.size as (typeof LUCID_EVAL_SIZE_ORDER)[number]
        )
    );
}

/** Per-tier Direct fees (USD) — matches compare `discountedPrice`. */
export function lucidDirectEvalSpecPricesUsd(): number[] {
  return sortedLucidDirect().map(priceUsd);
}

function tierMinMax(accountName: "LucidPro" | "LucidFlex" | "LucidDirect"): {
  min: number;
  max: number;
} {
  const rows = propFirms.filter(
    (f) => f.name === "Lucid Trading" && f.accountName === accountName
  );
  const prices = rows.map(priceUsd);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Ranges for Evaluation fees cards — min/max discounted across tiers per path. */
export function lucidEvalFeeTierRanges() {
  return {
    pro: tierMinMax("LucidPro"),
    flex: tierMinMax("LucidFlex"),
    direct: tierMinMax("LucidDirect"),
  };
}
