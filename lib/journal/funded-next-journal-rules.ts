/**
 * Funded Next Futures — aligné sur « Funded Next Futures Rules.csv » (eval + funded).
 */
import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import {
  formatAllowedFromCsv,
  formatEvalDllDisplay,
  formatJournalMinProfitDaysLine,
  formatPayoutRulesConsistency,
  type ApexAccountRulesCard,
  type ApexEvalRulesLayout,
  type ApexFundedRulesLayout,
} from "@/lib/journal/apex-journal-rules";
import { FUNDED_NEXT_BOLT_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-bolt-funded-csv.generated";
import { FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-legacy-funded-csv.generated";
import { FUNDED_NEXT_RAPID_FUNDED_FROM_CSV } from "@/lib/journal/funded-next-rapid-funded-csv.generated";
import { formatUsdWholeGrouped, type PropFirm } from "@/lib/prop-firms";

const MLL_NOTE =
  "The first withdrawal resets the maximum loss limit (MLL) back to the initial balance.";

type FnfSize = "25k" | "50k" | "100k";
type FnfTrack = "bolt" | "rapid" | "legacy";

type FnfFundedDef = {
  overnight: string;
  tradingNews: string;
  sizing: string;
  maxDrawdownUsd: number;
  /** CSV funded DLL : « - » → None */
  dllCsv: string;
  bufferUsd: number | null;
  payoutRules:
    | { kind: "none" }
    | { kind: "consistency_40_3" }
    | { kind: "rapid_csv"; consistencyPct: number; minDays: number | null }
    | { kind: "legacy_csv"; requiredBenchmarkDays: number; uncapBenchmarkDays: number; minProfitPerDayUsd: number }
    | { kind: "legacy_min_profit"; minDays: number; minProfitPerDayUsd: number };
  payoutMiniUsd: number;
  payoutMaxMultiline: string;
  profitSplit: string;
  mllNote?: boolean;
};

const FNF_FUNDED: Record<`${FnfTrack}-${FnfSize}`, FnfFundedDef | null> = {
  "bolt-25k": null,
  "bolt-50k": fnfBoltFundedDefFromCsv(),
  "bolt-100k": null,
  "rapid-25k": fnfRapidFundedDefFromCsv("25k"),
  "rapid-50k": fnfRapidFundedDefFromCsv("50k"),
  "rapid-100k": fnfRapidFundedDefFromCsv("100k"),
  "legacy-25k": fnfLegacyFundedDefFromCsv("25k"),
  "legacy-50k": fnfLegacyFundedDefFromCsv("50k"),
  "legacy-100k": fnfLegacyFundedDefFromCsv("100k"),
};

function fnfSizeKey(account: JournalAccount): FnfSize | null {
  const s = account.sizeLabel.trim().toLowerCase();
  if (s === "25k" || s === "50k" || s === "100k") return s;
  return null;
}

function fnfTrack(account: JournalAccount): FnfTrack | null {
  const p =
    account.compareProgramName?.trim() || findEvalCompareRow(account)?.accountName?.trim() || "";
  if (p.includes("Bolt")) return "bolt";
  if (p.includes("Rapid")) return "rapid";
  if (p.includes("Legacy")) return "legacy";
  return null;
}

/** Reward split from CSV label (e.g. `80%` → 0.8) for net = gross × ratio. */
export function parseFundedNextRewardSplitRatio(label: string): number | null {
  const t = String(label ?? "")
    .trim()
    .replace(/\s/g, "");
  const m = t.match(/^([\d.,]+)\s*%$/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n / 100 : null;
}

function fnfLegacyFundedDefFromCsv(sk: FnfSize): FnfFundedDef {
  const csv = FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV[sk];
  return {
    overnight: csv.overnight,
    tradingNews: csv.tradingNews,
    sizing: csv.sizing,
    maxDrawdownUsd: csv.maxDrawdownUsd,
    dllCsv: csv.dllUsd != null ? formatUsdWholeGrouped(csv.dllUsd) : "-",
    bufferUsd: csv.cycleProfitMinUsd,
    payoutRules: {
      kind: "legacy_csv",
      requiredBenchmarkDays: csv.requiredBenchmarkDays,
      uncapBenchmarkDays: csv.uncapBenchmarkDays,
      minProfitPerDayUsd: csv.benchmarkMinProfitPerDayUsd,
    },
    payoutMiniUsd: csv.payoutMiniUsd,
    payoutMaxMultiline: `4st: ${formatUsdWholeGrouped(csv.payoutCapStandardUsd)}\n5th: ${csv.payoutMaxTierLabel}`,
    profitSplit: csv.profitSplitLabel,
    mllNote: /MLL|maximum loss limit/i.test(csv.notes),
  };
}

function fnfRapidFundedDefFromCsv(sk: FnfSize): FnfFundedDef {
  const csv = FUNDED_NEXT_RAPID_FUNDED_FROM_CSV[sk];
  return {
    overnight: csv.overnight,
    tradingNews: csv.tradingNews,
    sizing: csv.sizing,
    maxDrawdownUsd: csv.maxDrawdownUsd,
    dllCsv: csv.dllUsd != null ? formatUsdWholeGrouped(csv.dllUsd) : "-",
    bufferUsd: csv.bufferUsd,
    payoutRules: {
      kind: "rapid_csv",
      consistencyPct: Math.round(csv.consistencyRatio * 100),
      minDays: csv.minTradingDays,
    },
    payoutMiniUsd: csv.payoutMiniUsd,
    payoutMaxMultiline: `Cap: ${formatUsdWholeGrouped(csv.payoutMaxStandardUsd)}\nAfter ${csv.capRemovalWithdrawalCount} paid withdrawals: ${csv.payoutMaxTierLabel}`,
    profitSplit: csv.profitSplitLabel,
    mllNote: /MLL|maximum loss limit/i.test(csv.notes),
  };
}

function fnfBoltFundedDefFromCsv(): FnfFundedDef {
  const csv = FUNDED_NEXT_BOLT_FUNDED_FROM_CSV["50k"];
  return {
    overnight: csv.overnight,
    tradingNews: csv.tradingNews,
    sizing: csv.sizing,
    maxDrawdownUsd: csv.maxDrawdownUsd,
    dllCsv: csv.dllUsd != null ? formatUsdWholeGrouped(csv.dllUsd) : "-",
    bufferUsd: csv.bufferUsd,
    payoutRules: { kind: "none" },
    payoutMiniUsd: csv.payoutMiniUsd,
    payoutMaxMultiline: `4st: ${formatUsdWholeGrouped(csv.payoutMaxStandardUsd)}\n5th: ${formatUsdWholeGrouped(
      csv.payoutMaxFinalUsd
    )}`,
    profitSplit: csv.profitSplitLabel,
  };
}

/** Funded/live Bolt with a generated CSV row (sizes present in `FUNDED_NEXT_BOLT_FUNDED_FROM_CSV`). */
export function isFundedNextBoltFundedJournalAccount(account: JournalAccount): boolean {
  if (!isFundedNextJournalAccount(account)) return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  if (fnfTrack(account) !== "bolt") return false;
  const sk = fnfSizeKey(account);
  if (!sk) return false;
  return Object.prototype.hasOwnProperty.call(FUNDED_NEXT_BOLT_FUNDED_FROM_CSV, sk);
}

/** Funded/live Rapid with a CSV row. */
export function isFundedNextRapidFundedJournalAccount(account: JournalAccount): boolean {
  if (!isFundedNextJournalAccount(account)) return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  if (fnfTrack(account) !== "rapid") return false;
  const sk = fnfSizeKey(account);
  if (!sk) return false;
  return Object.prototype.hasOwnProperty.call(FUNDED_NEXT_RAPID_FUNDED_FROM_CSV, sk);
}

/** Funded/live Legacy with a generated CSV row. */
export function isFundedNextLegacyFundedJournalAccount(account: JournalAccount): boolean {
  if (!isFundedNextJournalAccount(account)) return false;
  if (account.accountType !== "funded" && account.accountType !== "live") return false;
  if (fnfTrack(account) !== "legacy") return false;
  const sk = fnfSizeKey(account);
  if (!sk) return false;
  return Object.prototype.hasOwnProperty.call(FUNDED_NEXT_LEGACY_FUNDED_FROM_CSV, sk);
}

function fnfFundedPayoutRulesValue(fd: FnfFundedDef): { value: string; multiline: boolean } {
  if (fd.payoutRules.kind === "none") {
    return { value: "None", multiline: false };
  }
  if (fd.payoutRules.kind === "rapid_csv") {
    const md = fd.payoutRules.minDays;
    const daysLine =
      md != null ? `${md} min trading day(s) (display only)` : "No min trading days in CSV";
    return {
      value: `${formatPayoutRulesConsistency(`${fd.payoutRules.consistencyPct}%`)}\n${daysLine}`,
      multiline: true,
    };
  }
  if (fd.payoutRules.kind === "legacy_csv") {
    const pr = fd.payoutRules;
    return {
      value: `${pr.requiredBenchmarkDays} benchmark day(s) required (min ${formatUsdWholeGrouped(
        pr.minProfitPerDayUsd
      )}/day)\nAfter ${pr.uncapBenchmarkDays} benchmark days: 100% of account gain withdrawable (until then 50% + buffer)`,
      multiline: true,
    };
  }
  if (fd.payoutRules.kind === "consistency_40_3") {
    return {
      value: `${formatPayoutRulesConsistency("40%")}\n3 min trading day(s)`,
      multiline: true,
    };
  }
  return {
    value: formatJournalMinProfitDaysLine(
      fd.payoutRules.minDays,
      fd.payoutRules.minProfitPerDayUsd
    ),
    multiline: false,
  };
}

function fnfEvalLayout(
  sizingEval: string,
  targetEval: string,
  row: PropFirm | null
): ApexEvalRulesLayout {
  const maxDd =
    row != null ? formatUsdWholeGrouped(row.maxDrawdownLimitUsd) : "—";
  const dllRaw = row?.rules.dailyLossLimit?.trim() ?? "-";
  const rulesValue = `${formatPayoutRulesConsistency("40%")}\n3 min trading day(s)`;
  return {
    rules: { label: "Rules", value: rulesValue, multiline: true },
    drawdownType: { label: "Drawdown type", value: "EOD" },
    sizing: { label: "Sizing", value: sizingEval },
    profitTarget: { label: "Profit Target", value: targetEval },
    tradingNews: { label: "Trading News", value: formatAllowedFromCsv("Yes") },
    drawdown: { label: "Drawdown", value: maxDd },
    overnight: { label: "Overnight / Overweek", value: formatAllowedFromCsv("No") },
    dll: {
      label: "DLL (Daily Loss Limit)",
      value: formatEvalDllDisplay(dllRaw),
    },
  };
}

function fnfFundedLayout(fd: FnfFundedDef): ApexFundedRulesLayout {
  const pr = fnfFundedPayoutRulesValue(fd);
  const dllFunded = formatEvalDllDisplay(fd.dllCsv);
  const bufferVal =
    fd.bufferUsd != null ? formatUsdWholeGrouped(fd.bufferUsd) : "—";

  const column1: ApexFundedRulesLayout["column1"] = [
    { label: "Payout rules", value: pr.value, multiline: pr.multiline },
    { label: "Trading News", value: formatAllowedFromCsv(fd.tradingNews) },
    { label: "Overnight / Overweek", value: formatAllowedFromCsv(fd.overnight) },
    { label: "Profit split", value: fd.profitSplit },
  ];
  if (fd.mllNote) {
    column1.push({ label: "Notes", value: MLL_NOTE, multiline: true });
  }

  return {
    column1,
    column2: [
      { label: "Drawdown type", value: "EOD" },
      { label: "Drawdown", value: formatUsdWholeGrouped(fd.maxDrawdownUsd) },
      { label: "DLL", value: dllFunded },
      { label: "Buffer", value: bufferVal },
    ],
    column3: [
      { label: "Sizing", value: fd.sizing },
      { label: "Payout mini", value: formatUsdWholeGrouped(fd.payoutMiniUsd) },
      { label: "Payout max", value: fd.payoutMaxMultiline, multiline: true },
    ],
  };
}

export function isFundedNextJournalAccount(account: JournalAccount): boolean {
  return account.propFirm.name.trim() === "Funded Next Futures";
}

export function resolveFundedNextAccountRulesCard(
  _state: JournalDataV1,
  account: JournalAccount
): ApexAccountRulesCard | null {
  if (!isFundedNextJournalAccount(account)) return null;
  const sk = fnfSizeKey(account);
  const track = fnfTrack(account);
  if (!sk || !track) return null;

  const row = findEvalCompareRow(account);
  const sizingEval =
    row?.rules.sizing?.trim() && row.rules.sizing !== "—" ? row.rules.sizing : "—";
  const targetEval =
    row?.target?.trim() && row.target !== "—" && row.target !== "-"
      ? row.target
      : "—";

  const isFundedType = account.accountType === "funded" || account.accountType === "live";
  const isPassedChallenge = account.accountType === "challenge" && account.status === "passed";

  if (!isFundedType && !isPassedChallenge) {
    return { phase: "eval", evalLayout: fnfEvalLayout(sizingEval, targetEval, row) };
  }

  const funded = FNF_FUNDED[`${track}-${sk}`];
  if (!funded) return null;
  return { phase: "funded", fundedLayout: fnfFundedLayout(funded) };
}
