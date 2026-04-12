import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  formatAllowedFromCsv,
  formatApexDrawdownType,
  formatEvalDllDisplay,
  formatPayoutRulesConsistency,
  type ApexAccountRulesCard,
  type ApexEvalRulesLayout,
  type ApexFundedRulesLayout,
  type ApexRulesRow,
} from "@/lib/journal/apex-journal-rules";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";
import { TPT_FUNDED_FROM_CSV } from "@/lib/journal/tpt-funded-csv.generated";

/** Données synthétisées depuis Take Profit Trader Rules.csv (éval + funded par taille). */
type TptRuleBlock = {
  sizing: string;
  evalOvernight: string;
  evalTradingNews: string;
  evalDrawdownTypeRaw: string;
  evalMaxDrawdownUsd: number;
  evalDll: string;
  evalProfitTargetUsd: number;
  rulesEvalConsistency: string;
  /** Colonne « Min trading days » du CSV (évaluation). */
  evalMinTradingDays: number;
  fundedOvernight: string;
  fundedTradingNews: string;
  fundedDrawdownTypeRaw: string;
  fundedTrailingDdUsd: number;
  fundedBufferUsd: number;
  payoutMiniUsd: number;
  payoutMaxLabel: string;
  profitSplit: string;
  /** Colonne « Notes » du CSV (funded) — remplie via `getTptRuleBlockForAccount`. */
  fundedNotesFromCsv: string;
};

type TptSize = "25k" | "50k" | "75k" | "100k" | "150k";

const TPT_BY_SIZE: Record<TptSize, TptRuleBlock> = {
  "25k": {
    sizing: "3 minis / 30 micros",
    evalOvernight: "No",
    evalTradingNews: "Yes",
    evalDrawdownTypeRaw: "EOD",
    evalMaxDrawdownUsd: 1500,
    evalDll: "No",
    evalProfitTargetUsd: 1500,
    rulesEvalConsistency: "50%",
    evalMinTradingDays: 5,
    fundedOvernight: "No",
    fundedTradingNews: "No",
    fundedDrawdownTypeRaw: "Trailing",
    fundedTrailingDdUsd: 1500,
    fundedBufferUsd: 1500,
    payoutMiniUsd: 250,
    payoutMaxLabel: "No limit",
    profitSplit: "80%",
    fundedNotesFromCsv: "",
  },
  "50k": {
    sizing: "6 minis / 60 micros",
    evalOvernight: "No",
    evalTradingNews: "Yes",
    evalDrawdownTypeRaw: "EOD",
    evalMaxDrawdownUsd: 2000,
    evalDll: "No",
    evalProfitTargetUsd: 3000,
    rulesEvalConsistency: "50%",
    evalMinTradingDays: 5,
    fundedOvernight: "No",
    fundedTradingNews: "No",
    fundedDrawdownTypeRaw: "Trailing",
    fundedTrailingDdUsd: 2000,
    fundedBufferUsd: 2000,
    payoutMiniUsd: 250,
    payoutMaxLabel: "No limit",
    profitSplit: "80%",
    fundedNotesFromCsv: "",
  },
  "75k": {
    sizing: "9 minis / 90 micros",
    evalOvernight: "No",
    evalTradingNews: "Yes",
    evalDrawdownTypeRaw: "EOD",
    evalMaxDrawdownUsd: 2500,
    evalDll: "No",
    evalProfitTargetUsd: 4500,
    rulesEvalConsistency: "50%",
    evalMinTradingDays: 5,
    fundedOvernight: "No",
    fundedTradingNews: "No",
    fundedDrawdownTypeRaw: "Trailing",
    fundedTrailingDdUsd: 2500,
    fundedBufferUsd: 2500,
    payoutMiniUsd: 250,
    payoutMaxLabel: "No limit",
    profitSplit: "80%",
    fundedNotesFromCsv: "",
  },
  "100k": {
    sizing: "12 minis / 120 micros",
    evalOvernight: "No",
    evalTradingNews: "Yes",
    evalDrawdownTypeRaw: "EOD",
    evalMaxDrawdownUsd: 3000,
    evalDll: "No",
    evalProfitTargetUsd: 6000,
    rulesEvalConsistency: "50%",
    evalMinTradingDays: 5,
    fundedOvernight: "No",
    fundedTradingNews: "No",
    fundedDrawdownTypeRaw: "Trailing",
    fundedTrailingDdUsd: 3000,
    fundedBufferUsd: 3000,
    payoutMiniUsd: 250,
    payoutMaxLabel: "No limit",
    profitSplit: "80%",
    fundedNotesFromCsv: "",
  },
  "150k": {
    sizing: "15 minis / 150 micros",
    evalOvernight: "No",
    evalTradingNews: "Yes",
    evalDrawdownTypeRaw: "EOD",
    evalMaxDrawdownUsd: 4500,
    evalDll: "No",
    evalProfitTargetUsd: 9000,
    rulesEvalConsistency: "50%",
    evalMinTradingDays: 5,
    fundedOvernight: "No",
    fundedTradingNews: "No",
    fundedDrawdownTypeRaw: "Trailing",
    fundedTrailingDdUsd: 4500,
    fundedBufferUsd: 4500,
    payoutMiniUsd: 250,
    payoutMaxLabel: "No limit",
    profitSplit: "80%",
    fundedNotesFromCsv: "",
  },
};

export function isTakeProfitTraderJournalAccount(account: JournalAccount): boolean {
  return account.propFirm.name.trim().toLowerCase() === "take profit trader";
}

function tptSizeFromAccount(account: JournalAccount): TptSize | null {
  const s = account.sizeLabel.trim().toLowerCase().replace(/\s+/g, "");
  if (s === "25k" || s === "50k" || s === "75k" || s === "100k" || s === "150k") return s;
  return null;
}

export function getTptRuleBlockForAccount(account: JournalAccount): TptRuleBlock | null {
  if (!isTakeProfitTraderJournalAccount(account)) return null;
  const sz = tptSizeFromAccount(account);
  if (!sz) return null;
  const csv = TPT_FUNDED_FROM_CSV[sz];
  const base = TPT_BY_SIZE[sz];
  return {
    ...base,
    fundedBufferUsd: csv.fundedBufferUsd,
    payoutMiniUsd: csv.payoutMiniWithoutFeesUsd,
    fundedNotesFromCsv: csv.notesRow,
  };
}

function buildTptFundedLayout(block: TptRuleBlock): ApexFundedRulesLayout {
  const column1: ApexRulesRow[] = [
    {
      label: "Payout rules",
      value: "—",
    },
    {
      label: "Trading News",
      value: formatAllowedFromCsv(block.fundedTradingNews),
    },
    {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(block.fundedOvernight),
    },
    {
      label: "Profit split",
      value: block.profitSplit,
    },
  ];

  const column2: ApexRulesRow[] = [
    {
      label: "Drawdown type",
      value: formatApexDrawdownType(block.fundedDrawdownTypeRaw),
    },
    {
      label: "Drawdown",
      value: formatUsdWholeGrouped(block.fundedTrailingDdUsd),
    },
    { label: "DLL", value: "None" },
    {
      label: "Buffer",
      value: formatUsdWholeGrouped(block.fundedBufferUsd),
    },
  ];

  const column3: ApexRulesRow[] = [
    {
      label: "Scaling Plan",
      value: block.sizing,
    },
    {
      label: "Payout mini",
      value: formatUsdWholeGrouped(block.payoutMiniUsd),
    },
    {
      label: "Payout maxi",
      value: block.payoutMaxLabel,
    },
    {
      label: "Notes",
      value: block.fundedNotesFromCsv || "—",
      multiline: true,
    },
  ];

  return { column1, column2, column3 };
}

/**
 * Carte Rules Take Profit Trader : évaluation (challenge) ou funded (live/funded), d’après le CSV firme.
 */
export function resolveTptAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (!isTakeProfitTraderJournalAccount(account)) return null;

  const sz = tptSizeFromAccount(account);
  if (!sz) return null;

  const block = getTptRuleBlockForAccount(account);
  if (!block) return null;

  if (account.accountType === "funded" || account.accountType === "live") {
    return {
      phase: "funded",
      fundedLayout: buildTptFundedLayout(block),
    };
  }

  if (account.accountType === "challenge" && account.status === "passed") {
    return {
      phase: "funded",
      fundedLayout: buildTptFundedLayout(block),
    };
  }

  if (account.accountType !== "challenge") return null;

  const evalLayout: ApexEvalRulesLayout = {
    rules: {
      label: "Rules",
      value: `${formatPayoutRulesConsistency(block.rulesEvalConsistency)}\nMin trading days: ${block.evalMinTradingDays}`,
      multiline: true,
    },
    drawdownType: {
      label: "Drawdown type",
      value: formatApexDrawdownType(block.evalDrawdownTypeRaw),
    },
    sizing: {
      label: "Sizing",
      value: block.sizing,
    },
    profitTarget: {
      label: "Profit Target",
      value: formatUsdWholeGrouped(block.evalProfitTargetUsd),
    },
    tradingNews: {
      label: "Trading News",
      value: formatAllowedFromCsv(block.evalTradingNews),
    },
    drawdown: {
      label: "Drawdown",
      value: formatUsdWholeGrouped(block.evalMaxDrawdownUsd),
    },
    overnight: {
      label: "Overnight / Overweek",
      value: formatAllowedFromCsv(block.evalOvernight),
    },
    dll: {
      label: "DLL (Daily Loss Limit)",
      value: formatEvalDllDisplay(block.evalDll),
    },
  };

  return { phase: "eval", evalLayout };
}
