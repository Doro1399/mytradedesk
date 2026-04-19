"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkspaceProfile } from "@/components/auth/workspace-profile-provider";
import { useJournal } from "@/components/journal/journal-provider";
import {
  canAddJournalAccounts,
  remainingAccountSlots,
} from "@/lib/auth/accounts-limit";
import { shouldShowLitePlanBanner } from "@/lib/auth/plan";
import { ACCOUNT_LIMIT_REACHED_EVENT } from "@/lib/auth/constants";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import { nowIso } from "@/lib/journal/reducer";
import { getAccountPayoutTotalDisplayCents } from "@/lib/journal/payout-display";
import {
  isTradeDayFundedJournalAccount,
  sumNonRejectedJournalPayoutGrossCents,
  tradedayTraderNetFromGrossMarginal,
} from "@/lib/journal/tradeday-journal-rules";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import type { AccountStatus, AccountType, JournalAccount } from "@/lib/journal/types";
import { resolveAccountDisplayName, useAutoAccountLabelById } from "@/components/journal/account-auto-labels";
import {
  AccountRowEditPopover,
  type AccountRowSavePayload,
} from "@/components/journal/account-row-edit-popover";
import { AccountStatusDropdown } from "@/components/journal/account-status-dropdown";
import { BulkSelectionBar } from "@/components/journal/bulk-selection-bar";
import { DeleteAccountsModal } from "@/components/journal/delete-accounts-modal";
import {
  AddPayoutModal,
  type PayoutModalAccountLine,
} from "@/components/journal/add-payout-modal";
import { EditPayoutFlowModal } from "@/components/journal/edit-payout-flow-modal";
import { JournalWorkspaceShell } from "@/components/journal/journal-workspace-shell";
import { LitePlanAddAccountUpgradeHover } from "@/components/journal/lite-plan-add-account-upgrade-hover";
import { PassedConvertModalHost, type PassedConvertFlow } from "@/components/journal/passed-convert-modals";
import { FilterCheckbox } from "@/components/journal/filter-checkbox";
import { SIDEBAR_PROP_FIRMS } from "@/lib/prop-firm-sidebar";

/** Matches dashboard / trades desk headers — do not use `text-xs` here (differs from other pages). */
const DESK_PAGE_SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";
import { DEFAULT_NEW_ACCOUNT_DISPLAY_NAME } from "@/lib/journal/default-account-display-name";
import { compareMaxDrawdownCentsForJournal } from "@/lib/journal/compare-account-helpers";
import { labelGroupKey, maxCompareLabelSlotInGroup } from "@/lib/journal/label-slot-helpers";
import {
  dispatchFundConversion,
  dispatchIntroPassedMaybeLater,
} from "@/lib/journal/fund-conversion-actions";
import { lookupJournalBufferCents } from "@/lib/journal/journal-buffer-lookup";
import {
  effectivePrice,
  formatUsdWholeGrouped,
  isTradeifySelectVariantCompareRow,
  propFirms,
} from "@/lib/prop-firms";
import { getPortfolioHygiene, rosterMilestones } from "@/lib/journal/accounts-gamification";
/** Wizard: program pills order (compare rows are not always in display order in `propFirms`). */
const TRADEIFY_PROGRAM_ORDER = [
  "Tradeify Growth",
  "Tradeify Ligthning",
  "Tradeify Select",
] as const;

/** Matches compare / `propFirms` grouping for DayTraders (incl. EOD from Day Traders Rules.csv). */
const DAYTRADERS_PROGRAM_ORDER = [
  "DayTraders Trail",
  "DayTraders Static",
  "DayTraders Core Plan",
  "DayTraders Edge Plan",
  "DayTraders Ultra Plan",
  "DayTraders EOD",
  "DayTraders S2F",
] as const;

function sortProgramNamesForJournalFirm(firmName: string, names: string[]): string[] {
  if (firmName === "Tradeify") {
    const rank = (n: string) => {
      const i = (TRADEIFY_PROGRAM_ORDER as readonly string[]).indexOf(n);
      return i === -1 ? 999 : i;
    };
    return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }
  if (firmName === "DayTraders") {
    const rank = (n: string) => {
      const i = (DAYTRADERS_PROGRAM_ORDER as readonly string[]).indexOf(n);
      return i === -1 ? 999 : i;
    };
    return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }
  return names;
}

/** Accepts "18.7" or "18,7" (compare-style). */
function parseLooseUsd(input: string): number | null {
  const t = input.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatUsdFrShort(value: number): string {
  return `$${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function accountKindUpper(t: AccountType): string {
  switch (t) {
    case "challenge":
      return "EVALUATION";
    case "funded":
      return "FUNDED";
    case "live":
      return "LIVE";
    default:
      return t;
  }
}

function accountKindSublineClass(t: AccountType): string {
  const base = "mt-0.5 text-[11px] font-medium uppercase tracking-wide";
  if (t === "funded" || t === "live") return `${base} text-emerald-400/95`;
  return `${base} text-white/40`;
}

const SUBLINE_BASE =
  "mt-0.5 text-[11px] font-medium uppercase tracking-wide";

/** Subline under account name: Passed → funded track; Blown → red challenge/funded label. */
function accountKindSublineClassForRow(acc: JournalAccount): string {
  if (acc.status === "failed") {
    return `${SUBLINE_BASE} text-red-400/95`;
  }
  if (acc.status === "passed") {
    return `${SUBLINE_BASE} text-emerald-400/95`;
  }
  return accountKindSublineClass(acc.accountType);
}

function accountKindSublineText(acc: JournalAccount): string {
  if (acc.status === "failed") {
    if (acc.accountType === "funded" || acc.accountType === "live") {
      return "FUNDED BLOWN";
    }
    return "EVALUATION BLOWN";
  }
  if (acc.status === "passed") return "FUNDED";
  return accountKindUpper(acc.accountType);
}

/** Sort key: same firm → alphabetical base name → #1 before #2 before #10 */
function parseDisplaySortParts(label: string): { base: string; num: number } {
  const m = label.trim().match(/^(.*?)\s*#\s*(\d+)\s*$/);
  if (m) {
    return { base: m[1].trim().toLowerCase(), num: Number(m[2]) };
  }
  return { base: label.trim().toLowerCase(), num: Number.POSITIVE_INFINITY };
}

/** Funded / live rows sort above challenges (within the same blown vs not bucket). */
function accountKindSortTier(acc: JournalAccount): number {
  if (acc.accountType === "funded" || acc.accountType === "live") return 0;
  return 1;
}

function compareAccountsTableOrder(
  a: JournalAccount,
  b: JournalAccount,
  autoMap: Map<string, string>
): number {
  const aBlown = a.status === "failed" ? 1 : 0;
  const bBlown = b.status === "failed" ? 1 : 0;
  if (aBlown !== bBlown) return aBlown - bBlown;

  const aKind = accountKindSortTier(a);
  const bKind = accountKindSortTier(b);
  if (aKind !== bKind) return aKind - bKind;

  const byFirm = a.propFirm.name.localeCompare(b.propFirm.name, undefined, {
    sensitivity: "base",
  });
  if (byFirm !== 0) return byFirm;
  const na = resolveAccountDisplayName(a, autoMap);
  const nb = resolveAccountDisplayName(b, autoMap);
  const pa = parseDisplaySortParts(na);
  const pb = parseDisplaySortParts(nb);
  const byBase = pa.base.localeCompare(pb.base, undefined, { sensitivity: "base" });
  if (byBase !== 0) return byBase;
  return pa.num - pb.num;
}

function PencilEditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

type AccountTableFilter =
  | "all"
  | "challenges"
  | "funded"
  | "ongoing"
  | "passed"
  | "failed";

type AccountColumnFiltersState = {
  name: string;
  firm: string;
  size: string;
  status: "" | AccountStatus;
  pnl: "" | "pos" | "neg" | "zero";
};

const INITIAL_ACCOUNT_COLUMN_FILTERS: AccountColumnFiltersState = {
  name: "",
  firm: "",
  size: "",
  status: "",
  pnl: "",
};

const STATUS_FILTER_ORDER = ["", "active", "passed", "failed"] as const satisfies readonly AccountColumnFiltersState["status"][];
const PNL_FILTER_ORDER = ["", "pos", "neg", "zero"] as const satisfies readonly AccountColumnFiltersState["pnl"][];

function cycleStatus(s: AccountColumnFiltersState["status"]): AccountColumnFiltersState["status"] {
  const normalized: (typeof STATUS_FILTER_ORDER)[number] =
    s === "active" || s === "passed" || s === "failed" || s === "" ? s : "";
  const i = STATUS_FILTER_ORDER.indexOf(normalized);
  return STATUS_FILTER_ORDER[(i === -1 ? 0 : i + 1) % STATUS_FILTER_ORDER.length];
}
function cyclePnl(p: AccountColumnFiltersState["pnl"]): AccountColumnFiltersState["pnl"] {
  const i = PNL_FILTER_ORDER.indexOf(p);
  return PNL_FILTER_ORDER[(i === -1 ? 0 : i + 1) % PNL_FILTER_ORDER.length];
}

const COL_HEAD_BTN =
  "group w-full rounded-lg px-1 py-1 text-left transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400/40";
const COL_HEAD_BTN_CENTER =
  "group w-full rounded-lg px-1 py-1 text-center transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400/40";

/** Target vs buffer in the combined column — header text matches this split. */
function firmLogoSrcForJournalFirmName(firmName: string): string | null {
  const n = firmName.trim();
  return propFirms.find((f) => f.name.trim() === n)?.firmLogoSrc ?? null;
}

function targetBufferCellValue(
  filter: AccountTableFilter,
  acc: JournalAccount,
  profitTarget: string,
  bufferUsdStr: string
): string {
  if (filter === "challenges") return profitTarget;
  if (filter === "funded" || filter === "passed") return bufferUsdStr;
  if (filter === "ongoing" || filter === "failed") {
    return acc.accountType === "challenge" ? profitTarget : bufferUsdStr;
  }
  if (acc.status === "passed") return bufferUsdStr;
  if (acc.accountType === "funded" || acc.accountType === "live") return bufferUsdStr;
  return profitTarget;
}

type CreateAccountForm = {
  firmName: string;
  programName: string;
  sizeLabel: string;
  startDate: string;
  notes: string;
  quantity: number;
  challengeFeeUsd: string;
  recordChallengeFee: boolean;
};

const defaultForm: CreateAccountForm = {
  firmName: "",
  programName: "",
  sizeLabel: "50k",
  startDate: isoDateLocal(),
  notes: "",
  quantity: 1,
  challengeFeeUsd: "",
  recordChallengeFee: true,
};

type AccountLedgerRowModel = {
  acc: JournalAccount;
  code: string;
  sizeUsd: number;
  compareDdCents: number | null;
  csvBufferCents: number | null;
  profitTarget: string;
  bufferUsdStr: string;
  targetBufferCell: string;
  feesStr: string;
  payoutsStr: string;
  hasPayoutRows: boolean;
  isFundedOrLive: boolean;
  pnlC: number;
  tradePnlStr: string;
  tradePnlClass: string;
  firmLogoSrc: string | null;
};

function AccountMobileLedgerCard({
  row,
  tableSelectionMode,
  selected,
  targetBufferColumnLabel,
  isAccountEditable,
  onTableRowClick,
  onSelectCheckbox,
  onOpenEditName,
  onStatusSelect,
  onPayoutClick,
}: {
  row: AccountLedgerRowModel;
  tableSelectionMode: boolean;
  selected: boolean;
  targetBufferColumnLabel: string;
  isAccountEditable: (id: string) => boolean;
  onTableRowClick: () => void;
  onSelectCheckbox: () => void;
  onOpenEditName: (rect: DOMRect) => void;
  onStatusSelect: (accountId: string, next: AccountStatus) => void;
  onPayoutClick: () => void;
}) {
  const { acc, code, firmLogoSrc } = row;
  const initial = (acc.propFirm.name.trim().charAt(0) || "?").toUpperCase();
  const editable = isAccountEditable(acc.id);

  return (
    <article
      className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:bg-white/[0.04]"
      onClick={onTableRowClick}
    >
      <div className="flex gap-3">
        {tableSelectionMode ? (
          <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
            <FilterCheckbox checked={selected} aria-label={`Select ${code}`} onCheckedChange={onSelectCheckbox} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-center text-center">
            {firmLogoSrc ? (
              <Image
                src={firmLogoSrc}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-xl bg-white/[0.06] object-contain ring-1 ring-white/10"
              />
            ) : (
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-lg font-bold uppercase text-white/70 ring-1 ring-white/10"
                aria-hidden
              >
                {initial}
              </span>
            )}
            <p className="mt-2 max-w-full text-xs font-medium leading-snug text-white/55">{acc.propFirm.name}</p>
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              disabled={!editable}
              className="group/acct flex w-full items-start gap-2 rounded-lg px-0.5 py-1 text-left transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                if (!editable) return;
                onOpenEditName((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold leading-snug text-white">{code}</div>
                <p className={accountKindSublineClassForRow(acc)}>{accountKindSublineText(acc)}</p>
              </div>
              <span className="mt-1 shrink-0 text-white/0 transition group-hover/acct:text-white/45" aria-hidden>
                <PencilEditIcon className="h-4 w-4" />
              </span>
            </button>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Size</p>
                <p className="mt-0.5 tabular-nums font-medium text-white/85">
                  {formatUsdWholeGrouped(row.sizeUsd)}
                </p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Status</p>
                <div className="mt-1.5 flex justify-start">
                  <AccountStatusDropdown
                    key={acc.id}
                    accountId={acc.id}
                    account={acc}
                    onSelect={onStatusSelect}
                    planReadOnly={!editable}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                  {targetBufferColumnLabel}
                </p>
                <p className="mt-0.5 tabular-nums text-white/75">{row.targetBufferCell}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">DD</p>
                <p className="mt-0.5 tabular-nums text-white/60">
                  {row.compareDdCents != null && row.compareDdCents > 0
                    ? formatUsdWholeGrouped(row.compareDdCents / 100)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Fees</p>
                <p className="mt-0.5 tabular-nums text-white/75">{row.feesStr}</p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Payouts</p>
                <button
                  type="button"
                  disabled={!row.isFundedOrLive}
                  onClick={() => {
                    if (!row.isFundedOrLive) return;
                    onPayoutClick();
                  }}
                  aria-label={
                    row.hasPayoutRows ? `Edit payouts for ${code}` : `Add payout for ${code}`
                  }
                  className="mt-0.5 tabular-nums font-medium text-amber-400/95 transition hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                >
                  {row.payoutsStr}
                </button>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Trade P&amp;L</p>
                <p
                  className={`mt-0.5 tabular-nums ${row.tradePnlClass}`}
                  title="Sum of workspace P&L lines for this account (trades sync + manual)"
                >
                  {row.tradePnlStr}
                </p>
              </div>
            </div>

            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/desk/accounts/${acc.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/38 bg-gradient-to-b from-sky-500/22 via-sky-600/12 to-sky-950/30 px-4 py-2.5 text-sm font-semibold tracking-tight text-sky-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.11),0_2px_16px_rgba(56,189,248,0.14)] transition hover:border-sky-300/50 hover:from-sky-400/28 hover:via-sky-500/16 hover:to-sky-900/35 hover:shadow-[0_4px_24px_rgba(56,189,248,0.22)] active:scale-[0.98]"
              >
                <span>View account</span>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-sky-200/90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function JournalAccountsPage() {
  const { state, dispatch, hydrated, isAccountEditable } = useJournal();
  const { profile, accountsLimit } = useWorkspaceProfile();
  const liteAddAccountUpgradeHover = shouldShowLitePlanBanner(profile);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CreateAccountForm>(defaultForm);
  const [firmSearch, setFirmSearch] = useState("");
  /** True after the user edits the challenge fee field — compare autofill must not overwrite until they pick firm/program/size again. */
  const challengeFeeUserEditedRef = useRef(false);
  const prevSelectedFirmForSyncRef = useRef<string | null>(null);
  const prevIsCreatingRef = useRef(false);
  /** Tracks wizard open separately from `prevIsCreatingRef` (fee effect updates that ref first). */
  const wizardSyncOpenRef = useRef(false);
  const [accountFilter, setAccountFilter] = useState<AccountTableFilter>("all");
  /** Filtres additionnels (n’altèrent pas le tri de base `compareAccountsTableOrder`). */
  const [columnFilters, setColumnFilters] =
    useState<AccountColumnFiltersState>(INITIAL_ACCOUNT_COLUMN_FILTERS);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(() => new Set());
  const [tableSelectionMode, setTableSelectionMode] = useState(false);
  const [passedFlow, setPassedFlow] = useState<PassedConvertFlow>(null);
  /** Remaining challenge accounts for bulk “Passed” after the current modal */
  const passedChallengeQueueRef = useRef<string[]>([]);
  const [accountEditOpen, setAccountEditOpen] = useState<{
    accountId: string;
    rect: DOMRect;
  } | null>(null);
  const [deleteAccountIds, setDeleteAccountIds] = useState<string[] | null>(null);
  const [payoutAccountIds, setPayoutAccountIds] = useState<string[] | null>(null);
  const [editPayoutAccountId, setEditPayoutAccountId] = useState<string | null>(null);

  const accounts = useMemo(
    () => Object.values(state.accounts).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.accounts]
  );

  const accountCount = useMemo(() => Object.keys(state.accounts).length, [state.accounts]);
  const slotsRemaining = remainingAccountSlots(accountCount, accountsLimit);
  const canAddMoreAccounts = canAddJournalAccounts(accountCount, accountsLimit);
  const quantityMax = Math.min(20, Math.max(0, slotsRemaining));

  const autoAccountLabelById = useAutoAccountLabelById(accounts);

  const nonArchivedAccounts = useMemo(
    () => accounts.filter((a) => !a.isArchived),
    [accounts]
  );
  const firmFilterOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of nonArchivedAccounts) s.add(a.propFirm.name);
    return [...s].sort((x, y) => x.localeCompare(y));
  }, [nonArchivedAccounts]);
  const sizeFilterOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of nonArchivedAccounts) s.add(a.sizeLabel.trim().toLowerCase());
    return [...s].sort();
  }, [nonArchivedAccounts]);
  const columnFiltersActive = useMemo(
    () =>
      columnFilters.name.trim() !== "" ||
      columnFilters.firm !== "" ||
      columnFilters.size !== "" ||
      columnFilters.status !== "" ||
      columnFilters.pnl !== "",
    [columnFilters]
  );

  /** When filtering from column headers, align the pill row (above Ledger hygiene) with status. */
  useEffect(() => {
    const { status } = columnFilters;
    if (status === "active") {
      setAccountFilter("ongoing");
    } else if (status === "passed") {
      setAccountFilter("passed");
    } else if (status === "failed") {
      setAccountFilter("failed");
    }
  }, [columnFilters.status]);

  const exitBulkSelection = useCallback(() => {
    setSelectedAccountIds(new Set());
    setTableSelectionMode(false);
  }, []);

  const openCreateWizard = useCallback(() => {
    if (!canAddMoreAccounts) {
      window.dispatchEvent(new Event(ACCOUNT_LIMIT_REACHED_EVENT));
      return;
    }
    setIsCreating(true);
  }, [canAddMoreAccounts]);

  const [columnFilterPopover, setColumnFilterPopover] = useState<null | {
    kind: "name" | "firm" | "size";
    rect: DOMRect;
  }>(null);
  const columnFilterPopoverRef = useRef<HTMLDivElement>(null);
  const columnFilterNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (columnFilterPopover?.kind !== "name") return;
    columnFilterNameInputRef.current?.focus();
  }, [columnFilterPopover]);

  useEffect(() => {
    if (!columnFilterPopover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setColumnFilterPopover(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [columnFilterPopover]);

  const formatAccountLabel = useCallback(
    (a: JournalAccount) => resolveAccountDisplayName(a, autoAccountLabelById),
    [autoAccountLabelById]
  );

  /** Name + type in one dispatch — avoids the second write wiping `accountType` */
  const saveAccountRowEdit = useCallback(
    (accountId: string, p: AccountRowSavePayload) => {
      const acc = state.accounts[accountId];
      if (!acc) return;
      if (!isAccountEditable(accountId)) return;
      const auto = autoAccountLabelById.get(accountId);
      const displayAccountCode =
        p.displayName === "" || (auto != null && p.displayName === auto)
          ? undefined
          : p.displayName;
      const switchingToFundedOrLive =
        (p.accountType === "funded" || p.accountType === "live") && acc.accountType === "challenge";
      const leaveFundedForChallenge =
        (acc.accountType === "funded" || acc.accountType === "live") && p.accountType === "challenge";
      const next: JournalAccount = {
        ...acc,
        accountType: p.accountType,
        displayAccountCode,
        updatedAt: nowIso(),
      };
      if (leaveFundedForChallenge) {
        next.fundedProgressBaselinePnlCents = undefined;
      }
      if (switchingToFundedOrLive) {
        if (!next.fundedConvertedDate) {
          next.fundedConvertedDate = acc.passedEvaluationDate ?? isoDateLocal();
        }
        next.fundedProgressBaselinePnlCents = getAccountFinancialMetrics(state, accountId).totalPnlCents;
      }
      dispatch({
        type: "account/upsert",
        payload: next,
      });
    },
    [state, dispatch, autoAccountLabelById, isAccountEditable]
  );

  const passedAccount = passedFlow ? state.accounts[passedFlow.accountId] : null;

  function closePassedFlowOrAdvanceQueue() {
    const q = passedChallengeQueueRef.current;
    if (q.length > 0) {
      const id = q.shift()!;
      setPassedFlow({ accountId: id, phase: "intro" });
    } else {
      setPassedFlow(null);
    }
  }

  const handleStatusSelect = useCallback(
    (accountId: string, next: AccountStatus) => {
      if (!isAccountEditable(accountId)) return;
      const acc = state.accounts[accountId];
      if (!acc || acc.id !== accountId) return;
      if (acc.status === "failed") return;
      if (next === "passed" && acc.accountType === "challenge") {
        passedChallengeQueueRef.current = [];
        setPassedFlow({ accountId, phase: "intro" });
        return;
      }
      if (next === "active" && acc.status === "passed") {
        return;
      }
      const today = isoDateLocal();
      dispatch({
        type: "account/upsert",
        payload: {
          ...acc,
          status: next,
          ...(next === "passed"
            ? { passedEvaluationDate: acc.passedEvaluationDate ?? today }
            : {}),
          ...(next === "failed" ? { blownDate: acc.blownDate ?? today } : {}),
          updatedAt: nowIso(),
        },
      });
    },
    [isAccountEditable, state.accounts, dispatch]
  );

  function confirmConvertToFunded(payload: {
    newDisplayName: string;
    activationFeeUsd: number;
    fundedConversionDate: string;
    tradeifySelectFundedVariant?: "daily" | "flex";
  }) {
    if (!passedFlow) return;
    if (!isAccountEditable(passedFlow.accountId)) {
      passedChallengeQueueRef.current = [];
      setPassedFlow(null);
      return;
    }
    const challenge = state.accounts[passedFlow.accountId];
    if (!challenge) return;
    dispatchFundConversion({
      dispatch,
      state,
      challenge,
      payload,
      getAutoLabel: (id) => autoAccountLabelById.get(id),
    });
    closePassedFlowOrAdvanceQueue();
  }

  function introMaybeLater() {
    const id = passedFlow?.accountId;
    if (id && isAccountEditable(id)) {
      dispatchIntroPassedMaybeLater({ dispatch, state, accountId: id });
    }
    passedChallengeQueueRef.current = [];
    setPassedFlow(null);
  }

  function introConvertNow() {
    if (!passedFlow) return;
    if (!isAccountEditable(passedFlow.accountId)) return;
    setPassedFlow({ accountId: passedFlow.accountId, phase: "convert" });
  }

  const accountCounts = useMemo(() => {
    const visible = accounts.filter((a) => !a.isArchived);
    return {
      all: visible.length,
      challenges: visible.filter((a) => a.accountType === "challenge").length,
      funded: visible.filter(
        (a) => a.accountType === "funded" || a.accountType === "live"
      ).length,
      ongoing: visible.filter((a) => a.status === "active").length,
      passed: visible.filter((a) => a.status === "passed").length,
      failed: visible.filter((a) => a.status === "failed").length,
    };
  }, [accounts]);

  const portfolioHygiene = useMemo(
    () => getPortfolioHygiene(state, accounts),
    [state, accounts]
  );

  const rosterMilestonesList = useMemo(() => rosterMilestones(accounts), [accounts]);

  const filterPills = useMemo(() => {
    const pills: {
      id: AccountTableFilter;
      label: string;
      count: number;
    }[] = [
      { id: "all", label: "All", count: accountCounts.all },
      { id: "challenges", label: "Evaluations", count: accountCounts.challenges },
      { id: "funded", label: "Funded", count: accountCounts.funded },
      { id: "ongoing", label: "Active", count: accountCounts.ongoing },
    ];
    if (accountCounts.passed > 0) {
      pills.push({ id: "passed", label: "Passed", count: accountCounts.passed });
    }
    if (accountCounts.failed > 0) {
      pills.push({ id: "failed", label: "Blown", count: accountCounts.failed });
    }
    return pills;
  }, [accountCounts]);

  /** Target / Buffer column header by filter (Active & challenges → Target; funded & Passed → Buffer). */
  const targetBufferColumnLabel = useMemo(() => {
    if (accountFilter === "funded") return "Buffer";
    if (accountFilter === "challenges") return "Target";
    if (accountFilter === "ongoing") return "Target";
    if (accountFilter === "passed") return "Buffer";
    if (accountFilter === "failed") return "Target / Buffer";
    return "Target / Buffer";
  }, [accountFilter]);

  const filteredAccounts = useMemo(() => {
    let list = accounts.filter((a) => {
      if (a.isArchived) return false;
      if (accountFilter === "challenges") return a.accountType === "challenge";
      if (accountFilter === "funded") {
        return a.accountType === "funded" || a.accountType === "live";
      }
      if (accountFilter === "ongoing") return a.status === "active";
      if (accountFilter === "passed") return a.status === "passed";
      if (accountFilter === "failed") return a.status === "failed";
      return true;
    });
    const f = columnFilters;
    if (f.name.trim()) {
      const q = f.name.trim().toLowerCase();
      list = list.filter((a) =>
        resolveAccountDisplayName(a, autoAccountLabelById).toLowerCase().includes(q)
      );
    }
    if (f.firm) list = list.filter((a) => a.propFirm.name === f.firm);
    if (f.size) list = list.filter((a) => a.sizeLabel.trim().toLowerCase() === f.size);
    if (f.status) list = list.filter((a) => a.status === f.status);
    if (f.pnl === "pos") {
      list = list.filter((a) => getAccountFinancialMetrics(state, a.id).totalPnlCents > 0);
    } else if (f.pnl === "neg") {
      list = list.filter((a) => getAccountFinancialMetrics(state, a.id).totalPnlCents < 0);
    } else if (f.pnl === "zero") {
      list = list.filter((a) => getAccountFinancialMetrics(state, a.id).totalPnlCents === 0);
    }
    return [...list].sort((a, b) =>
      compareAccountsTableOrder(a, b, autoAccountLabelById)
    );
  }, [accounts, accountFilter, columnFilters, state, autoAccountLabelById]);

  const accountLedgerRows = useMemo((): AccountLedgerRowModel[] => {
    return filteredAccounts.map((acc) => {
      const m = getAccountFinancialMetrics(state, acc.id);
      const code = resolveAccountDisplayName(acc, autoAccountLabelById);
      const sizeUsd = acc.sizeNominalCents / 100;
      const compareDdCents = compareMaxDrawdownCentsForJournal(acc);
      const csvBufferCents = lookupJournalBufferCents(acc);
      const profitTarget = acc.profitTargetLabel?.trim() || "—";
      const bufferUsdStr =
        acc.status === "passed"
          ? csvBufferCents != null && csvBufferCents > 0
            ? formatUsdWholeGrouped(csvBufferCents / 100)
            : "—"
          : compareDdCents != null && compareDdCents > 0
            ? formatUsdWholeGrouped(compareDdCents / 100)
            : "—";
      const targetBufferCell = targetBufferCellValue(accountFilter, acc, profitTarget, bufferUsdStr);
      const feesStr =
        m.totalFeesCents > 0 ? `-${formatUsdWholeGrouped(m.totalFeesCents / 100)}` : "—";
      const payoutsStr = `+${formatUsdWholeGrouped(getAccountPayoutTotalDisplayCents(state, acc.id) / 100)}`;
      const payoutsForRow = Object.values(state.payoutEntries).filter((p) => p.accountId === acc.id);
      const hasPayoutRows = payoutsForRow.length > 0;
      const isFundedOrLive = acc.accountType === "funded" || acc.accountType === "live";
      const pnlC = m.totalPnlCents;
      const tradePnlStr =
        pnlC === 0
          ? "—"
          : `${pnlC > 0 ? "+" : "-"}${formatUsdWholeGrouped(Math.abs(pnlC) / 100)}`;
      const tradePnlClass =
        pnlC === 0
          ? "text-white/35"
          : pnlC > 0
            ? "font-medium text-emerald-400/95"
            : "font-medium text-rose-400/95";
      const firmLogoSrc = firmLogoSrcForJournalFirmName(acc.propFirm.name);
      return {
        acc,
        code,
        sizeUsd,
        compareDdCents,
        csvBufferCents,
        profitTarget,
        bufferUsdStr,
        targetBufferCell,
        feesStr,
        payoutsStr,
        hasPayoutRows,
        isFundedOrLive,
        pnlC,
        tradePnlStr,
        tradePnlClass,
        firmLogoSrc,
      };
    });
  }, [filteredAccounts, state, autoAccountLabelById, accountFilter]);

  const allFilteredSelected =
    filteredAccounts.length > 0 &&
    filteredAccounts.every((a) => selectedAccountIds.has(a.id));
  const someFilteredSelected = filteredAccounts.some((a) =>
    selectedAccountIds.has(a.id)
  );
  const selectAllIndeterminate = someFilteredSelected && !allFilteredSelected;

  const selectedPayoutEligibleCount = useMemo(() => {
    let n = 0;
    for (const id of selectedAccountIds) {
      const a = state.accounts[id];
      if (a && (a.accountType === "funded" || a.accountType === "live")) n += 1;
    }
    return n;
  }, [selectedAccountIds, state.accounts]);

  const bulkApplyPassed = useCallback(() => {
    const ids = Array.from(selectedAccountIds).filter((id) => isAccountEditable(id));
    const challenges: string[] = [];
    const nonChallenge: string[] = [];
    for (const id of ids) {
      const acc = state.accounts[id];
      if (!acc || acc.status === "failed") continue;
      if (acc.accountType === "challenge") challenges.push(id);
      else nonChallenge.push(id);
    }
    const today = isoDateLocal();
    for (const id of nonChallenge) {
      const acc = state.accounts[id];
      if (!acc) continue;
      dispatch({
        type: "account/upsert",
        payload: {
          ...acc,
          status: "passed",
          passedEvaluationDate: acc.passedEvaluationDate ?? today,
          updatedAt: nowIso(),
        },
      });
    }
    exitBulkSelection();
    if (challenges.length === 0) return;
    passedChallengeQueueRef.current = challenges.slice(1);
    setPassedFlow({ accountId: challenges[0], phase: "intro" });
  }, [selectedAccountIds, state.accounts, dispatch, exitBulkSelection, isAccountEditable]);

  const bulkApplyStatus = useCallback(
    (status: AccountStatus) => {
      const ids = Array.from(selectedAccountIds).filter((id) => isAccountEditable(id));
      const today = isoDateLocal();
      for (const id of ids) {
        const acc = state.accounts[id];
        if (!acc) continue;
        if (acc.status === "failed") continue;
        if (status === "active" && acc.status === "passed") {
          continue;
        }
        const pnlSnap =
          status === "passed" && acc.accountType === "challenge"
            ? getAccountFinancialMetrics(state, acc.id).totalPnlCents
            : undefined;
        dispatch({
          type: "account/upsert",
          payload: {
            ...acc,
            status,
            ...(status === "passed"
              ? {
                  passedEvaluationDate: acc.passedEvaluationDate ?? today,
                  ...(acc.accountType === "challenge"
                    ? { fundedProgressBaselinePnlCents: pnlSnap }
                    : {}),
                }
              : {}),
            ...(status === "failed" ? { blownDate: acc.blownDate ?? today } : {}),
            updatedAt: nowIso(),
          },
        });
      }
      exitBulkSelection();
    },
    [selectedAccountIds, state, dispatch, exitBulkSelection, isAccountEditable]
  );

  const openDeleteModal = useCallback(() => {
    if (selectedAccountIds.size === 0) return;
    setDeleteAccountIds(Array.from(selectedAccountIds));
  }, [selectedAccountIds]);

  const confirmDeleteAccounts = useCallback(() => {
    if (!deleteAccountIds?.length) return;
    for (const id of deleteAccountIds) {
      dispatch({ type: "account/delete", payload: { accountId: id } });
    }
    exitBulkSelection();
    setDeleteAccountIds(null);
  }, [deleteAccountIds, dispatch, exitBulkSelection]);

  const openPayoutModal = useCallback(() => {
    const ids = Array.from(selectedAccountIds).filter((id) => {
      const a = state.accounts[id];
      return a && (a.accountType === "funded" || a.accountType === "live");
    });
    if (ids.length === 0) {
      window.alert("Select at least one funded or live account to record a payout.");
      return;
    }
    setPayoutAccountIds(ids);
  }, [selectedAccountIds, state.accounts]);

  const payoutModalAccounts = useMemo((): PayoutModalAccountLine[] => {
    if (!payoutAccountIds?.length) return [];
    const lines: PayoutModalAccountLine[] = [];
    for (const id of payoutAccountIds) {
      const a = state.accounts[id];
      if (!a) continue;
      lines.push({
        id,
        label: resolveAccountDisplayName(a, autoAccountLabelById),
        firmName: a.propFirm.name,
        journalAccount: a,
      });
    }
    return lines;
  }, [payoutAccountIds, state.accounts, autoAccountLabelById]);

  const confirmPayout = useCallback(
    (payload: {
      date: string;
      note: string;
      perAccount: { accountId: string; netUsd: number }[];
    }) => {
      if (!payload.perAccount.length) return;
      const t = nowIso();
      for (const { accountId, netUsd } of payload.perAccount) {
        if (netUsd <= 0) continue;
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `payout-${Date.now()}-${accountId}`;
        const acc = state.accounts[accountId];
        if (!acc) continue;
        const grossCents = Math.round(netUsd * 100);
        if (grossCents <= 0) continue;
        const priorGross =
          isTradeDayFundedJournalAccount(acc)
            ? sumNonRejectedJournalPayoutGrossCents(state, accountId)
            : 0;
        const netAmountCents = isTradeDayFundedJournalAccount(acc)
          ? tradedayTraderNetFromGrossMarginal(priorGross, grossCents)
          : grossCents;
        dispatch({
          type: "payout/upsert",
          payload: {
            id,
            accountId,
            requestedDate: payload.date,
            paidDate: payload.date,
            grossAmountCents: grossCents,
            netAmountCents,
            status: "paid",
            note: payload.note || undefined,
            createdAt: t,
            updatedAt: t,
          },
        });
      }
      setPayoutAccountIds(null);
      exitBulkSelection();
    },
    [dispatch, state, exitBulkSelection]
  );

  useEffect(() => {
    const onLimit = () => {
      setPlanNotice(
        `Account limit reached (${accountsLimit} on your plan). Remove an account or upgrade when billing is available.`
      );
    };
    window.addEventListener(ACCOUNT_LIMIT_REACHED_EVENT, onLimit);
    return () => window.removeEventListener(ACCOUNT_LIMIT_REACHED_EVENT, onLimit);
  }, [accountsLimit]);

  useEffect(() => {
    if (!planNotice) return;
    const id = window.setTimeout(() => setPlanNotice(null), 9000);
    return () => window.clearTimeout(id);
  }, [planNotice]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    if (!canAddMoreAccounts) {
      setPlanNotice(
        `You’ve reached your plan limit (${accountsLimit} accounts). Remove one to add another, or upgrade later.`
      );
      window.history.replaceState({}, "", "/desk/accounts");
      return;
    }
    setIsCreating(true);
    window.history.replaceState({}, "", "/desk/accounts");
  }, [hydrated, canAddMoreAccounts, accountsLimit]);

  useEffect(() => {
    if (isCreating && !canAddMoreAccounts) setIsCreating(false);
  }, [isCreating, canAddMoreAccounts]);

  useEffect(() => {
    if (accountFilter === "passed" && accountCounts.passed === 0) {
      setAccountFilter("all");
    }
    if (accountFilter === "failed" && accountCounts.failed === 0) {
      setAccountFilter("all");
    }
  }, [accountFilter, accountCounts.passed, accountCounts.failed]);

  /** Opening the wizard: fee recording on by default; allow a fresh compare price unless the user already typed. */
  useEffect(() => {
    if (isCreating && !prevIsCreatingRef.current) {
      setForm((f) => ({ ...f, recordChallengeFee: true }));
      challengeFeeUserEditedRef.current = false;
    }
    prevIsCreatingRef.current = isCreating;
  }, [isCreating]);

  useEffect(() => {
    if (!hydrated) return;
    for (const account of Object.values(state.accounts)) {
      const isDemo =
        account.propFirm.id === "demo" ||
        account.propFirm.name.toLowerCase().includes("démo") ||
        (account.notes ?? "").toLowerCase().includes("démonstration");
      if (!isDemo) continue;
      dispatch({ type: "account/delete", payload: { accountId: account.id } });
    }
  }, [hydrated, state.accounts, dispatch]);

  const firmsForPicker = useMemo(() => {
    const list = [...SIDEBAR_PROP_FIRMS, { name: "Other", logoSrc: null }];
    if (!firmSearch.trim()) return list;
    const q = firmSearch.toLowerCase();
    return list.filter((f) => f.name.toLowerCase().includes(q));
  }, [firmSearch]);

  const selectedFirm = form.firmName || (firmsForPicker[0]?.name ?? "Other");
  const selectedFirmRows = useMemo(
    () => propFirms.filter((f) => f.name === selectedFirm),
    [selectedFirm]
  );
  const selectedProgramRows = useMemo(
    () =>
      selectedFirmRows.filter((r) =>
        form.programName ? r.accountName === form.programName : true
      ),
    [selectedFirmRows, form.programName]
  );
  const programOptions = useMemo(() => {
    const rowsForPrograms =
      selectedFirm === "Tradeify"
        ? selectedFirmRows.filter((r) => !isTradeifySelectVariantCompareRow(r))
        : selectedFirmRows;
    const unique = [...new Set(rowsForPrograms.map((r) => r.accountName))];
    return sortProgramNamesForJournalFirm(selectedFirm, unique);
  }, [selectedFirm, selectedFirmRows]);
  const sizeOptions = useMemo(
    () => [...new Set(selectedProgramRows.map((r) => r.size))],
    [selectedProgramRows]
  );
  const selectedOffer = useMemo(() => {
    if (!selectedProgramRows.length) return null;
    return (
      selectedProgramRows.find((r) => r.size === form.sizeLabel) ?? selectedProgramRows[0]
    );
  }, [selectedProgramRows, form.sizeLabel]);

  const accountSlotsCap = Math.min(20, Math.max(0, slotsRemaining));
  const quantityClamped =
    accountSlotsCap < 1 ? 0 : Math.min(Math.max(form.quantity, 1), accountSlotsCap);
  const unitChallengeFeeUsd = parseLooseUsd(form.challengeFeeUsd);
  const showFeeTotalDrawer =
    form.recordChallengeFee &&
    quantityClamped > 1 &&
    accountSlotsCap >= 1 &&
    unitChallengeFeeUsd != null;
  const totalChallengeFeeUsd =
    showFeeTotalDrawer && unitChallengeFeeUsd != null
      ? unitChallengeFeeUsd * quantityClamped
      : null;

  useEffect(() => {
    if (!isCreating) {
      wizardSyncOpenRef.current = false;
      return;
    }
    if (!selectedFirmRows.length) return;
    const firmChanged = prevSelectedFirmForSyncRef.current !== selectedFirm;
    const creatingJustOpened = !wizardSyncOpenRef.current;
    wizardSyncOpenRef.current = true;
    prevSelectedFirmForSyncRef.current = selectedFirm;
    if (firmChanged) {
      challengeFeeUserEditedRef.current = false;
    }
    const firstProgram = programOptions[0] ?? selectedFirmRows[0]?.accountName;
    const nextProgram = programOptions.includes(form.programName)
      ? form.programName
      : firstProgram;
    const rowsForProgram = selectedFirmRows.filter((r) => r.accountName === nextProgram);
    const nextSize = rowsForProgram.some((r) => r.size === form.sizeLabel)
      ? form.sizeLabel
      : rowsForProgram[0]?.size ?? form.sizeLabel;
    const match =
      rowsForProgram.find((r) => r.size === nextSize) ?? rowsForProgram[0] ?? null;
    setForm((prev) => {
      const shouldAutofillFee =
        firmChanged || creatingJustOpened || !challengeFeeUserEditedRef.current;
      return {
        ...prev,
        programName: nextProgram,
        sizeLabel: nextSize,
        challengeFeeUsd:
          shouldAutofillFee && match
            ? String(effectivePrice(match))
            : prev.challengeFeeUsd,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFirm, isCreating]);

  function sizeToNominalCents(sizeLabel: string): number {
    const raw = Number(sizeLabel.replace(/[^\d]/g, ""));
    if (!Number.isFinite(raw) || raw <= 0) return 50_000_00;
    return raw * 1000 * 100;
  }

  function createAccount() {
    const firmName = selectedFirm.trim();
    if (!firmName) return;
    const slots = remainingAccountSlots(Object.keys(state.accounts).length, accountsLimit);
    if (slots < 1) {
      window.dispatchEvent(new Event(ACCOUNT_LIMIT_REACHED_EVENT));
      return;
    }
    const quantity = Math.min(Math.max(form.quantity, 1), 20, slots);
    const derivedType: AccountType =
      selectedOffer?.accountType === "Direct" ? "funded" : "challenge";
    const nextPropFirm = {
      id: firmName.toLowerCase().replace(/\s+/g, "-"),
      name: firmName,
    };
    /** Compare row program name (e.g. "Apex EOD") — drives default table labels `Program #n`, not the legal firm name. */
    const programLabel =
      form.programName.trim() ||
      selectedOffer?.accountName?.trim() ||
      selectedFirmRows.find((r) => r.size === form.sizeLabel)?.accountName?.trim() ||
      selectedFirmRows[0]?.accountName?.trim() ||
      "";
    const compareProgramName = programLabel || undefined;
    const groupKey = labelGroupKey({
      propFirm: nextPropFirm,
      compareProgramName,
    });
    let nextSlot = maxCompareLabelSlotInGroup(state.accounts, groupKey);
    for (let i = 0; i < quantity; i += 1) {
      const t = nowIso();
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `acc-${Date.now()}-${i}`;
      nextSlot += 1;
      const nextAccount: JournalAccount = {
        id,
        propFirm: nextPropFirm,
        accountType: derivedType,
        displayAccountCode: DEFAULT_NEW_ACCOUNT_DISPLAY_NAME,
        compareProgramName,
        compareLabelSlot: nextSlot,
        sizeLabel: form.sizeLabel,
        sizeNominalCents: sizeToNominalCents(form.sizeLabel),
        startDate: form.startDate,
        evaluationStartedDate: form.startDate,
        status: "active",
        isArchived: false,
        rulesSnapshot: {
          ...(selectedOffer
            ? {
                maxDrawdownCents: Math.round(selectedOffer.maxDrawdownLimitUsd * 100),
              }
            : {}),
          ...(firmName.trim().toLowerCase() === "other"
            ? { otherRulesText: {} }
            : {}),
        },
        profitTargetLabel: selectedOffer?.target,
        notes:
          form.notes.trim() ||
          (programLabel ? `${programLabel}` : undefined),
        createdAt: t,
        updatedAt: t,
      };
      dispatch({ type: "account/upsert", payload: nextAccount });
      const challengeFee = form.recordChallengeFee ? parseLooseUsd(form.challengeFeeUsd) : null;
      if (challengeFee != null && challengeFee > 0) {
        dispatch({
          type: "fee/upsert",
          payload: {
            id: `${id}-challenge-fee`,
            accountId: id,
            date: form.startDate,
            type: "challenge_fee",
            amountCents: Math.round(challengeFee * 100),
            currency: "USD",
            note: "Created from account setup flow",
            createdAt: t,
            updatedAt: t,
          },
        });
      }
    }
    challengeFeeUserEditedRef.current = false;
    prevSelectedFirmForSyncRef.current = null;
    setForm(defaultForm);
    setIsCreating(false);
  }

  return (
    <>
      {planNotice ? (
        <div
          role="status"
          className="fixed inset-x-0 top-[4.5rem] z-[60] flex justify-center px-4 sm:top-20"
        >
          <div className="max-w-lg rounded-xl border border-amber-400/35 bg-amber-950/90 px-4 py-3 text-center text-sm text-amber-50 shadow-lg backdrop-blur-md">
            {planNotice}
          </div>
        </div>
      ) : null}
      <JournalWorkspaceShell active="accounts">
        <header className="shrink-0 border-b border-white/10 bg-black/55 px-[clamp(16px,2.2vw,34px)] py-[clamp(14px,1.6vw,22px)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={DESK_PAGE_SECTION_LABEL}>TradeDesk</p>
                <h1 className="mt-2 text-[clamp(1.4rem,2vw,2rem)] font-semibold tracking-tight text-white">
                  Accounts
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/compare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/14 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-sky-400/35 hover:from-sky-500/15 hover:to-sky-950/25"
                >
                  Start a new challenge
                </Link>
              </div>
            </div>
          </header>

          <section className="w-full flex-1 px-[clamp(12px,2.5vw,40px)] py-[clamp(18px,3vw,42px)]">
            {!hydrated ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-white/60">
                Loading...
              </div>
            ) : (
              <>
                <section className="rounded-[clamp(18px,2vw,30px)] border border-white/10 bg-[#0d1321]/80 p-[clamp(14px,1.8vw,26px)]">
                  {isCreating ? (
                    <div className="mb-4 space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-white/90">Prop Firm</p>
                          <input
                            value={firmSearch}
                            onChange={(e) => setFirmSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-36 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/35"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
                          {firmsForPicker.map((firm) => {
                            const isSelected = selectedFirm === firm.name;
                            return (
                              <button
                                key={firm.name}
                                type="button"
                                onClick={() => {
                                  challengeFeeUserEditedRef.current = false;
                                  setForm((v) => ({
                                    ...v,
                                    firmName: firm.name,
                                    programName: "",
                                  }));
                                }}
                                className={`rounded-xl border p-2 text-center transition ${
                                  isSelected
                                    ? "border-blue-300/40 bg-white/10"
                                    : "border-white/10 bg-black/20 hover:border-white/20"
                                }`}
                              >
                                <div className="mb-2 flex h-10 items-center justify-center rounded-md bg-black/30">
                                  {firm.logoSrc ? (
                                    <Image
                                      src={firm.logoSrc}
                                      alt=""
                                      width={52}
                                      height={20}
                                      className="max-h-8 w-auto object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-white/70">
                                      {firm.name.slice(0, 1)}
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-[11px] text-white/65">{firm.name}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="mb-3 text-sm font-medium text-white/90">
                          Account Program
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {programOptions.length ? (
                            programOptions.map((program) => (
                              <button
                                key={program}
                                type="button"
                                onClick={() => {
                                  challengeFeeUserEditedRef.current = false;
                                  const rowForProgram = selectedFirmRows.find(
                                    (r) => r.accountName === program
                                  );
                                  setForm((v) => ({
                                    ...v,
                                    programName: program,
                                    sizeLabel: rowForProgram?.size ?? v.sizeLabel,
                                    challengeFeeUsd: rowForProgram
                                      ? String(effectivePrice(rowForProgram))
                                      : v.challengeFeeUsd,
                                  }));
                                }}
                                className={`rounded-lg border px-3 py-1.5 text-sm ${
                                  form.programName === program
                                    ? "border-blue-300/40 bg-white/10 text-white"
                                    : "border-white/10 bg-white/5 text-white/70"
                                }`}
                              >
                                {program}
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-white/45">
                              No specific program for this firm.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="mb-3 text-sm font-medium text-white/90">Account Size</p>
                        <div className="flex flex-wrap gap-2">
                          {(sizeOptions.length
                            ? sizeOptions
                            : (["25k", "50k", "100k", "150k", "250k", "300k"] as string[])
                          ).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                challengeFeeUserEditedRef.current = false;
                                const match = selectedProgramRows.find((r) => r.size === s);
                                setForm((v) => ({
                                  ...v,
                                  sizeLabel: s,
                                  challengeFeeUsd: match
                                    ? String(effectivePrice(match))
                                    : v.challengeFeeUsd,
                                }));
                              }}
                              className={`rounded-lg border px-3 py-1.5 text-sm ${
                                form.sizeLabel === s
                                  ? "border-blue-300/40 bg-white/10 text-white"
                                  : "border-white/10 bg-white/5 text-white/70"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="mb-3 text-sm font-medium text-white/90">Quantity</p>
                        {accountSlotsCap < 1 ? (
                          <p className="text-sm text-amber-200/90">
                            No free slots on your plan ({accountsLimit} max). Close this form and remove an account
                            first.
                          </p>
                        ) : (
                          <>
                            <p className="mb-2 text-xs text-white/45">
                              Up to {accountSlotsCap} new account{accountSlotsCap === 1 ? "" : "s"} on this plan.
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              {[1, 2, 3, 5, 10]
                                .filter((q) => q <= accountSlotsCap)
                                .map((q) => (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => setForm((v) => ({ ...v, quantity: q }))}
                                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                                      form.quantity === q
                                        ? "border-blue-300/40 bg-white/10 text-white"
                                        : "border-white/10 bg-white/5 text-white/70"
                                    }`}
                                  >
                                    {q}
                                  </button>
                                ))}
                              <span className="px-1 text-white/40">or</span>
                              <input
                                type="number"
                                min={1}
                                max={accountSlotsCap}
                                value={form.quantity}
                                onChange={(e) =>
                                  setForm((v) => ({
                                    ...v,
                                    quantity: Number(e.target.value || 1),
                                  }))
                                }
                                className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <p className="mb-3 text-sm font-medium text-white/90">Details</p>
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                            <div className="flex items-center gap-3 px-3 py-3">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={form.recordChallengeFee}
                                onClick={() =>
                                  setForm((v) => ({
                                    ...v,
                                    recordChallengeFee: !v.recordChallengeFee,
                                  }))
                                }
                                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                                  form.recordChallengeFee
                                    ? "bg-sky-500/80"
                                    : "bg-white/15"
                                }`}
                              >
                                <span
                                  className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                                    form.recordChallengeFee ? "translate-x-[22px]" : "translate-x-0"
                                  }`}
                                />
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white">Evaluation fee</p>
                                <p className="text-xs text-white/45">
                                  Record the fee paid for this account
                                </p>
                              </div>
                              <div className="flex items-center rounded-lg border border-white/10 bg-black/40 px-2 py-1.5">
                                <span className="pr-1 text-sm text-white/50">$</span>
                                <input
                                  value={form.challengeFeeUsd}
                                  onChange={(e) => {
                                    challengeFeeUserEditedRef.current = true;
                                    setForm((v) => ({
                                      ...v,
                                      challengeFeeUsd: e.target.value,
                                    }));
                                  }}
                                  disabled={!form.recordChallengeFee}
                                  placeholder="0"
                                  className="w-20 border-0 bg-transparent py-0.5 text-right text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-40"
                                />
                              </div>
                            </div>
                            <div
                              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                                showFeeTotalDrawer ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                              }`}
                            >
                              <div className="min-h-0 overflow-hidden">
                                {showFeeTotalDrawer && totalChallengeFeeUsd != null ? (
                                  <div className="border-t border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white/55">
                                    <span className="font-medium text-white/80">
                                      × {quantityClamped} accounts
                                    </span>
                                    <span className="mx-1.5">=</span>
                                    <span className="font-semibold text-white">
                                      {formatUsdFrShort(totalChallengeFeeUsd)}
                                    </span>
                                    <span className="ml-1 text-white/45">total</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <span className="text-sm text-white/80">Start Date</span>
                            <input
                              type="date"
                              value={form.startDate}
                              onChange={(e) =>
                                setForm((v) => ({ ...v, startDate: e.target.value }))
                              }
                              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white"
                            />
                          </label>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-white">
                              {quantityClamped}{" "}
                              {selectedOffer?.accountType === "Direct" ? "Funded" : "Evaluation"}{" "}
                              Account{quantityClamped !== 1 ? "s" : ""}
                            </p>
                            <p className="text-sm text-white/55">
                              {selectedFirm}
                              {form.programName ? ` · ${form.programName}` : ""}
                              {` · ${form.sizeLabel}`}
                            </p>
                            {form.recordChallengeFee && form.challengeFeeUsd ? (
                              <p className="mt-1 text-sm text-white/70">
                                Fees:{" "}
                                {unitChallengeFeeUsd != null
                                  ? formatUsdFrShort(unitChallengeFeeUsd)
                                  : `$${form.challengeFeeUsd}`}
                                {quantityClamped > 1 && totalChallengeFeeUsd != null
                                  ? ` (${formatUsdFrShort(totalChallengeFeeUsd)} total)`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCreating(false)}
                              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={accountSlotsCap < 1}
                              onClick={createAccount}
                              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-white/25 transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
                            >
                              Create Account
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {accounts.length === 0 && !isCreating ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-[clamp(14px,2vw,24px)] py-[clamp(42px,8vh,88px)] text-center">
                      <p className="text-[clamp(0.95rem,1.2vw,1.1rem)] text-white/80">
                        Welcome to MyTradeDesk Journal
                      </p>
                      <p className="mt-2 text-[clamp(0.8rem,1vw,0.94rem)] text-white/55">
                        Start by adding your first prop firm account.
                      </p>
                      <LitePlanAddAccountUpgradeHover show={liteAddAccountUpgradeHover}>
                        <button
                          type="button"
                          disabled={!canAddMoreAccounts}
                          onClick={openCreateWizard}
                          className="mt-5 rounded-xl border border-sky-400/45 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-400/60 hover:bg-sky-500/18 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sky-400/45 disabled:hover:bg-sky-500/10"
                        >
                          Add your first account
                        </button>
                      </LitePlanAddAccountUpgradeHover>
                    </div>
                  ) : null}

                  {accounts.length > 0 ? (
                    <div className={isCreating ? "mt-6 space-y-6" : ""}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="text-[clamp(1.05rem,1.35vw,1.3rem)] font-semibold tracking-tight text-white">
                            Accounts
                          </h2>
                          <p className="mt-0.5 text-sm text-white/45">
                            {accountCounts.all} account{accountCounts.all === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (tableSelectionMode) {
                                setSelectedAccountIds(new Set());
                                setTableSelectionMode(false);
                              } else {
                                setTableSelectionMode(true);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
                          >
                            {tableSelectionMode ? "Done" : "Select"}
                          </button>
                          <LitePlanAddAccountUpgradeHover show={liteAddAccountUpgradeHover}>
                            <button
                              type="button"
                              disabled={!canAddMoreAccounts}
                              onClick={openCreateWizard}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/45 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-400/60 hover:bg-sky-500/18 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sky-400/45 disabled:hover:bg-sky-500/10"
                            >
                              <span className="text-base leading-none">+</span>
                              Add Account
                            </button>
                          </LitePlanAddAccountUpgradeHover>
                        </div>
                      </div>

                      <div className="-mx-1 mt-5 flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
                        {filterPills.map((pill) => (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={() => setAccountFilter(pill.id)}
                            className={`inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-0 text-[10px] font-semibold uppercase leading-none tracking-wide transition ${
                              accountFilter === pill.id
                                ? "border-sky-400/40 bg-gradient-to-b from-sky-500/20 to-sky-600/10 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.12),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                                : "border-white/[0.07] bg-zinc-950/50 text-zinc-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-white/12 hover:bg-zinc-900/70 hover:text-zinc-200"
                            }`}
                          >
                            {pill.label}{" "}
                            <span className="tabular-nums opacity-90">({pill.count})</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 min-w-0 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sky-500/[0.08] via-[#0a0f18] to-violet-500/[0.06] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/[0.04]">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300/75">
                              Ledger hygiene
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                  portfolioHygiene.tier === "locked"
                                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200/95 shadow-[0_0_16px_rgba(52,211,153,0.12)]"
                                    : portfolioHygiene.tier === "solid"
                                      ? "border-sky-400/35 bg-sky-500/12 text-sky-200/88"
                                      : portfolioHygiene.tier === "building"
                                        ? "border-amber-400/35 bg-amber-500/12 text-amber-200/85"
                                        : "border-white/12 bg-white/[0.06] text-white/45"
                                }`}
                              >
                                {portfolioHygiene.label}
                              </span>
                            </div>
                            <p className="mt-2 max-w-xl text-sm text-white/48">{portfolioHygiene.sub}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {rosterMilestonesList.map((m) => (
                              <span
                                key={m.id}
                                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold tabular-nums ${
                                  m.met
                                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200/90"
                                    : "border-white/[0.08] bg-black/25 text-white/35"
                                }`}
                              >
                                {m.met ? "✓ " : ""}
                                {m.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {tableSelectionMode && selectedAccountIds.size > 0 ? (
                        <BulkSelectionBar
                          count={selectedAccountIds.size}
                          payoutEligibleCount={selectedPayoutEligibleCount}
                          onPassed={bulkApplyPassed}
                          onBlown={() => bulkApplyStatus("failed")}
                          onActive={() => bulkApplyStatus("active")}
                          onPayout={openPayoutModal}
                          onDelete={openDeleteModal}
                          onDismiss={exitBulkSelection}
                        />
                      ) : null}

                      <div className="mt-6 rounded-xl border border-white/10">
                        {columnFiltersActive ? (
                          <div className="flex justify-end border-b border-white/[0.06] bg-black/25 px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setColumnFilters(INITIAL_ACCOUNT_COLUMN_FILTERS)}
                              className="text-[11px] font-medium text-sky-300/90 underline-offset-2 transition hover:text-sky-200 hover:underline"
                            >
                              Clear column filters
                            </button>
                          </div>
                        ) : null}
                        <div className="md:hidden space-y-3 px-3 pb-4 pt-2">
                          {accountLedgerRows.map((row) => (
                            <AccountMobileLedgerCard
                              key={row.acc.id}
                              row={row}
                              tableSelectionMode={tableSelectionMode}
                              selected={selectedAccountIds.has(row.acc.id)}
                              targetBufferColumnLabel={targetBufferColumnLabel}
                              isAccountEditable={isAccountEditable}
                              onTableRowClick={() => {
                                if (!tableSelectionMode) {
                                  setTableSelectionMode(true);
                                  setSelectedAccountIds((prev) => {
                                    const next = new Set(prev);
                                    next.add(row.acc.id);
                                    return next;
                                  });
                                  return;
                                }
                                setSelectedAccountIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(row.acc.id)) next.delete(row.acc.id);
                                  else next.add(row.acc.id);
                                  return next;
                                });
                              }}
                              onSelectCheckbox={() => {
                                setSelectedAccountIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(row.acc.id)) next.delete(row.acc.id);
                                  else next.add(row.acc.id);
                                  return next;
                                });
                              }}
                              onOpenEditName={(rect) => {
                                setAccountEditOpen({ accountId: row.acc.id, rect });
                              }}
                              onStatusSelect={handleStatusSelect}
                              onPayoutClick={() => {
                                if (row.hasPayoutRows) {
                                  setEditPayoutAccountId(row.acc.id);
                                } else {
                                  setPayoutAccountIds([row.acc.id]);
                                }
                              }}
                            />
                          ))}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-[13px]">
                          <thead>
                            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/40">
                              {tableSelectionMode ? (
                                <th className="w-10 px-3 py-3 text-center">
                                  <FilterCheckbox
                                    checked={allFilteredSelected}
                                    indeterminate={selectAllIndeterminate}
                                    aria-label="Select all visible accounts"
                                    onCheckedChange={() => {
                                      setSelectedAccountIds((prev) => {
                                        const next = new Set(prev);
                                        if (allFilteredSelected) {
                                          for (const a of filteredAccounts) next.delete(a.id);
                                        } else {
                                          for (const a of filteredAccounts) next.add(a.id);
                                        }
                                        return next;
                                      });
                                    }}
                                  />
                                </th>
                              ) : null}
                              <th className="px-2 py-3 text-left font-medium">
                                <button
                                  type="button"
                                  className={`${COL_HEAD_BTN} ${
                                    columnFilterPopover?.kind === "name"
                                      ? "bg-white/[0.08] ring-1 ring-sky-400/35"
                                      : ""
                                  }`}
                                  aria-expanded={columnFilterPopover?.kind === "name"}
                                  aria-haspopup="dialog"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setColumnFilterPopover((p) =>
                                      p?.kind === "name" ? null : { kind: "name", rect: r }
                                    );
                                  }}
                                >
                                  <span className="block leading-tight">Account</span>
                                  {columnFilters.name.trim() ? (
                                    <span className="mt-0.5 block max-w-[9rem] truncate text-[10px] font-normal normal-case tracking-normal text-sky-300/90">
                                      {columnFilters.name}
                                    </span>
                                  ) : null}
                                </button>
                              </th>
                              <th className="px-2 py-3 text-left font-medium">
                                <button
                                  type="button"
                                  className={`${COL_HEAD_BTN} ${
                                    columnFilterPopover?.kind === "firm"
                                      ? "bg-white/[0.08] ring-1 ring-sky-400/35"
                                      : ""
                                  }`}
                                  aria-expanded={columnFilterPopover?.kind === "firm"}
                                  aria-haspopup="dialog"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setColumnFilterPopover((p) =>
                                      p?.kind === "firm" ? null : { kind: "firm", rect: r }
                                    );
                                  }}
                                >
                                  <span className="block leading-tight">Prop Firm</span>
                                  {columnFilters.firm ? (
                                    <span className="mt-0.5 block max-w-[10rem] truncate text-[10px] font-normal normal-case tracking-normal text-sky-300/90">
                                      {columnFilters.firm}
                                    </span>
                                  ) : null}
                                </button>
                              </th>
                              <th className="px-2 py-3 text-center font-medium">
                                <button
                                  type="button"
                                  className={`${COL_HEAD_BTN_CENTER} ${
                                    columnFilterPopover?.kind === "size"
                                      ? "bg-white/[0.08] ring-1 ring-sky-400/35"
                                      : ""
                                  }`}
                                  aria-expanded={columnFilterPopover?.kind === "size"}
                                  aria-haspopup="dialog"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setColumnFilterPopover((p) =>
                                      p?.kind === "size" ? null : { kind: "size", rect: r }
                                    );
                                  }}
                                >
                                  <span className="block leading-tight">Size</span>
                                  {columnFilters.size ? (
                                    <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-sky-300/90">
                                      {columnFilters.size}
                                    </span>
                                  ) : null}
                                </button>
                              </th>
                              <th className="px-2 py-3 text-center font-medium">
                                <button
                                  type="button"
                                  className={COL_HEAD_BTN_CENTER}
                                  title="Click to cycle: All → Active → Passed → Blown"
                                  onClick={() =>
                                    setColumnFilters((c) => ({
                                      ...c,
                                      status: cycleStatus(c.status),
                                    }))
                                  }
                                >
                                  <span className="block leading-tight">Status</span>
                                  {columnFilters.status ? (
                                    <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-sky-300/90">
                                      {columnFilters.status === "active"
                                        ? "Active"
                                        : columnFilters.status === "passed"
                                          ? "Passed"
                                          : "Blown"}
                                    </span>
                                  ) : null}
                                </button>
                              </th>
                              <th className="px-2 py-3 text-center font-medium">
                                {targetBufferColumnLabel}
                              </th>
                              <th className="px-2 py-3 text-center font-medium">DD</th>
                              <th className="px-2 py-3 text-center font-medium">Fees</th>
                              <th className="px-2 py-3 text-center font-medium">Payouts</th>
                              <th className="px-2 py-3 text-center font-medium">
                                <button
                                  type="button"
                                  className={COL_HEAD_BTN_CENTER}
                                  title="Click to cycle: All → Positive → Negative → Zero"
                                  onClick={() =>
                                    setColumnFilters((c) => ({
                                      ...c,
                                      pnl: cyclePnl(c.pnl),
                                    }))
                                  }
                                >
                                  <span className="block leading-tight">Trade P&amp;L</span>
                                  {columnFilters.pnl ? (
                                    <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-sky-300/90">
                                      {columnFilters.pnl === "pos"
                                        ? "+"
                                        : columnFilters.pnl === "neg"
                                          ? "−"
                                          : "0"}
                                    </span>
                                  ) : null}
                                </button>
                              </th>
                              <th scope="col" className="w-[1%] whitespace-nowrap px-3 py-3 text-right font-medium">
                                <span className="sr-only">Open account overview</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountLedgerRows.map((row) => {
                              const { acc, code, sizeUsd, compareDdCents, targetBufferCell, feesStr, payoutsStr, hasPayoutRows, isFundedOrLive, tradePnlStr, tradePnlClass } = row;
                              return (
                                <tr
                                  key={acc.id}
                                  className="cursor-pointer border-b border-white/[0.06] bg-black/10 last:border-b-0 hover:bg-white/[0.04]"
                                  onClick={() => {
                                    if (!tableSelectionMode) {
                                      setTableSelectionMode(true);
                                      setSelectedAccountIds((prev) => {
                                        const next = new Set(prev);
                                        next.add(acc.id);
                                        return next;
                                      });
                                      return;
                                    }
                                    setSelectedAccountIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(acc.id)) next.delete(acc.id);
                                      else next.add(acc.id);
                                      return next;
                                    });
                                  }}
                                >
                                  {tableSelectionMode ? (
                                    <td
                                      className="px-3 py-3 align-middle"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FilterCheckbox
                                        checked={selectedAccountIds.has(acc.id)}
                                        aria-label={`Select ${code}`}
                                        onCheckedChange={() => {
                                          setSelectedAccountIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(acc.id)) next.delete(acc.id);
                                            else next.add(acc.id);
                                            return next;
                                          });
                                        }}
                                      />
                                    </td>
                                  ) : null}
                                  <td className="max-w-[min(280px,28vw)] px-2 py-3 text-left align-middle">
                                    <button
                                      type="button"
                                      disabled={!isAccountEditable(acc.id)}
                                      className="group/acct flex w-full items-start gap-2 rounded-lg px-0.5 py-0.5 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isAccountEditable(acc.id)) return;
                                        const r = (
                                          e.currentTarget as HTMLButtonElement
                                        ).getBoundingClientRect();
                                        setAccountEditOpen({
                                          accountId: acc.id,
                                          rect: r,
                                        });
                                      }}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold text-white">
                                          {code}
                                        </div>
                                        <p className={accountKindSublineClassForRow(acc)}>
                                          {accountKindSublineText(acc)}
                                        </p>
                                      </div>
                                      <span
                                        className="mt-0.5 shrink-0 text-white/0 transition group-hover/acct:text-white/45"
                                        aria-hidden
                                      >
                                        <PencilEditIcon className="h-3.5 w-3.5" />
                                      </span>
                                    </button>
                                  </td>
                                  <td className="px-2 py-3 text-left align-middle text-white/85">
                                    {acc.propFirm.name}
                                  </td>
                                  <td className="whitespace-nowrap px-2 py-3 text-center align-middle tabular-nums text-white/80">
                                    {formatUsdWholeGrouped(sizeUsd)}
                                  </td>
                                  <td
                                    className="px-2 py-3 align-middle text-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex justify-center">
                                      <AccountStatusDropdown
                                        key={acc.id}
                                        accountId={acc.id}
                                        account={acc}
                                        onSelect={handleStatusSelect}
                                        planReadOnly={!isAccountEditable(acc.id)}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 text-center align-middle tabular-nums text-white/75">
                                    {targetBufferCell}
                                  </td>
                                  <td className="px-2 py-3 text-center align-middle tabular-nums text-white/60">
                                    {compareDdCents != null && compareDdCents > 0
                                      ? formatUsdWholeGrouped(compareDdCents / 100)
                                      : "—"}
                                  </td>
                                  <td className="px-2 py-3 text-center align-middle tabular-nums text-white/75">
                                    {feesStr}
                                  </td>
                                  <td
                                    className="px-2 py-3 text-center align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      disabled={!isFundedOrLive}
                                      onClick={() => {
                                        if (!isFundedOrLive) return;
                                        if (hasPayoutRows) {
                                          setEditPayoutAccountId(acc.id);
                                        } else {
                                          setPayoutAccountIds([acc.id]);
                                        }
                                      }}
                                      aria-label={
                                        hasPayoutRows
                                          ? `Edit payouts for ${code}`
                                          : `Add payout for ${code}`
                                      }
                                      className="tabular-nums font-medium text-amber-400/95 transition hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                                    >
                                      {payoutsStr}
                                    </button>
                                  </td>
                                  <td
                                    className={`px-2 py-3 text-center align-middle tabular-nums ${tradePnlClass}`}
                                    title={"Sum of workspace P&L lines for this account (trades sync + manual)"}
                                  >
                                    {tradePnlStr}
                                  </td>
                                  <td
                                    className="px-3 py-3 text-right align-middle"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Link
                                      href={`/desk/accounts/${acc.id}`}
                                      className="group/view inline-flex items-center justify-center gap-2 rounded-xl border border-sky-400/38 bg-gradient-to-b from-sky-500/22 via-sky-600/12 to-sky-950/30 px-4 py-2 text-sm font-semibold tracking-tight text-sky-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.11),0_2px_16px_rgba(56,189,248,0.14)] transition hover:border-sky-300/50 hover:from-sky-400/28 hover:via-sky-500/16 hover:to-sky-900/35 hover:shadow-[0_4px_24px_rgba(56,189,248,0.22)] active:scale-[0.98]"
                                    >
                                      <span>View</span>
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4 shrink-0 text-sky-200/90 transition group-hover/view:translate-x-0.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden
                                      >
                                        <path d="M5 12h14M13 6l6 6-6 6" />
                                      </svg>
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                        {filteredAccounts.length === 0 ? (
                          <p className="border-t border-white/10 px-4 py-8 text-center text-sm text-white/45">
                            No accounts in this filter.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
              </>
            )}
          </section>
      </JournalWorkspaceShell>
      {typeof document !== "undefined" && columnFilterPopover
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[80]"
                aria-hidden
                onMouseDown={() => setColumnFilterPopover(null)}
              />
              <div
                ref={columnFilterPopoverRef}
                className="fixed z-[90] max-h-[min(22rem,calc(100vh-2rem))] overflow-y-auto rounded-xl border border-white/12 bg-zinc-950/98 p-2 shadow-2xl backdrop-blur-sm"
                style={{
                  top: columnFilterPopover.rect.bottom + 6,
                  left: columnFilterPopover.rect.left,
                  minWidth: Math.max(200, columnFilterPopover.rect.width),
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {columnFilterPopover.kind === "name" ? (
                  <>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-white/45">
                      Contains
                    </label>
                    <input
                      ref={columnFilterNameInputRef}
                      type="search"
                      value={columnFilters.name}
                      onChange={(e) =>
                        setColumnFilters((c) => ({ ...c, name: e.target.value }))
                      }
                      placeholder="Account name…"
                      className="h-9 w-full min-w-[12rem] rounded-lg border border-white/12 bg-black/50 px-2 py-1 text-[13px] text-white/88 outline-none focus:border-sky-400/40"
                    />
                  </>
                ) : columnFilterPopover.kind === "firm" ? (
                  <div className="flex min-w-[10rem] flex-col gap-0.5">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1.5 text-left text-[13px] text-white/75 transition hover:bg-white/10"
                      onClick={() => {
                        setColumnFilters((c) => ({ ...c, firm: "" }));
                        setColumnFilterPopover(null);
                      }}
                    >
                      All firms
                    </button>
                    {firmFilterOptions.map((fn) => (
                      <button
                        key={fn}
                        type="button"
                        className={`rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-white/10 ${
                          columnFilters.firm === fn
                            ? "bg-sky-500/20 text-sky-200"
                            : "text-white/75"
                        }`}
                        onClick={() => {
                          setColumnFilters((c) => ({ ...c, firm: fn }));
                          setColumnFilterPopover(null);
                        }}
                      >
                        {fn}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-w-[8rem] flex-col gap-0.5">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1.5 text-left text-[13px] text-white/75 transition hover:bg-white/10"
                      onClick={() => {
                        setColumnFilters((c) => ({ ...c, size: "" }));
                        setColumnFilterPopover(null);
                      }}
                    >
                      All sizes
                    </button>
                    {sizeFilterOptions.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        className={`rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-white/10 ${
                          columnFilters.size === sz
                            ? "bg-sky-500/20 text-sky-200"
                            : "text-white/75"
                        }`}
                        onClick={() => {
                          setColumnFilters((c) => ({ ...c, size: sz }));
                          setColumnFilterPopover(null);
                        }}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>,
            document.body
          )
        : null}
      <DeleteAccountsModal
        open={deleteAccountIds != null && deleteAccountIds.length > 0}
        accountIds={deleteAccountIds ?? []}
        onClose={() => setDeleteAccountIds(null)}
        onConfirm={confirmDeleteAccounts}
      />
      <AddPayoutModal
        open={payoutAccountIds != null && payoutAccountIds.length > 0}
        accounts={payoutModalAccounts}
        defaultDate={isoDateLocal()}
        suggestedAmountUsdByAccountId={undefined}
        journalPayoutState={state}
        onClose={() => setPayoutAccountIds(null)}
        onConfirm={confirmPayout}
      />
      {editPayoutAccountId && state.accounts[editPayoutAccountId] ? (
        <EditPayoutFlowModal
          open
          account={state.accounts[editPayoutAccountId]!}
          payouts={Object.values(state.payoutEntries).filter(
            (p) => p.accountId === editPayoutAccountId
          )}
          journalState={state}
          onClose={() => setEditPayoutAccountId(null)}
          dispatch={dispatch}
        />
      ) : null}
      {accountEditOpen && state.accounts[accountEditOpen.accountId] ? (
        <AccountRowEditPopover
          key={accountEditOpen.accountId}
          account={state.accounts[accountEditOpen.accountId]}
          open
          anchorRect={accountEditOpen.rect}
          resolvedName={resolveAccountDisplayName(
            state.accounts[accountEditOpen.accountId],
            autoAccountLabelById
          )}
          onClose={() => setAccountEditOpen(null)}
          onSave={(payload) => saveAccountRowEdit(accountEditOpen.accountId, payload)}
        />
      ) : null}
      <PassedConvertModalHost
        open={passedFlow !== null}
        flow={passedFlow}
        account={passedAccount}
        formatAccountLabel={formatAccountLabel}
        onClose={() => {
          passedChallengeQueueRef.current = [];
          setPassedFlow(null);
        }}
        onIntroMaybeLater={introMaybeLater}
        onIntroConvertNow={introConvertNow}
        onConfirmConvert={confirmConvertToFunded}
      />
    </>
  );
}
