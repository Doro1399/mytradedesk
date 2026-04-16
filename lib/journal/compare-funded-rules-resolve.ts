import {
  resolveApexAccountRulesCard,
  type ApexAccountRulesCard,
} from "@/lib/journal/apex-journal-rules";
import { resolveBulenoxAccountRulesCard } from "@/lib/journal/bulenox-journal-rules";
import { resolveFundedFuturesNetworkAccountRulesCard } from "@/lib/journal/funded-futures-network-journal-rules";
import { resolveFundedNextAccountRulesCard } from "@/lib/journal/funded-next-journal-rules";
import { resolveLucidAccountRulesCard } from "@/lib/journal/lucid-journal-rules";
import { resolveSevenFirmsAccountRulesCard } from "@/lib/journal/seven-firms-journal-rules";
import { resolveTptAccountRulesCard } from "@/lib/journal/tpt-journal-rules";
import { resolveTopStepAccountRulesCard } from "@/lib/journal/topstep-journal-rules";
import { resolveTradeifyAccountRulesCard } from "@/lib/journal/tradeify-journal-rules";
import { resolveAquaFuturesCompareFundedRulesCard } from "@/lib/journal/aquafutures-compare-funded-rules";
import { resolveAlphaFuturesCompareFundedRulesCard } from "@/lib/journal/alpha-futures-compare-funded-rules";
import { resolveLegendsTradingCompareFundedRulesCard } from "@/lib/journal/legends-trading-compare-funded-rules";
import { resolveFuturesEliteCompareFundedRulesCard } from "@/lib/journal/futures-elite-compare-funded-rules";
import { resolveYrmPropCompareFundedRulesCard } from "@/lib/journal/yrm-prop-compare-funded-rules";
import type { JournalAccount, JournalDataV1 } from "@/lib/journal/types";
import type { PropFirm } from "@/lib/prop-firms";

export function journalPreviewStateEmpty(): JournalDataV1 {
  const t = new Date().toISOString();
  return {
    schemaVersion: 1,
    lastSavedAt: t,
    accounts: {},
    pnlEntries: {},
    feeEntries: {},
    payoutEntries: {},
    ui: {},
  };
}

function sizeNominalCents(size: PropFirm["size"]): number {
  const m = /^(\d+)k$/i.exec(size);
  if (!m) return 0;
  return Number(m[1]) * 1000 * 100;
}

/**
 * Compte journal synthétique « funded » aligné sur une ligne compare — même résolution
 * que l’aperçu Rules du compte (phase funded / PnL à zéro pour les tiers de scaling).
 */
export function syntheticFundedJournalAccountFromCompareRow(f: PropFirm): JournalAccount {
  const t = new Date().toISOString();
  return {
    id: `compare-funded-preview-${f.id}`,
    propFirm: { id: String(f.id), name: f.name },
    accountType: "funded",
    sizeLabel: f.size,
    sizeNominalCents: sizeNominalCents(f.size),
    startDate: "2020-01-01",
    status: "active",
    isArchived: false,
    rulesSnapshot: {},
    compareProgramName: f.accountName,
    displayAccountCode: f.accountName,
    createdAt: t,
    updatedAt: t,
  };
}

/** Même ordre que `AccountOverviewContent` (carte règles éval / funded). */
export function resolveCompareRowFundedRulesCard(firm: PropFirm): ApexAccountRulesCard | null {
  const yrm = resolveYrmPropCompareFundedRulesCard(firm);
  if (yrm) return yrm;
  const aqua = resolveAquaFuturesCompareFundedRulesCard(firm);
  if (aqua) return aqua;
  const futuresElite = resolveFuturesEliteCompareFundedRulesCard(firm);
  if (futuresElite) return futuresElite;
  const alphaFutures = resolveAlphaFuturesCompareFundedRulesCard(firm);
  if (alphaFutures) return alphaFutures;
  const legendsTrading = resolveLegendsTradingCompareFundedRulesCard(firm);
  if (legendsTrading) return legendsTrading;

  const state = journalPreviewStateEmpty();
  const account = syntheticFundedJournalAccountFromCompareRow(firm);
  return (
    resolveApexAccountRulesCard(state, account) ??
    resolveTopStepAccountRulesCard(state, account) ??
    resolveBulenoxAccountRulesCard(state, account) ??
    resolveTradeifyAccountRulesCard(state, account) ??
    resolveSevenFirmsAccountRulesCard(state, account) ??
    resolveFundedNextAccountRulesCard(state, account) ??
    resolveFundedFuturesNetworkAccountRulesCard(state, account) ??
    resolveTptAccountRulesCard(state, account) ??
    resolveLucidAccountRulesCard(state, account)
  );
}
