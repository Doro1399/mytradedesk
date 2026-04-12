import { findEvalCompareRow } from "@/lib/journal/compare-account-helpers";
import { fundedProgressPnlBaselineDate } from "@/lib/journal/funded-phase-pnl";
export { getFundedPhaseProfitCents } from "@/lib/journal/funded-phase-pnl";
import { lookupJournalBufferCents } from "@/lib/journal/journal-buffer-lookup";
import { isJournalOtherPropFirm } from "@/lib/journal/journal-other-firm";
import { isMffuFlexSimFundedJournalAccount } from "@/lib/journal/mffu-flex-sim-funded-journal-rules";
import { MFFU_FLEX_SIM_FUNDED_PAYOUT_WITHDRAWAL_SHARE } from "@/lib/journal/mffu-flex-sim-funded-payout-state";
import { isTopStepJournalAccount } from "@/lib/journal/payout-display";
import {
  getAccountBalancePayoutDeductionGrossCents,
  getAccountFinancialMetrics,
  getAccountPnlCentsSinceDate,
} from "@/lib/journal/selectors";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";

/** Topstep Funded / Live : le solde « Now » retire 50 % du brut enregistré par payout (règle produit). */
function topStepFundedBalancePayoutDeductionCents(state: JournalDataV1, accountId: string): number {
  let s = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected" || p.status === "requested") continue;
    s += Math.round(p.grossAmountCents * 0.5);
  }
  return s;
}

/** MFFU Flex Sim funded : même principe que Topstep — 50 % du **brut** retiré du solde « Now ». */
function mffuFlexFundedBalancePayoutDeductionCents(state: JournalDataV1, accountId: string): number {
  let s = 0;
  for (const p of Object.values(state.payoutEntries)) {
    if (p.accountId !== accountId) continue;
    if (p.status === "rejected" || p.status === "requested") continue;
    s += Math.round(p.grossAmountCents * MFFU_FLEX_SIM_FUNDED_PAYOUT_WITHDRAWAL_SHARE);
  }
  return s;
}

function fundedBufferStrideFromCents(buf: number, nominalCents: number): { goalCents: number; strideCents: number } {
  if (buf > nominalCents) {
    return { goalCents: buf, strideCents: buf - nominalCents };
  }
  return { strideCents: buf, goalCents: nominalCents + buf };
}

/** Parse compare-style target e.g. "$1,500" → profit to add in cents. Percent-only labels → null. */
export function parseProfitTargetLabelToCents(label: string | undefined | null): number | null {
  if (!label?.trim()) return null;
  const t = label.trim();
  if (/%\s*$/i.test(t)) return null;
  const cleaned = t.replace(/[$€£\s]/g, "").replace(/,/g, "");
  const v = Number.parseFloat(cleaned);
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 100);
}

function daysActiveFrom(startIso: string): number {
  const a = new Date(startIso + "T12:00:00");
  const b = new Date();
  b.setHours(12, 0, 0, 0);
  if (Number.isNaN(a.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export type ProgressLane = "challenge" | "funded" | "blown";

export type AccountProgressModel = {
  account: JournalAccount;
  lane: "challenge" | "funded";
  /** UI title for the goal line */
  goalTitle: string;
  startCents: number;
  currentCents: number;
  goalCents: number | null;
  /** Profit required (challenge) or (buffer − start) for funded */
  strideCents: number;
  /** 0–1+ (can exceed 1 when ahead of target) */
  progress01: number;
  ageDays: number;
  /** Average imported P&L per day (USD); null if age < 1 */
  usdPerDay: number | null;
  displayState: "active" | "passed" | "failed" | "inactive";
  missingGoal: boolean;
};

export type BuildProgressModelOptions = {
  /** Onglet Blown : garder tout le P&L vie du compte pour la distance à l’objectif au moment du blow. */
  forBlownTab?: boolean;
};

export function buildAccountProgressModel(
  state: JournalDataV1,
  account: JournalAccount,
  lane: "challenge" | "funded",
  options?: BuildProgressModelOptions
): AccountProgressModel {
  const forBlownTab = options?.forBlownTab === true;
  const fundedBaseline = fundedProgressPnlBaselineDate(account);
  const accountFin = getAccountFinancialMetrics(state, account.id);
  const lifetimePnlCents = accountFin.totalPnlCents;
  /** Retraits enregistrés au journal — à déduire du solde affiché (Now). Topstep funded/live : 50 % du brut. */
  const balancePayoutDeductionCents =
    isTopStepJournalAccount(account) &&
    (account.accountType === "funded" || account.accountType === "live")
      ? topStepFundedBalancePayoutDeductionCents(state, account.id)
      : isMffuFlexSimFundedJournalAccount(account) &&
          (account.accountType === "funded" || account.accountType === "live")
        ? mffuFlexFundedBalancePayoutDeductionCents(state, account.id)
        : getAccountBalancePayoutDeductionGrossCents(state, account.id);

  let totalPnlCents: number;
  if (forBlownTab) {
    totalPnlCents = lifetimePnlCents;
  } else if (lane === "funded" && account.fundedProgressBaselinePnlCents != null) {
    totalPnlCents = lifetimePnlCents - account.fundedProgressBaselinePnlCents;
  } else if (lane === "funded" && fundedBaseline) {
    totalPnlCents = getAccountPnlCentsSinceDate(state, account.id, fundedBaseline);
  } else {
    totalPnlCents = getAccountPnlCentsSinceDate(state, account.id, null);
  }

  const nominalCents = account.sizeNominalCents;
  const rawAgeDays = daysActiveFrom(account.evaluationStartedDate ?? account.startDate);
  const fundedPhaseAnchor =
    lane === "funded" && account.fundedProgressBaselinePnlCents != null
      ? account.fundedConvertedDate ?? account.passedEvaluationDate
      : fundedBaseline;
  const fundedPhaseDays =
    lane === "funded" && fundedPhaseAnchor != null ? daysActiveFrom(fundedPhaseAnchor) : null;
  const ageDays =
    forBlownTab || lane === "challenge"
      ? rawAgeDays
      : fundedPhaseDays != null
        ? fundedPhaseDays
        : rawAgeDays;
  const usdPerDay = ageDays >= 1 ? totalPnlCents / 100 / ageDays : null;

  let goalTitle: string;
  let goalCents: number | null = null;
  let strideCents = 0;
  let missingGoal = false;

  if (lane === "challenge") {
    goalTitle = "Target";
    let label: string | undefined;
    if (isJournalOtherPropFirm(account)) {
      const custom = account.rulesSnapshot.otherRulesText?.profitTarget?.trim();
      if (custom) label = custom;
    }
    if (!label) {
      const evalRow = findEvalCompareRow(account);
      label = evalRow?.target ?? account.profitTargetLabel ?? undefined;
    }
    const targetProfit = parseProfitTargetLabelToCents(label);
    if (targetProfit != null && targetProfit > 0) {
      strideCents = targetProfit;
      goalCents = nominalCents + targetProfit;
    } else {
      missingGoal = true;
    }
  } else {
    goalTitle = "Buffer";
    let buf: number | null = null;
    if (isJournalOtherPropFirm(account)) {
      const custom = account.rulesSnapshot.otherRulesText?.buffer?.trim();
      if (custom) buf = parseProfitTargetLabelToCents(custom);
    }
    if (buf == null || buf <= 0) buf = lookupJournalBufferCents(account);
    /**
     * CSV buffers : souvent la **marge** au-dessus du nominal (ex. Apex 50k → `$2,100`), pas le solde absolu
     * `$52,100`. Si `buf` < nominal, on interprète comme profit à faire pour atteindre le buffer.
     */
    if (buf != null && buf > 0) {
      const g = fundedBufferStrideFromCents(buf, nominalCents);
      goalCents = g.goalCents;
      strideCents = g.strideCents;
    } else {
      missingGoal = true;
    }
  }

  let displayState: AccountProgressModel["displayState"] = "active";
  if (account.status === "failed") displayState = "failed";
  else if (account.status !== "active" && account.status !== "passed") displayState = "inactive";
  else if (account.status === "passed" && account.accountType === "challenge" && lane === "funded") {
    displayState = "active";
  }

  const fullEquityCents = nominalCents + lifetimePnlCents - balancePayoutDeductionCents;

  /**
   * Funded avec baseline (conversion ou « maybe later ») : Start = taille de compte (150k → $150k, etc.),
   * Now = nominal + P&L **depuis** la baseline **− payouts enregistrés** (argent réellement restant).
   * Onglet Blown : nominal + P&L vie entière − payouts pour la carte « Now ».
   */
  let startCents: number;
  let currentCents: number;
  if (!forBlownTab && lane === "funded" && account.fundedProgressBaselinePnlCents != null) {
    startCents = nominalCents;
    currentCents = nominalCents + totalPnlCents - balancePayoutDeductionCents;
  } else {
    startCents = nominalCents;
    currentCents =
      nominalCents + (lane === "funded" ? lifetimePnlCents : totalPnlCents) - balancePayoutDeductionCents;
  }

  let progress01 = 0;
  if (!missingGoal && strideCents > 0) {
    let pnlForStride = totalPnlCents;
    if (
      lane === "funded" &&
      (account.accountType === "funded" || account.accountType === "live") &&
      fullEquityCents >= nominalCents
    ) {
      pnlForStride = Math.max(0, totalPnlCents);
    }
    progress01 = pnlForStride / strideCents;
  }

  return {
    account,
    lane,
    goalTitle,
    startCents,
    currentCents,
    goalCents,
    strideCents,
    progress01,
    ageDays,
    usdPerDay,
    displayState,
    missingGoal,
  };
}

/** Challenge / funded math for goals (buffer vs target). Used for the Blown tab. */
export function goalModeForAccount(acc: JournalAccount): "challenge" | "funded" {
  if (acc.accountType === "funded" || acc.accountType === "live") return "funded";
  if (acc.accountType === "challenge" && acc.status === "passed") return "funded";
  return "challenge";
}

export function accountBelongsToProgressLane(acc: JournalAccount, lane: ProgressLane): boolean {
  if (acc.isArchived) return false;
  if (lane === "blown") return acc.status === "failed";
  if (acc.status === "failed") return false;
  if (lane === "challenge") {
    return acc.accountType === "challenge" && acc.status === "active";
  }
  return (
    acc.accountType === "funded" ||
    acc.accountType === "live" ||
    (acc.accountType === "challenge" && acc.status === "passed")
  );
}

function sortProgress01(m: AccountProgressModel): number {
  return m.progress01;
}

export function sortProgressModels(a: AccountProgressModel, b: AccountProgressModel): number {
  const rank = (m: AccountProgressModel) => {
    if (m.displayState === "passed") return 0;
    if (m.displayState === "failed") return 3;
    if (m.displayState === "inactive") return 2;
    return 1;
  };
  const dr = rank(a) - rank(b);
  if (dr !== 0) return dr;
  if (a.missingGoal !== b.missingGoal) return a.missingGoal ? 1 : -1;
  return sortProgress01(b) - sortProgress01(a);
}

/** Blown accounts: most recently blown first (then `updatedAt`). */
export function sortBlownByRecency(a: AccountProgressModel, b: AccountProgressModel): number {
  const da = a.account.blownDate ?? "";
  const db = b.account.blownDate ?? "";
  if (da !== db) return db.localeCompare(da);
  return b.account.updatedAt.localeCompare(a.account.updatedAt);
}
