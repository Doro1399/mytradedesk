import {
  isTradeifySelectVariantCompareRow,
  propFirms,
  type PropFirm,
} from "@/lib/prop-firms";
import type { JournalAccount } from "@/lib/journal/types";

/**
 * Anciens `compareProgramName` (workspace) → noms d’offre alignés CSV / Compare.
 */
function canonicalCompareProgramForLookup(firmName: string, program: string): string {
  const f = firmName.trim();
  const p = program.trim();
  if (f === "YRM Prop") {
    if (p === "Prime") return "YRM Prop Prime";
    if (p === "Instant Prime") return "YRM Prop Instant Prime";
  }
  if (f === "FuturesElite") {
    if (p === "Prime") return "FuturesElite Prime";
    if (p === "Elite") return "FuturesElite Elite";
    if (p === "Instant") return "FuturesElite Instant";
  }
  if (f === "Alpha Futures") {
    if (p === "Zero") return "Alpha Futures Zero";
    if (p === "Standard") return "Alpha Futures Standard";
    if (p === "Advanced") return "Alpha Futures Advanced";
  }
  if (f === "Legends Trading") {
    if (p === "Apprentice") return "Legends Trading Apprentice";
    if (p === "Elite") return "Legends Trading Elite";
  }
  if (f === "AquaFutures") {
    if (p === "Beginner") return "One Step Beginner";
  }
  return p;
}

/** Eval (challenge) row for firm + program + size — used when resetting Passed → Active. */
export function findEvalCompareRow(acc: JournalAccount): PropFirm | null {
  const programRaw = acc.compareProgramName?.trim() || acc.propFirm.name;
  const program = canonicalCompareProgramForLookup(acc.propFirm.name, programRaw);
  const size = acc.sizeLabel.trim().toLowerCase() as PropFirm["size"];
  let rows = propFirms.filter(
    (r) =>
      r.name === acc.propFirm.name &&
      r.accountName === program &&
      r.size === size &&
      !(acc.propFirm.name.trim() === "Tradeify" && isTradeifySelectVariantCompareRow(r))
  );
  if (rows.length === 0) {
    if (
      acc.propFirm.name.trim() === "Tradeify" &&
      (program === "Tradeify Select Daily" || program === "Tradeify Select Flex")
    ) {
      rows = propFirms.filter(
        (r) => r.name === "Tradeify" && r.accountName === "Tradeify Select" && r.size === size
      );
    } else {
      rows = propFirms.filter(
        (r) =>
          r.name === acc.propFirm.name &&
          r.size === size &&
          !(acc.propFirm.name.trim() === "Tradeify" && isTradeifySelectVariantCompareRow(r))
      );
    }
  }
  return rows.find((r) => r.accountType === "Eval") ?? rows[0] ?? null;
}

/**
 * Same resolution as the compare table: firm + compare program + size,
 * so we do not pick another program’s Direct row (wrong activation).
 */
export function findFundedCompareRow(acc: JournalAccount): PropFirm | null {
  const programRaw = acc.compareProgramName?.trim() || acc.propFirm.name;
  const program = canonicalCompareProgramForLookup(acc.propFirm.name, programRaw);
  const size = acc.sizeLabel.trim().toLowerCase() as PropFirm["size"];
  const rows = propFirms.filter((f) => f.name === acc.propFirm.name);

  if (acc.propFirm.name.trim() === "Tradeify") {
    if (program === "Tradeify Select Daily" || program === "Tradeify Select Flex") {
      const m = rows.filter(
        (f) => f.accountName === program && f.size === size && f.accountType === "Eval"
      );
      if (m.length) return m[0]!;
    }
    /**
     * Growth / Select (éval unifiée) : pas de ligne « Direct » dans le compare — éviter le repli
     * « même taille → Ligthning ». On réutilise la ligne Eval du programme (funded = même track).
     */
    if (program === "Tradeify Growth" || program === "Tradeify Select") {
      const m = rows.filter(
        (f) =>
          f.accountName === program &&
          f.size === size &&
          f.accountType === "Eval" &&
          !isTradeifySelectVariantCompareRow(f)
      );
      if (m.length) return m[0]!;
    }
  }

  let matches = rows.filter(
    (f) =>
      f.accountName === program && f.size === size && f.accountType === "Direct"
  );
  if (matches.length === 0) {
    const byProgram = rows.filter(
      (f) => f.accountName === program && f.accountType === "Direct"
    );
    if (byProgram.length === 1) {
      matches = byProgram;
    } else if (byProgram.length > 1) {
      const bySize = byProgram.filter((f) => f.size === size);
      matches = bySize.length > 0 ? bySize : byProgram;
    }
  }
  return matches[0] ?? null;
}

/** Max drawdown (USD cents) from compare: Eval for challenges; Direct else Eval for funded / passed / live. */
export function compareMaxDrawdownCentsForJournal(acc: JournalAccount): number | null {
  if (acc.accountType === "challenge") {
    const row = findEvalCompareRow(acc);
    return row != null ? Math.round(row.maxDrawdownLimitUsd * 100) : null;
  }
  const row = findFundedCompareRow(acc) ?? findEvalCompareRow(acc);
  return row != null ? Math.round(row.maxDrawdownLimitUsd * 100) : null;
}
