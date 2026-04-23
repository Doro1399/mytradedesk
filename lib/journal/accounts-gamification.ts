import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import type { AccountStatus, AccountType, JournalAccount, JournalDataV1 } from "@/lib/journal/types";

export type PortfolioHygiene = {
  tier: "locked" | "solid" | "building" | "warmup";
  label: string;
  sub: string;
};

/** Compte funded / live « en jeu » (aligné sur le desk : actif **ou** passé, pas blown/closed). */
function isActiveFundedOrLiveInPlay(a: JournalAccount): boolean {
  if (a.accountType !== "funded" && a.accountType !== "live") return false;
  return a.status === "active" || a.status === "passed";
}

/**
 * Scores how well the roster is documented (fees / cash movement), not P&amp;L skill.
 */
export function getPortfolioHygiene(state: JournalDataV1, accounts: JournalAccount[]): PortfolioHygiene {
  const roster = accounts.filter((a) => !a.isArchived);
  if (roster.length === 0) {
    return {
      tier: "warmup",
      label: "Roster empty",
      sub: "Add an account to start leveling up your workspace.",
    };
  }
  let withFees = 0;
  let withCashSignal = 0;
  for (const a of roster) {
    const m = getAccountFinancialMetrics(state, a.id);
    if (m.totalFeesCents > 0) withFees++;
    if (m.totalFeesCents > 0 || m.totalPayoutsCents > 0 || m.totalPnlCents !== 0) withCashSignal++;
  }
  const feeRatio = withFees / roster.length;
  const signalRatio = withCashSignal / roster.length;

  if (feeRatio >= 0.85 && roster.length >= 2) {
    return {
      tier: "locked",
      label: "Locked in",
      sub: "Strong fee coverage on your roster.",
    };
  }
  if (feeRatio >= 0.5 || signalRatio >= 0.75) {
    return {
      tier: "solid",
      label: "Solid ledger",
      sub: "Most accounts have fees or cash movement recorded.",
    };
  }
  if (signalRatio >= 0.35 || feeRatio >= 0.25) {
    return {
      tier: "building",
      label: "Building",
      sub: "Keep logging fees and payouts to tighten the picture.",
    };
  }
  return {
    tier: "warmup",
    label: "Warm-up",
    sub: "Log challenge fees and payouts as you go.",
  };
}

export type AccountLaneBadge = {
  label: string;
  className: string;
};

export function accountLaneBadge(
  accountType: AccountType,
  status: AccountStatus
): AccountLaneBadge {
  if (accountType === "challenge") {
    if (status === "failed") {
      return {
        label: "Blown",
        className: "border-rose-400/35 bg-rose-500/12 text-rose-200/88",
      };
    }
    if (status === "passed") {
      return {
        label: "Passed",
        className: "border-violet-400/35 bg-violet-500/12 text-violet-200/88",
      };
    }
    return {
      label: "Eval",
      className: "border-sky-400/35 bg-sky-500/12 text-sky-200/88",
    };
  }
  if (accountType === "funded") {
    if (status === "failed") {
      return {
        label: "Blown",
        className: "border-rose-400/35 bg-rose-500/12 text-rose-200/88",
      };
    }
    return {
      label: "Funded",
      className: "border-emerald-400/35 bg-emerald-500/12 text-emerald-200/88",
    };
  }
  if (status === "failed") {
    return {
      label: "Blown",
      className: "border-rose-400/35 bg-rose-500/12 text-rose-200/88",
    };
  }
  return {
    label: "Live",
    className: "border-amber-400/35 bg-amber-500/12 text-amber-200/88",
  };
}

export type RosterMilestone = { id: string; label: string; met: boolean };

export function rosterMilestones(accounts: JournalAccount[]): RosterMilestone[] {
  const roster = accounts.filter((a) => !a.isArchived);
  const firmKeys = new Set(roster.map((a) => a.propFirm.id || a.propFirm.name));
  const activeFunded = roster.filter((a) => isActiveFundedOrLiveInPlay(a));
  const evalActive = roster.filter((a) => a.accountType === "challenge" && a.status === "active");
  return [
    { id: "three", label: "3+ accounts", met: roster.length >= 3 },
    { id: "firms2", label: "2+ firms", met: firmKeys.size >= 2 },
    { id: "funded", label: "Active funded", met: activeFunded.length >= 1 },
    { id: "eval", label: "Active eval", met: evalActive.length >= 1 },
  ];
}
