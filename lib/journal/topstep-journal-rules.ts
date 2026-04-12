import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import { getFundedPhaseProfitCents } from "@/lib/journal/funded-phase-pnl";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  formatAllowedFromCsv,
  formatApexDrawdownType,
  formatEvalDllDisplay,
  formatJournalMinProfitDaysLine,
  formatPayoutRulesConsistency,
  pickScalingTier,
  type ApexAccountRulesCard,
  type ApexEvalRulesLayout,
  type ApexFundedRulesLayout,
  type ApexRulesRow,
  type ApexScalingTier,
  type RuleLabelInfoPopover,
} from "@/lib/journal/apex-journal-rules";
import { formatUsdWholeGrouped, type PropFirm } from "@/lib/prop-firms";
import { FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE } from "@/lib/journal/fifty-percent-payout-note";

/** Colonnes CSV évaluation TopStep — identiques pour tous les comptes eval listés. */
const TOPSTEP_EVAL_CSV = {
  tradingNews: "Yes",
  overnightOverweek: "No",
  dll: "No",
} as const;

/** Notes funded — même libellé que Lucid Flex (buffer 50 %). */
const TOPSTEP_NOTES_CSV = FIFTY_PERCENT_ACCOUNT_BALANCE_PAYOUT_NOTE;

type TopStepFundedSize = "50k" | "100k" | "150k";

/** Colonnes « Consistency path » du CSV TopStep Rules (mêmes valeurs 50k / 100k / 150k). */
type TopStepConsistencyPathCsv = {
  payoutMaxUsd: number;
  consistency: string;
  minimumTradingDays: number;
  profitSplit: string;
};

export type TopStepFundedBlock = {
  overnightOverweek: string;
  tradingNews: string;
  drawdownTypeRaw: string;
  maxDrawdownUsd: number;
  /** Colonne Buffer funded CSV (« - » → None). */
  bufferRaw: string;
  payoutMiniUsd: number;
  payoutMaxStandardUsd: number;
  /** Payout maxi — consistency path (popup « i »). */
  payoutMaxConsistencyUsd: number;
  minTradingDays: number;
  minProfitPerDayUsd: number;
  scalingTiers: readonly ApexScalingTier[];
  consistencyPath: TopStepConsistencyPathCsv;
  /** Colonne Notes du CSV funded. */
  notesCsv: string;
};

const TOPSTEP_SCALING_50K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "< $1,500",
    minProfitUsd: 0,
    maxProfitUsd: 1499,
    sizeContract: "2 minis / 20 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "$1,500 – $2,000",
    minProfitUsd: 1500,
    maxProfitUsd: 1999,
    sizeContract: "3 minis / 30 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "> $2,000",
    minProfitUsd: 2000,
    maxProfitUsd: null,
    sizeContract: "5 minis / 50 micros",
    dllUsd: null,
  },
];

const TOPSTEP_SCALING_100K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "< $1,500",
    minProfitUsd: 0,
    maxProfitUsd: 1499,
    sizeContract: "3 minis / 30 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "$1,500 – $2,000",
    minProfitUsd: 1500,
    maxProfitUsd: 1999,
    sizeContract: "4 minis / 40 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "$2,000 – $3,000",
    minProfitUsd: 2000,
    maxProfitUsd: 2999,
    sizeContract: "5 minis / 50 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "> $3,000",
    minProfitUsd: 3000,
    maxProfitUsd: null,
    sizeContract: "10 minis / 100 micros",
    dllUsd: null,
  },
];

const TOPSTEP_SCALING_150K: readonly ApexScalingTier[] = [
  {
    rangeLabel: "< $1,500",
    minProfitUsd: 0,
    maxProfitUsd: 1499,
    sizeContract: "3 minis / 30 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "$1,500 – $2,000",
    minProfitUsd: 1500,
    maxProfitUsd: 1999,
    sizeContract: "4 minis / 40 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "$2,000 – $3,000",
    minProfitUsd: 2000,
    maxProfitUsd: 2999,
    sizeContract: "5 minis / 50 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "$3,000 – $4,500",
    minProfitUsd: 3000,
    maxProfitUsd: 4499,
    sizeContract: "10 minis / 100 micros",
    dllUsd: null,
  },
  {
    rangeLabel: "> $4,500",
    minProfitUsd: 4500,
    maxProfitUsd: null,
    sizeContract: "15 minis / 150 micros",
    dllUsd: null,
  },
];

/** Données funded TopStep Rules.csv (Standard path min days / min profit, payout mini/maxi, scaling). */
const TOPSTEP_FUNDED_BY_SIZE: Record<TopStepFundedSize, TopStepFundedBlock> = {
  "50k": {
    overnightOverweek: "No",
    tradingNews: "Yes",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 2000,
    bufferRaw: "-",
    payoutMiniUsd: 375,
    payoutMaxStandardUsd: 5000,
    payoutMaxConsistencyUsd: 6000,
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    scalingTiers: TOPSTEP_SCALING_50K,
    consistencyPath: {
      payoutMaxUsd: 6000,
      consistency: "40%",
      minimumTradingDays: 3,
      profitSplit: "90%",
    },
    notesCsv: TOPSTEP_NOTES_CSV,
  },
  "100k": {
    overnightOverweek: "No",
    tradingNews: "Yes",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 3000,
    bufferRaw: "-",
    payoutMiniUsd: 375,
    payoutMaxStandardUsd: 5000,
    payoutMaxConsistencyUsd: 6000,
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    scalingTiers: TOPSTEP_SCALING_100K,
    consistencyPath: {
      payoutMaxUsd: 6000,
      consistency: "40%",
      minimumTradingDays: 3,
      profitSplit: "90%",
    },
    notesCsv: TOPSTEP_NOTES_CSV,
  },
  "150k": {
    overnightOverweek: "No",
    tradingNews: "Yes",
    drawdownTypeRaw: "EOD",
    maxDrawdownUsd: 4500,
    bufferRaw: "-",
    payoutMiniUsd: 375,
    payoutMaxStandardUsd: 5000,
    payoutMaxConsistencyUsd: 6000,
    minTradingDays: 5,
    minProfitPerDayUsd: 150,
    scalingTiers: TOPSTEP_SCALING_150K,
    consistencyPath: {
      payoutMaxUsd: 6000,
      consistency: "40%",
      minimumTradingDays: 3,
      profitSplit: "90%",
    },
    notesCsv: TOPSTEP_NOTES_CSV,
  },
};

function topStepFundedSize(account: JournalAccount): TopStepFundedSize | null {
  const s = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (s === "50k" || s === "100k" || s === "150k") return s;
  return null;
}

/** Bloc funded CSV (Standard path min days / min profit, payout mini/maxi) pour les tailles 50k / 100k / 150k. */
export function getTopStepFundedBlockForAccount(account: JournalAccount): TopStepFundedBlock | null {
  if (account.propFirm.name.trim().toLowerCase() !== "topstep") return null;
  const sz = topStepFundedSize(account);
  if (!sz) return null;
  return TOPSTEP_FUNDED_BY_SIZE[sz];
}

function formatBufferFromCsv(raw: string): string {
  const t = raw.trim();
  if (t === "-" || t === "—" || t === "") return "None";
  const n = Number(t.replace(/\s/g, "").replace(/[$,]/g, ""));
  if (Number.isFinite(n)) return formatUsdWholeGrouped(n);
  return t;
}

function formatDrawdownTypeEval(d: PropFirm["drawdown"]): string {
  const map: Record<PropFirm["drawdown"], string> = {
    EOD: "EOD",
    EOT: "EOT",
    Trailing: "Trailing",
    Static: "Static",
  };
  return map[d] ?? d;
}

function formatPayoutRulesCell(f: TopStepFundedBlock): string {
  return formatJournalMinProfitDaysLine(f.minTradingDays, f.minProfitPerDayUsd);
}

function buildPayoutRulesLabelInfo(fd: TopStepFundedBlock): RuleLabelInfoPopover {
  const c = fd.consistencyPath;
  return {
    lead: "If consistency path",
    entries: [
      { label: "Consistency", value: c.consistency },
      { label: "Minimum trading days", value: String(c.minimumTradingDays) },
    ],
  };
}

function buildPayoutMaxiLabelInfo(fd: TopStepFundedBlock): RuleLabelInfoPopover {
  return {
    lead: "If consistency path",
    entries: [
      {
        label: "Payout maxi",
        value: formatUsdWholeGrouped(fd.payoutMaxConsistencyUsd),
      },
    ],
  };
}

function buildTopStepFundedLayout(
  state: JournalDataV1,
  account: JournalAccount,
  fd: TopStepFundedBlock
): ApexFundedRulesLayout {
  const profitCents = getFundedPhaseProfitCents(state, account);
  const profitUsd = profitCents / 100;
  const tier = pickScalingTier(fd.scalingTiers, profitUsd);
  const scalingPlanValue = tier.sizeContract;

  const payoutRules: ApexRulesRow = {
    label: "Payout Rules",
    value: formatPayoutRulesCell(fd),
    labelInfoPopover: buildPayoutRulesLabelInfo(fd),
  };

  const column1: ApexRulesRow[] = [
    payoutRules,
    {
      label: "Trading News",
      value: formatAllowedFromCsv(fd.tradingNews),
    },
    {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(fd.overnightOverweek),
    },
    {
      label: "Profit split",
      value: fd.consistencyPath.profitSplit,
    },
  ];

  const column2: ApexRulesRow[] = [
    {
      label: "Drawdown type",
      value: formatApexDrawdownType(fd.drawdownTypeRaw),
    },
    {
      label: "Drawdown",
      value: formatUsdWholeGrouped(fd.maxDrawdownUsd),
    },
    { label: "DLL", value: "None" },
    { label: "Buffer", value: formatBufferFromCsv(fd.bufferRaw) },
  ];

  const column3: ApexRulesRow[] = [
    { label: "Scaling Plan", value: scalingPlanValue },
    {
      label: "Payout mini",
      value: formatUsdWholeGrouped(fd.payoutMiniUsd),
    },
    {
      label: "Payout maxi",
      value: formatUsdWholeGrouped(fd.payoutMaxStandardUsd),
      labelInfoPopover: buildPayoutMaxiLabelInfo(fd),
    },
    {
      label: "Notes",
      value: fd.notesCsv,
      multiline: true,
    },
  ];

  return { column1, column2, column3 };
}

/**
 * Carte Rules TopStep : eval (challenge) ou funded (live/funded), données TopStep Rules.csv + compare pour l’eval.
 */
export function resolveTopStepAccountRulesCard(
  state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (account.propFirm.name.trim().toLowerCase() !== "topstep") return null;

  const fundedSize = topStepFundedSize(account);

  if (account.accountType === "funded" || account.accountType === "live") {
    if (!fundedSize) return null;
    const fd = TOPSTEP_FUNDED_BY_SIZE[fundedSize];
    return {
      phase: "funded",
      fundedLayout: buildTopStepFundedLayout(state, account, fd),
    };
  }

  /** Eval passée : même carte funded que Progress « funded » (payout Standard path, etc.). */
  if (account.accountType === "challenge" && account.status === "passed" && fundedSize) {
    const fd = TOPSTEP_FUNDED_BY_SIZE[fundedSize];
    return {
      phase: "funded",
      fundedLayout: buildTopStepFundedLayout(state, account, fd),
    };
  }

  if (account.accountType !== "challenge") return null;

  const evalRow = findEvalCompareRow(account);
  if (!evalRow || evalRow.accountType !== "Eval") return null;

  const rulesValue = formatPayoutRulesConsistency(evalRow.rules.consistency);
  const evalLayout: ApexEvalRulesLayout = {
    rules: { label: "Rules", value: rulesValue },
    drawdownType: {
      label: "Drawdown type",
      value: formatDrawdownTypeEval(evalRow.drawdown),
    },
    sizing: {
      label: "Sizing",
      value: (() => {
        const s = evalRow.rules.sizing.trim();
        if (!s || s === "—") return "—";
        return s;
      })(),
    },
    profitTarget: { label: "Profit Target", value: evalRow.target.trim() || "—" },
    tradingNews: {
      label: "Trading News",
      value: formatAllowedFromCsv(TOPSTEP_EVAL_CSV.tradingNews),
    },
    drawdown: {
      label: "Drawdown",
      value: formatUsdWholeGrouped(evalRow.maxDrawdownLimitUsd),
    },
    overnight: {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(TOPSTEP_EVAL_CSV.overnightOverweek),
    },
    dll: {
      label: "DLL (Daily Loss Limit)",
      value: formatEvalDllDisplay(TOPSTEP_EVAL_CSV.dll),
    },
  };
  return { phase: "eval", evalLayout };
}
