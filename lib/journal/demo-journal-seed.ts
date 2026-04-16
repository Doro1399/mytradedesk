import { nowIso } from "@/lib/journal/reducer";
import type {
  JournalAccount,
  JournalDataV1,
  JournalFeeEntry,
  JournalPayoutEntry,
  JournalPnlEntry,
} from "@/lib/journal/types";

const T0 = "2025-01-08T14:00:00.000Z";

/** Display total $6,196.00 — $1,549.00 per firm row (after TopStep 90 % / TPT 80 % display rules on gross). */
const DEMO_PAYOUT_DISPLAY_PER_FIRM_CENTS = 154_900;
const grossTopStepForDemoDisplay = Math.round(DEMO_PAYOUT_DISPLAY_PER_FIRM_CENTS / 0.9);
const grossTptForDemoDisplay = Math.round(DEMO_PAYOUT_DISPLAY_PER_FIRM_CENTS / 0.8);

function pnl(
  id: string,
  accountId: string,
  date: string,
  pnlCents: number,
  note?: string
): JournalPnlEntry {
  return {
    id,
    accountId,
    date,
    pnlCents,
    source: "manual",
    note,
    createdAt: T0,
    updatedAt: T0,
  };
}

function fee(
  id: string,
  accountId: string,
  date: string,
  type: JournalFeeEntry["type"],
  amountCents: number,
  note?: string
): JournalFeeEntry {
  return {
    id,
    accountId,
    date,
    type,
    amountCents,
    currency: "USD",
    note,
    createdAt: T0,
    updatedAt: T0,
  };
}

function payout(
  id: string,
  accountId: string,
  requestedDate: string,
  grossAmountCents: number,
  status: JournalPayoutEntry["status"] = "paid"
): JournalPayoutEntry {
  return {
    id,
    accountId,
    requestedDate,
    paidDate: requestedDate,
    grossAmountCents,
    netAmountCents: grossAmountCents,
    status,
    createdAt: T0,
    updatedAt: T0,
  };
}

/**
 * Rich invented workspace for the public `/demo` dashboard — not loaded from localStorage.
 * Prop firm ids/names avoid the legacy `"demo"` cleanup path in Accounts/Dashboard.
 */
export function createDemoJournalData(): JournalDataV1 {
  const accTopEval: JournalAccount = {
    id: "mtd-demo-top-eval",
    propFirm: { id: "topstep", name: "TopStep" },
    compareProgramName: "TopStep Standard",
    compareLabelSlot: 1,
    accountType: "challenge",
    sizeLabel: "50k",
    sizeNominalCents: 50_000_00,
    startDate: "2025-01-04",
    evaluationStartedDate: "2025-01-04",
    status: "active",
    isArchived: false,
    rulesSnapshot: { maxDrawdownCents: 2_000_00 },
    profitTargetLabel: "$3,000",
    displayAccountCode: "TSX-204918",
    createdAt: T0,
    updatedAt: T0,
  };

  const accApexBlown: JournalAccount = {
    id: "mtd-demo-apex-blown",
    propFirm: { id: "apex-trader-funding", name: "Apex Trader Funding" },
    compareProgramName: "Apex EOD",
    compareLabelSlot: 1,
    accountType: "challenge",
    sizeLabel: "100k",
    sizeNominalCents: 100_000_00,
    startDate: "2024-11-12",
    evaluationStartedDate: "2024-11-12",
    status: "failed",
    isArchived: false,
    blownDate: "2025-02-20",
    rulesSnapshot: { maxDrawdownCents: 3_000_00 },
    profitTargetLabel: "$6,000",
    displayAccountCode: "APEX-883102",
    createdAt: T0,
    updatedAt: T0,
  };

  const accBulPassed: JournalAccount = {
    id: "mtd-demo-bul-passed",
    propFirm: { id: "bulenox", name: "Bulenox" },
    compareProgramName: "Bulenox Master",
    compareLabelSlot: 1,
    accountType: "challenge",
    sizeLabel: "50k",
    sizeNominalCents: 50_000_00,
    startDate: "2024-10-01",
    evaluationStartedDate: "2024-10-01",
    status: "passed",
    isArchived: false,
    passedEvaluationDate: "2025-01-18",
    rulesSnapshot: { maxDrawdownCents: 2_500_00 },
    profitTargetLabel: "$3,000",
    displayAccountCode: "BLX-441029",
    createdAt: T0,
    updatedAt: T0,
  };

  const accBulFunded: JournalAccount = {
    id: "mtd-demo-bul-funded",
    propFirm: { id: "bulenox", name: "Bulenox" },
    compareProgramName: "Bulenox Master",
    compareLabelSlot: 2,
    accountType: "funded",
    sizeLabel: "50k",
    sizeNominalCents: 50_000_00,
    startDate: "2025-11-01",
    evaluationStartedDate: "2024-10-01",
    fundedConvertedDate: "2025-11-01",
    status: "active",
    isArchived: false,
    rulesSnapshot: { maxDrawdownCents: 2_500_00 },
    displayAccountCode: "BLX-F-220811",
    fundedProgressBaselinePnlCents: 0,
    createdAt: T0,
    updatedAt: T0,
  };

  const accTopFunded: JournalAccount = {
    id: "mtd-demo-top-funded",
    propFirm: { id: "topstep", name: "TopStep" },
    compareProgramName: "TopStep Standard",
    compareLabelSlot: 2,
    accountType: "funded",
    sizeLabel: "50k",
    sizeNominalCents: 50_000_00,
    startDate: "2024-08-20",
    evaluationStartedDate: "2024-07-10",
    fundedConvertedDate: "2024-08-20",
    status: "active",
    isArchived: false,
    rulesSnapshot: { maxDrawdownCents: 2_000_00, payoutSplitPct: 90 },
    displayAccountCode: "TSF-771255",
    fundedProgressBaselinePnlCents: 0,
    createdAt: T0,
    updatedAt: T0,
  };

  const accApexFundedBlown: JournalAccount = {
    id: "mtd-demo-apex-funded-lost",
    propFirm: { id: "apex-trader-funding", name: "Apex Trader Funding" },
    compareProgramName: "Apex EOD",
    compareLabelSlot: 2,
    accountType: "funded",
    sizeLabel: "150k",
    sizeNominalCents: 150_000_00,
    startDate: "2024-06-01",
    evaluationStartedDate: "2024-04-12",
    fundedConvertedDate: "2024-06-01",
    status: "failed",
    isArchived: false,
    blownDate: "2025-03-02",
    rulesSnapshot: { maxDrawdownCents: 5_000_00 },
    displayAccountCode: "APEX-F-991044",
    createdAt: T0,
    updatedAt: T0,
  };

  const accTptFunded: JournalAccount = {
    id: "mtd-demo-tpt-funded",
    propFirm: { id: "take-profit-trader", name: "Take Profit Trader" },
    compareProgramName: "Take Profit Trader",
    compareLabelSlot: 1,
    accountType: "funded",
    sizeLabel: "100k",
    sizeNominalCents: 100_000_00,
    startDate: "2025-02-01",
    evaluationStartedDate: "2024-12-05",
    fundedConvertedDate: "2025-02-01",
    status: "active",
    isArchived: false,
    rulesSnapshot: { maxDrawdownCents: 3_000_00, payoutSplitPct: 80 },
    displayAccountCode: "TPT-556812",
    fundedProgressBaselinePnlCents: 120_00,
    createdAt: T0,
    updatedAt: T0,
  };

  const accounts: Record<string, JournalAccount> = {
    [accTopEval.id]: accTopEval,
    [accApexBlown.id]: accApexBlown,
    [accBulPassed.id]: accBulPassed,
    [accBulFunded.id]: accBulFunded,
    [accTopFunded.id]: accTopFunded,
    [accApexFundedBlown.id]: accApexFundedBlown,
    [accTptFunded.id]: accTptFunded,
  };

  const pnlEntries: Record<string, JournalPnlEntry> = {
    "mtd-pnl-1": pnl("mtd-pnl-1", accTopEval.id, "2025-01-10", 420_00, "Session"),
    "mtd-pnl-2": pnl("mtd-pnl-2", accTopEval.id, "2025-01-14", -180_00),
    "mtd-pnl-3": pnl("mtd-pnl-3", accTopEval.id, "2025-01-22", 640_00),
    "mtd-pnl-4": pnl("mtd-pnl-4", accApexBlown.id, "2025-02-01", 310_00),
    "mtd-pnl-5": pnl("mtd-pnl-5", accApexBlown.id, "2025-02-18", -920_00),
    "mtd-pnl-6": pnl("mtd-pnl-6", accBulPassed.id, "2025-01-05", 880_00),
    "mtd-pnl-7": pnl("mtd-pnl-7", accTopFunded.id, "2025-01-12", 1_240_00),
    "mtd-pnl-8": pnl("mtd-pnl-8", accTopFunded.id, "2025-02-03", 560_00),
    "mtd-pnl-9": pnl("mtd-pnl-9", accTopFunded.id, "2025-03-08", -320_00),
    "mtd-pnl-10": pnl("mtd-pnl-10", accApexFundedBlown.id, "2025-02-28", -2_400_00),
    "mtd-pnl-11": pnl("mtd-pnl-11", accTptFunded.id, "2025-02-10", 2_100_00),
    "mtd-pnl-12": pnl("mtd-pnl-12", accTptFunded.id, "2025-03-01", 950_00),
    "mtd-pnl-13": pnl("mtd-pnl-13", accTptFunded.id, "2025-03-15", 410_00),
  };

  const feeEntries: Record<string, JournalFeeEntry> = {
    "mtd-fee-1": fee("mtd-fee-1", accTopEval.id, "2025-01-04", "challenge_fee", 49_00),
    "mtd-fee-2": fee("mtd-fee-2", accApexBlown.id, "2024-11-12", "challenge_fee", 220_00),
    "mtd-fee-3": fee("mtd-fee-3", accApexBlown.id, "2025-01-05", "reset_fee", 220_00),
    "mtd-fee-4": fee("mtd-fee-4", accBulPassed.id, "2024-10-01", "challenge_fee", 148_00),
    "mtd-fee-4b": fee("mtd-fee-4b", accBulFunded.id, "2025-11-01", "activation_fee", 148_00),
    "mtd-fee-5": fee("mtd-fee-5", accTopFunded.id, "2024-08-20", "activation_fee", 149_00),
    "mtd-fee-6": fee("mtd-fee-6", accApexFundedBlown.id, "2024-06-01", "activation_fee", 340_00),
    "mtd-fee-7": fee("mtd-fee-7", accTptFunded.id, "2025-02-01", "activation_fee", 130_00),
    "mtd-fee-8": fee("mtd-fee-8", accTopFunded.id, "2025-01-01", "monthly_subscription", 49_00, "Platform"),
  };

  /** One payout per funded account; displayed total $6,196 ($1,549 × 4 firms, after TopStep/TPT splits). */
  const payoutEntries: Record<string, JournalPayoutEntry> = {
    "mtd-pay-top": payout("mtd-pay-top", accTopFunded.id, "2026-01-18", grossTopStepForDemoDisplay),
    "mtd-pay-apex": payout("mtd-pay-apex", accApexFundedBlown.id, "2026-02-12", DEMO_PAYOUT_DISPLAY_PER_FIRM_CENTS),
    "mtd-pay-tpt": payout("mtd-pay-tpt", accTptFunded.id, "2026-03-06", grossTptForDemoDisplay),
    "mtd-pay-bul": payout("mtd-pay-bul", accBulFunded.id, "2026-04-24", DEMO_PAYOUT_DISPLAY_PER_FIRM_CENTS),
  };

  return {
    schemaVersion: 1,
    lastSavedAt: nowIso(),
    accounts,
    pnlEntries,
    feeEntries,
    payoutEntries,
    ui: {},
  };
}
