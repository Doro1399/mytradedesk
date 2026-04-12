import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import { getFundedPhaseProfitCents } from "@/lib/journal/funded-phase-pnl";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";

/** Tier « Profit Range » → sizing + DLL (funded), d’après Apex Trader Funding Rules.csv */
export type ApexScalingTier = {
  rangeLabel: string;
  minProfitUsd: number;
  maxProfitUsd: number | null;
  sizeContract: string;
  dllUsd: number | null;
};

type ApexEvalBlock = {
  /** Colonne Rules Eval (évaluation) ; « - » → affichage None. */
  rulesEval: string;
  overnightOverweek: string;
  tradingNews: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  dllEvalDisplay: string;
  targetEval: string;
};

export type ApexFundedBlock = {
  overnightOverweek: string;
  tradingNews: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  bufferUsd: number;
  payoutMiniUsd: number;
  payoutMaxiUsd: number;
  payouts1stTo6thUsd: readonly number[];
  consistency: string;
  minTradingDays: number;
  minProfitPerDayUsd: number;
  profitSplit: string;
  scalingTiers: readonly ApexScalingTier[];
};

type ApexRuleBundle = {
  eval: ApexEvalBlock;
  funded: ApexFundedBlock;
};

export function formatApexDrawdownType(raw: string): string {
  const t = raw.trim();
  if (/trail/i.test(t)) return "Trailing";
  if (t.toUpperCase() === "EOD") return "EOD";
  return t;
}

/** Colonnes CSV Yes/No → UI évaluation & funded. */
export function formatAllowedFromCsv(v: string): string {
  const x = v.trim().toLowerCase();
  if (x === "yes") return "Allowed";
  if (x === "no") return "Not allowed";
  return v.trim();
}

function formatRulesEvalDisplay(rulesEval: string): string {
  const t = rulesEval.trim();
  if (t === "-" || t === "—" || t === "") return "None";
  return t;
}

/** Affichage DLL eval : pas de limite → « None » (CSV « - », « No », etc.). */
export function formatEvalDllDisplay(display: string): string {
  const t = display.trim();
  if (t === "-" || t === "—" || t === "" || /^no$/i.test(t)) return "None";
  return t;
}

/** Colonne consistency → « Consistency 50% ». */
export function formatPayoutRulesConsistency(consistency: string): string {
  const c = consistency.trim();
  if (!c) return "Consistency —";
  if (/%\s*$/i.test(c)) return `Consistency ${c}`;
  return `Consistency ${c}%`;
}

/** Minimum trading days + profit / jour (Standard path TopStep, Mini Profit Days Apex, etc.). */
export function formatJournalMinProfitDaysLine(
  minTradingDays: number,
  minProfitPerDayUsd: number
): string {
  return `${minTradingDays} profit days: ${formatUsdWholeGrouped(minProfitPerDayUsd)}+`;
}

/** Colonnes funded Minimum tradind days & Minimum profit per day. */
function formatFundedMinProfitDays(f: ApexFundedBlock): string {
  return formatJournalMinProfitDaysLine(f.minTradingDays, f.minProfitPerDayUsd);
}

const PAYOUT_ORDINAL_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th"] as const;

/** Colonnes CSV 1st–6th (Payout requirements). */
function formatPayoutMaxiMultiline(f: ApexFundedBlock): string {
  return f.payouts1stTo6thUsd
    .map((v, i) => {
      const label = PAYOUT_ORDINAL_LABELS[i] ?? `${i + 1}th`;
      return `${label}: ${formatUsdWholeGrouped(v)}`;
    })
    .join("\n");
}

const SCALING_25K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "$0 – $999",
    minProfitUsd: 0,
    maxProfitUsd: 999,
    sizeContract: "1 mini / 10 micros",
    dllUsd: 500,
  },
  {
    rangeLabel: "$1,000 – $1,999",
    minProfitUsd: 1000,
    maxProfitUsd: 1999,
    sizeContract: "2 minis / 20 micros",
    dllUsd: 500,
  },
  {
    rangeLabel: "> $2,000",
    minProfitUsd: 2000,
    maxProfitUsd: null,
    sizeContract: "2 minis / 20 micros",
    dllUsd: 1250,
  },
];

const SCALING_50K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "$0 – $1,499",
    minProfitUsd: 0,
    maxProfitUsd: 1499,
    sizeContract: "2 minis / 20 micros",
    dllUsd: 1000,
  },
  {
    rangeLabel: "$1,500 – $2,999",
    minProfitUsd: 1500,
    maxProfitUsd: 2999,
    sizeContract: "3 minis / 30 micros",
    dllUsd: 1000,
  },
  {
    rangeLabel: "$3,000 – $5,999",
    minProfitUsd: 3000,
    maxProfitUsd: 5999,
    sizeContract: "4 minis / 40 micros",
    dllUsd: 2000,
  },
  {
    rangeLabel: "> $6,000",
    minProfitUsd: 6000,
    maxProfitUsd: null,
    sizeContract: "4 minis / 40 micros",
    dllUsd: 3000,
  },
];

const SCALING_100K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "$0 – $1,999",
    minProfitUsd: 0,
    maxProfitUsd: 1999,
    sizeContract: "3 minis / 30 micros",
    dllUsd: 1750,
  },
  {
    rangeLabel: "$2,000 – $2,999",
    minProfitUsd: 2000,
    maxProfitUsd: 2999,
    sizeContract: "4 minis / 40 micros",
    dllUsd: 1750,
  },
  {
    rangeLabel: "$3,000 – $4,999",
    minProfitUsd: 3000,
    maxProfitUsd: 4999,
    sizeContract: "5 minis / 50 micros",
    dllUsd: 1750,
  },
  {
    rangeLabel: "$5,000 – $9,999",
    minProfitUsd: 5000,
    maxProfitUsd: 9999,
    sizeContract: "6 minis / 60 micros",
    dllUsd: 2500,
  },
  {
    rangeLabel: "> $10,000",
    minProfitUsd: 10000,
    maxProfitUsd: null,
    sizeContract: "6 minis / 60 micros",
    dllUsd: 3500,
  },
];

const SCALING_150K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "$0 – $1,999",
    minProfitUsd: 0,
    maxProfitUsd: 1999,
    sizeContract: "4 minis / 40 micros",
    dllUsd: 2500,
  },
  {
    rangeLabel: "$2,000 – $2,999",
    minProfitUsd: 2000,
    maxProfitUsd: 2999,
    sizeContract: "5 minis / 50 micros",
    dllUsd: 2500,
  },
  {
    rangeLabel: "$3,000 – $4,999",
    minProfitUsd: 3000,
    maxProfitUsd: 4999,
    sizeContract: "7 minis / 70 micros",
    dllUsd: 2500,
  },
  {
    rangeLabel: "$5,000 – $9,999",
    minProfitUsd: 5000,
    maxProfitUsd: 9999,
    sizeContract: "10 minis / 100 micros",
    dllUsd: 3000,
  },
  {
    rangeLabel: "> $10,000",
    minProfitUsd: 10000,
    maxProfitUsd: null,
    sizeContract: "10 minis / 100 micros",
    dllUsd: 4000,
  },
];

const FUNDED_25K: ApexFundedBlock = {
  overnightOverweek: "No",
  tradingNews: "Yes",
  drawdownTypeRaw: "EOD",
  maxDrawdownUsd: 1000,
  bufferUsd: 1100,
  payoutMiniUsd: 500,
  payoutMaxiUsd: 1000,
  payouts1stTo6thUsd: [1000, 1000, 1000, 1000, 1000, 1000],
  consistency: "50%",
  minTradingDays: 5,
  minProfitPerDayUsd: 100,
  profitSplit: "100%",
  scalingTiers: SCALING_25K,
};

const FUNDED_50K: ApexFundedBlock = {
  overnightOverweek: "No",
  tradingNews: "Yes",
  drawdownTypeRaw: "EOD",
  maxDrawdownUsd: 2000,
  bufferUsd: 2100,
  payoutMiniUsd: 500,
  /** Colonne CSV Payout maxi (même montant que le 1er palier affiché en 1st). */
  payoutMaxiUsd: 1500,
  /** Ligne CSV : $1 500,$2 000,$2 500,$2 500,$3 000,$3 000 après Payout mini. */
  payouts1stTo6thUsd: [1500, 2000, 2500, 2500, 3000, 3000],
  consistency: "50%",
  minTradingDays: 5,
  minProfitPerDayUsd: 200,
  profitSplit: "100%",
  scalingTiers: SCALING_50K,
};

const FUNDED_100K: ApexFundedBlock = {
  overnightOverweek: "No",
  tradingNews: "Yes",
  drawdownTypeRaw: "EOD",
  maxDrawdownUsd: 3000,
  bufferUsd: 3100,
  payoutMiniUsd: 500,
  payoutMaxiUsd: 2000,
  /** Ligne CSV : $2 000,$2 500,$3 000,$3 000,$4 000,$4 000 après Payout mini. */
  payouts1stTo6thUsd: [2000, 2500, 3000, 3000, 4000, 4000],
  consistency: "50%",
  minTradingDays: 5,
  minProfitPerDayUsd: 250,
  profitSplit: "100%",
  scalingTiers: SCALING_100K,
};

const FUNDED_150K: ApexFundedBlock = {
  overnightOverweek: "No",
  tradingNews: "Yes",
  drawdownTypeRaw: "EOD",
  maxDrawdownUsd: 4000,
  bufferUsd: 4100,
  payoutMiniUsd: 500,
  payoutMaxiUsd: 2500,
  /** Ligne CSV : $2 500,$3 000,$3 000,$4 000,$4 000,$5 000 après Payout mini. */
  payouts1stTo6thUsd: [2500, 3000, 3000, 4000, 4000, 5000],
  consistency: "50%",
  minTradingDays: 5,
  minProfitPerDayUsd: 300,
  profitSplit: "100%",
  scalingTiers: SCALING_150K,
};

function cloneFundedWithTrailDd(f: ApexFundedBlock): ApexFundedBlock {
  return { ...f, drawdownTypeRaw: "Trail" };
}

/** Même scaling funded EOD / Trailing par taille (CSV). */
const APEX_BY_PROGRAM_SIZE: Record<string, ApexRuleBundle> = {
  "Apex EOD|25k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 1000,
      dllEvalDisplay: formatUsdWholeGrouped(500),
      targetEval: "$1,500",
    },
    funded: FUNDED_25K,
  },
  "Apex Trailing|25k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 1000,
      dllEvalDisplay: "-",
      targetEval: "$1,500",
    },
    funded: cloneFundedWithTrailDd(FUNDED_25K),
  },
  "Apex EOD|50k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 2000,
      dllEvalDisplay: formatUsdWholeGrouped(1000),
      targetEval: "$3,000",
    },
    funded: FUNDED_50K,
  },
  "Apex Trailing|50k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 2000,
      dllEvalDisplay: "-",
      targetEval: "$3,000",
    },
    funded: cloneFundedWithTrailDd(FUNDED_50K),
  },
  "Apex EOD|100k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 3000,
      dllEvalDisplay: formatUsdWholeGrouped(1500),
      targetEval: "$6,000",
    },
    funded: FUNDED_100K,
  },
  "Apex Trailing|100k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 3000,
      dllEvalDisplay: "-",
      targetEval: "$6,000",
    },
    funded: cloneFundedWithTrailDd(FUNDED_100K),
  },
  "Apex EOD|150k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "EOD",
      maxDrawdownUsd: 4000,
      dllEvalDisplay: formatUsdWholeGrouped(2000),
      targetEval: "$9,000",
    },
    funded: FUNDED_150K,
  },
  "Apex Trailing|150k": {
    eval: {
      rulesEval: "-",
      overnightOverweek: "No",
      tradingNews: "Yes",
      drawdownTypeRaw: "Trail",
      maxDrawdownUsd: 4000,
      dllEvalDisplay: "-",
      targetEval: "$9,000",
    },
    funded: cloneFundedWithTrailDd(FUNDED_150K),
  },
};

function apexLookupKey(account: JournalAccount): string | null {
  if (account.propFirm.name.trim() !== "Apex Trader Funding") return null;
  const size = account.sizeLabel.trim().toLowerCase();
  if (!size) return null;
  let program = (account.compareProgramName ?? "").trim();
  if (!program) {
    program = findEvalCompareRow(account)?.accountName?.trim() ?? "";
  }
  if (!program) return null;
  const key = `${program}|${size}`;
  return APEX_BY_PROGRAM_SIZE[key] != null ? key : null;
}

export function isApexJournalAccount(account: JournalAccount): boolean {
  return apexLookupKey(account) != null;
}

/** Données funded CSV Apex pour Progress / règles (null si compte non Apex). */
export function getApexFundedBlockForAccount(account: JournalAccount): ApexFundedBlock | null {
  const key = apexLookupKey(account);
  if (!key) return null;
  return APEX_BY_PROGRAM_SIZE[key]?.funded ?? null;
}

export function pickScalingTier(
  tiers: readonly ApexScalingTier[],
  profitUsd: number
): ApexScalingTier {
  const p = Number.isFinite(profitUsd) ? profitUsd : 0;
  for (const t of tiers) {
    if (p >= t.minProfitUsd && (t.maxProfitUsd === null || p <= t.maxProfitUsd)) {
      return t;
    }
  }
  return tiers[tiers.length - 1]!;
}

/** Contenu du panneau au survol de l’icône « i » (ex. TopStep consistency path). */
export type RuleLabelInfoPopover = {
  lead: string;
  entries: readonly { label: string; value: string }[];
};

export type ApexRulesRow = {
  label: string;
  value: string;
  multiline?: boolean;
  /** Avec `multiline` : une ligne logique = une ligne visuelle (pas de césure au milieu d’un palier). */
  multilinePreserveLines?: boolean;
  /** Texte au survol simple (sans panneau structuré). */
  labelInfoTooltip?: string;
  /** Panneau riche au survol / focus (prioritaire sur `labelInfoTooltip`). */
  labelInfoPopover?: RuleLabelInfoPopover;
};

export type ApexEvalRulesLayout = {
  /**
   * Grille 3×3 (UI) : r1 Rules | Drawdown type | Sizing ; r2 Trading news | Drawdown | Profit Target ;
   * r3 Overnight / Overweek | DLL | vide. Sizing = colonne CSV compare (`prop-firms`).
   */
  rules: ApexRulesRow;
  drawdownType: ApexRulesRow;
  sizing: ApexRulesRow;
  profitTarget: ApexRulesRow;
  tradingNews: ApexRulesRow;
  drawdown: ApexRulesRow;
  overnight: ApexRulesRow;
  dll: ApexRulesRow;
};

/** Trois colonnes indépendantes (flex) : évite les trous verticaux dus au Payout maxi multiligne. */
export type ApexFundedRulesLayout = {
  column1: ApexRulesRow[];
  column2: ApexRulesRow[];
  column3: ApexRulesRow[];
};

export type ApexAccountRulesCard =
  | { phase: "eval"; evalLayout: ApexEvalRulesLayout }
  | { phase: "funded"; fundedLayout: ApexFundedRulesLayout };

/**
 * Carte « Account rules » Apex : colonnes EVALUATION si challenge, colonnes FUNDED si funded/live.
 */
export function resolveApexAccountRulesCard(
  state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  const key = apexLookupKey(account);
  if (!key) return null;
  const bundle = APEX_BY_PROGRAM_SIZE[key]!;
  const { eval: ev, funded: fd } = bundle;

  const isChallenge = account.accountType === "challenge";

  if (isChallenge) {
    const compareRow = findEvalCompareRow(account);
    const sizingRaw = compareRow?.rules.sizing?.trim() ?? "";
    const sizingDisplay =
      sizingRaw && sizingRaw !== "—" ? sizingRaw : "—";

    const evalLayout: ApexEvalRulesLayout = {
      rules: { label: "Rules", value: formatRulesEvalDisplay(ev.rulesEval) },
      drawdownType: {
        label: "Drawdown type",
        value: formatApexDrawdownType(ev.drawdownTypeRaw),
      },
      sizing: { label: "Sizing", value: sizingDisplay },
      profitTarget: { label: "Profit Target", value: ev.targetEval.trim() || "—" },
      tradingNews: { label: "Trading news", value: formatAllowedFromCsv(ev.tradingNews) },
      drawdown: {
        label: "Drawdown",
        value: formatUsdWholeGrouped(ev.maxDrawdownUsd),
      },
      overnight: {
        label: "Overnight / Overweek",
        value: formatAllowedFromCsv(ev.overnightOverweek),
      },
      dll: {
        label: "DLL",
        value: formatEvalDllDisplay(ev.dllEvalDisplay),
      },
    };
    return { phase: "eval", evalLayout };
  }

  const profitCents = getFundedPhaseProfitCents(state, account);
  const profitUsd = profitCents / 100;
  const tier = pickScalingTier(fd.scalingTiers, profitUsd);
  /** Uniquement le sizing du tier actuel (PnL funded), sans fourchette de profit. */
  const scalingPlanValue = tier.sizeContract;
  const dllFunded =
    tier.dllUsd != null ? formatUsdWholeGrouped(tier.dllUsd) : "None";

  const column1: ApexRulesRow[] = [
    {
      label: "Payout rules",
      value: formatPayoutRulesConsistency(fd.consistency),
    },
    {
      label: "Mini Profit Days",
      value: formatFundedMinProfitDays(fd),
    },
    { label: "Trading news", value: formatAllowedFromCsv(fd.tradingNews) },
    {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(fd.overnightOverweek),
    },
    {
      label: "Profit split",
      value: fd.profitSplit.trim() || "—",
    },
  ];

  const column2: ApexRulesRow[] = [
    {
      label: "Drawdown Type",
      value: formatApexDrawdownType(fd.drawdownTypeRaw),
    },
    {
      label: "Drawdown",
      value: formatUsdWholeGrouped(fd.maxDrawdownUsd),
    },
    { label: "DLL", value: dllFunded },
    { label: "Buffer", value: formatUsdWholeGrouped(fd.bufferUsd) },
  ];

  const column3: ApexRulesRow[] = [
    { label: "Scaling Plan", value: scalingPlanValue },
    {
      label: "Payout mini",
      value: formatUsdWholeGrouped(fd.payoutMiniUsd),
    },
    {
      label: "Payout maxi",
      value: formatPayoutMaxiMultiline(fd),
      multiline: true,
    },
  ];

  return {
    phase: "funded",
    fundedLayout: { column1, column2, column3 },
  };
}
