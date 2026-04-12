export type JournalId = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // ISO 8601

export type AccountType = "challenge" | "funded" | "live";
export type AccountStatus = "active" | "passed" | "failed" | "closed" | "archived";
export type CurrencyCode = "USD";

export type DrawdownType = "EOD" | "TRAILING" | "STATIC" | "EOT";

export type JournalPropFirmRef = {
  id: string;
  name: string;
};

/** User-edited rule copy for prop firm "Other" (account overview). */
export type OtherFirmRulesText = {
  drawdown?: string;
  dll?: string;
  /** Eval only */
  profitTarget?: string;
  /** Funded / live only */
  buffer?: string;
};

export type AccountRulesSnapshot = {
  drawdownType?: DrawdownType;
  maxDrawdownCents?: number;
  consistencyPct?: number | null;
  payoutCycleDays?: number | null;
  payoutMinCents?: number | null;
  payoutSplitPct?: number | null;
  /** Free-text rules when the firm is "Other" — editable in account view. */
  otherRulesText?: OtherFirmRulesText;
};

export type JournalAccount = {
  id: JournalId;
  propFirm: JournalPropFirmRef;
  accountType: AccountType;
  sizeLabel: string; // 25k, 50k...
  sizeNominalCents: number;
  startDate: ISODate;
  status: AccountStatus;
  isArchived: boolean;
  rulesSnapshot: AccountRulesSnapshot;
  notes?: string;
  /**
   * Compare row `accountName` (program), e.g. LucidFlex vs Lucid Pro.
   * With `compareLabelSlot`, drives default labels `Program #n`; slot does not change when other accounts are deleted.
   */
  compareProgramName?: string;
  /**
   * Stable index for default name `Program #n` within firm+program; never reused after delete (new accounts get max+1).
   */
  compareLabelSlot?: number;
  /** Shown in lists, e.g. APEX8205745797 */
  displayAccountCode?: string;
  /** From compare row `target`, e.g. "$1,500" or "6%" */
  profitTargetLabel?: string;
  /** Evaluation / account start (wizard start date); preserved when converting to funded. */
  evaluationStartedDate?: ISODate;
  /** Set when the evaluation is marked passed (Maybe later, bulk, or funded convert). */
  passedEvaluationDate?: ISODate;
  /** Set when the account is converted from eval to funded. */
  fundedConvertedDate?: ISODate;
  /**
   * Cumul P&L journal (toutes lignes) au moment du passage « passed » eval ou de la conversion funded.
   * Progress Funded affiche (PnL total actuel − ce montant), ce qui réinitialise l’affichage même si les
   * lignes manuelles ont des dates incorrectes.
   */
  fundedProgressBaselinePnlCents?: number;
  /** Set when the account is marked blown. */
  blownDate?: ISODate;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type PnlEntrySource = "manual" | "import";

export type JournalPnlEntry = {
  id: JournalId;
  accountId: JournalId;
  date: ISODate;
  pnlCents: number; // signed
  source?: PnlEntrySource;
  note?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type FeeType =
  | "challenge_fee"
  | "activation_fee"
  | "reset_fee"
  | "monthly_subscription"
  | "data_fee"
  | "platform_fee"
  | "other";

export type JournalFeeEntry = {
  id: JournalId;
  accountId: JournalId;
  date: ISODate;
  type: FeeType;
  amountCents: number; // positive cash out
  currency: CurrencyCode;
  note?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type PayoutStatus = "requested" | "approved" | "paid" | "rejected";

export type JournalPayoutEntry = {
  id: JournalId;
  accountId: JournalId;
  requestedDate: ISODate;
  paidDate?: ISODate;
  grossAmountCents: number; // positive cash in
  netAmountCents?: number;
  status: PayoutStatus;
  note?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type JournalUiState = {
  selectedAccountId?: JournalId;
  filters?: {
    firmIds?: string[];
    accountTypes?: AccountType[];
    statuses?: AccountStatus[];
  };
};

export type JournalDataV1 = {
  schemaVersion: 1;
  lastSavedAt: ISODateTime;
  accounts: Record<JournalId, JournalAccount>;
  pnlEntries: Record<JournalId, JournalPnlEntry>;
  feeEntries: Record<JournalId, JournalFeeEntry>;
  payoutEntries: Record<JournalId, JournalPayoutEntry>;
  ui: JournalUiState;
};

