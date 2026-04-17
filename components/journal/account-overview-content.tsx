"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import { nowIso } from "@/lib/journal/reducer";
import {
  getAccountPayoutTotalDisplayCents,
  journalPayoutDisplayCents,
} from "@/lib/journal/payout-display";
import {
  isTradeDayFundedJournalAccount,
  sumNonRejectedJournalPayoutGrossCents,
  tradedayTraderNetFromGrossMarginal,
} from "@/lib/journal/tradeday-journal-rules";
import { getAccountFinancialMetrics } from "@/lib/journal/selectors";
import {
  compareMaxDrawdownCentsForJournal,
  findEvalCompareRow,
  findFundedCompareRow,
} from "@/lib/journal/compare-account-helpers";
import {
  resolveApexAccountRulesCard,
  type ApexEvalRulesLayout,
} from "@/lib/journal/apex-journal-rules";
import { resolveBulenoxAccountRulesCard } from "@/lib/journal/bulenox-journal-rules";
import { resolveTopStepAccountRulesCard } from "@/lib/journal/topstep-journal-rules";
import { resolveTptAccountRulesCard } from "@/lib/journal/tpt-journal-rules";
import { resolveLucidAccountRulesCard } from "@/lib/journal/lucid-journal-rules";
import { resolveFundedFuturesNetworkAccountRulesCard } from "@/lib/journal/funded-futures-network-journal-rules";
import { resolveFundedNextAccountRulesCard } from "@/lib/journal/funded-next-journal-rules";
import { resolveTradeifyAccountRulesCard } from "@/lib/journal/tradeify-journal-rules";
import { resolveCompareBackedJournalAccountRules } from "@/lib/journal/compare-journal-account-rules";
import { resolveSevenFirmsAccountRulesCard } from "@/lib/journal/seven-firms-journal-rules";
import { lookupJournalBufferCents } from "@/lib/journal/journal-buffer-lookup";
import type {
  AccountStatus,
  FeeType,
  JournalAccount,
  JournalDataV1,
  JournalFeeEntry,
  JournalPayoutEntry,
} from "@/lib/journal/types";
import type { JournalAction } from "@/lib/journal/reducer";
import { formatUsdWholeGrouped } from "@/lib/prop-firms";
import type { PropFirm } from "@/lib/prop-firms";
import { AddAccountFeeModal } from "@/components/journal/add-account-fee-modal";
import { AddPayoutModal, type PayoutModalAccountLine } from "@/components/journal/add-payout-modal";
import { EditPayoutFlowModal } from "@/components/journal/edit-payout-flow-modal";
import { ApexFundedRulesSection, RuleCell } from "@/components/journal/apex-funded-rules-panel";
import {
  isOtherPropFirm,
  OtherAccountRulesSection,
} from "@/components/journal/other-account-rules-section";
import { AccountStatusDropdown } from "@/components/journal/account-status-dropdown";
import {
  PassedConvertModalHost,
  type PassedConvertFlow,
} from "@/components/journal/passed-convert-modals";
import {
  dispatchFundConversion,
  dispatchIntroPassedMaybeLater,
} from "@/lib/journal/fund-conversion-actions";
import {
  resolveAccountDisplayName,
  useAutoAccountLabelById,
} from "@/components/journal/account-auto-labels";
function statusHeaderLabel(status: JournalAccount["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "passed":
      return "Passed";
    case "failed":
      return "Blown";
    case "closed":
      return "Closed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

function statusHeaderClass(status: JournalAccount["status"]): string {
  switch (status) {
    case "passed":
      return "border-emerald-400/30 bg-emerald-500/12 text-emerald-100";
    case "failed":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    case "active":
      return "border-white/12 bg-slate-800/70 text-slate-100";
    default:
      return "border-white/10 bg-white/[0.06] text-white/88";
  }
}

function feeTypeLabel(t: FeeType): string {
  switch (t) {
    case "reset_fee":
      return "Reset";
    case "monthly_subscription":
      return "Monthly Subscription";
    case "challenge_fee":
      return "Challenge fee";
    case "activation_fee":
      return "Activation fee";
    case "data_fee":
      return "Data fee";
    case "platform_fee":
      return "Platform fee";
    case "other":
      return "Other";
    default:
      return t;
  }
}

function formatDrawdownFromCompare(d: PropFirm["drawdown"] | undefined): string {
  if (!d) return "—";
  const map: Record<PropFirm["drawdown"], string> = {
    EOD: "EOD",
    EOT: "EOT",
    Trailing: "Trail",
    Static: "Static",
  };
  return map[d] ?? d.toUpperCase();
}

function rulesCompareRow(acc: JournalAccount): PropFirm | null {
  if (acc.accountType === "challenge") {
    return findEvalCompareRow(acc);
  }
  return findFundedCompareRow(acc) ?? findEvalCompareRow(acc);
}

function isEvalAccount(acc: JournalAccount): boolean {
  return acc.accountType === "challenge";
}

function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysActiveFrom(startIso: string): number {
  const a = new Date(startIso + "T12:00:00");
  const b = new Date();
  b.setHours(12, 0, 0, 0);
  if (Number.isNaN(a.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

type TimelineRow = {
  id: string;
  date: string;
  title: string;
  detail?: string;
  amountCents?: number;
  isPayout?: boolean;
  payoutEntryId?: string;
};

function buildTimeline(
  acc: JournalAccount,
  fees: JournalFeeEntry[],
  payouts: JournalPayoutEntry[],
  state: JournalDataV1
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const started = acc.evaluationStartedDate ?? acc.startDate;
  if (started) {
    rows.push({ id: "life-started", date: started, title: "Account started" });
  }
  if (acc.passedEvaluationDate) {
    rows.push({
      id: "life-passed",
      date: acc.passedEvaluationDate,
      title: "Evaluation passed",
    });
  }
  if (acc.fundedConvertedDate) {
    rows.push({
      id: "life-funded",
      date: acc.fundedConvertedDate,
      title: "Converted to funded",
    });
  }
  if (acc.blownDate) {
    rows.push({
      id: "life-blown",
      date: acc.blownDate,
      title: "Account blown",
    });
  }
  for (const f of fees) {
    rows.push({
      id: `fee-${f.id}`,
      date: f.date,
      title: feeTypeLabel(f.type),
      detail: f.note,
      amountCents: -f.amountCents,
    });
  }
  for (const p of payouts) {
    const d = p.paidDate ?? p.requestedDate;
    rows.push({
      id: `payout-${p.id}`,
      date: d,
      title: "Payout",
      detail: p.note,
      amountCents: journalPayoutDisplayCents(p, acc, state),
      isPayout: true,
      payoutEntryId: p.id,
    });
  }
  rows.sort((a, b) => {
    const c = b.date.localeCompare(a.date);
    return c !== 0 ? c : a.id.localeCompare(b.id);
  });
  return rows;
}

/** Aligné Dashboard / Progress */
const SECTION_LABEL = "text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90";

const STAT_CARD =
  "rounded-xl border border-white/10 bg-black/25 px-4 py-3 shadow-sm shadow-black/10";

const payoutAmountClickableClass =
  "cursor-pointer rounded-md text-left transition hover:bg-amber-500/12 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400/50 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40 disabled:hover:bg-transparent";

const PANEL_SHELL =
  "relative overflow-hidden rounded-2xl border border-slate-600/25 bg-gradient-to-b from-slate-800/40 via-slate-900/45 to-slate-950/55 shadow-[0_16px_40px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]";

function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`${PANEL_SHELL} ${className}`}>
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.05] blur-2xl"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

const CARD_TITLE = "text-sm font-semibold tracking-tight text-white/90";

const BACK_NAV_CLASS =
  "group/back inline-flex w-fit items-center gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/88 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-100";

export type AccountOverviewContentProps = {
  account: JournalAccount;
  state: JournalDataV1;
  resolvedName: string;
  dispatch: (a: JournalAction) => void;
  /** Fermeture (ex. modale) : remplace le lien « Back to Accounts » par un bouton Close. */
  onClose?: () => void;
  /** Lite overflow: account not in the two editable picks — history visible, inputs disabled. */
  readOnly?: boolean;
};

export function AccountOverviewContent({
  account,
  state,
  resolvedName,
  dispatch,
  onClose,
  readOnly = false,
}: AccountOverviewContentProps) {
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [editPayoutTarget, setEditPayoutTarget] = useState<{ initialPayoutId?: string } | null>(null);
  const [passedFlowOverview, setPassedFlowOverview] = useState<PassedConvertFlow>(null);
  const passedOverviewQueueRef = useRef<string[]>([]);

  const accountsForLabels = useMemo(() => Object.values(state.accounts), [state.accounts]);
  const overviewLabelById = useAutoAccountLabelById(accountsForLabels);
  const formatOverviewAccountLabel = useCallback(
    (a: JournalAccount) => resolveAccountDisplayName(a, overviewLabelById),
    [overviewLabelById]
  );

  const closePassedOverview = useCallback(() => {
    passedOverviewQueueRef.current = [];
    setPassedFlowOverview(null);
  }, []);

  const handleOverviewStatusSelect = useCallback(
    (accountId: string, next: AccountStatus) => {
      const acc = state.accounts[accountId];
      if (!acc || acc.id !== accountId || acc.id !== account.id) return;
      if (acc.status === "failed") return;
      if (next === "passed" && acc.accountType === "challenge") {
        passedOverviewQueueRef.current = [];
        setPassedFlowOverview({ accountId, phase: "intro" });
        return;
      }
      if (next === "active" && acc.status === "passed") return;
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
    [state.accounts, account.id, dispatch]
  );

  const confirmOverviewConvert = useCallback(
    (payload: {
      newDisplayName: string;
      activationFeeUsd: number;
      fundedConversionDate: string;
      tradeifySelectFundedVariant?: "daily" | "flex";
    }) => {
      if (!passedFlowOverview) return;
      const challenge = state.accounts[passedFlowOverview.accountId];
      if (!challenge) return;
      dispatchFundConversion({
        dispatch,
        state,
        challenge,
        payload,
        getAutoLabel: (id) => overviewLabelById.get(id),
      });
      closePassedOverview();
    },
    [passedFlowOverview, state, dispatch, overviewLabelById, closePassedOverview]
  );

  const introOverviewMaybeLater = useCallback(() => {
    const id = passedFlowOverview?.accountId;
    if (id) dispatchIntroPassedMaybeLater({ dispatch, state, accountId: id });
    closePassedOverview();
  }, [passedFlowOverview, dispatch, state, closePassedOverview]);

  const introOverviewConvertNow = useCallback(() => {
    if (!passedFlowOverview) return;
    setPassedFlowOverview({ accountId: passedFlowOverview.accountId, phase: "convert" });
  }, [passedFlowOverview]);

  const passedOverviewAccount = passedFlowOverview
    ? state.accounts[passedFlowOverview.accountId]
    : null;

  const fees = useMemo(() => {
    return Object.values(state.feeEntries)
      .filter((f) => f.accountId === account.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
  }, [account.id, state.feeEntries]);

  const payouts = useMemo(() => {
    return Object.values(state.payoutEntries)
      .filter((p) => p.accountId === account.id)
      .sort((a, b) => {
        const da = b.paidDate ?? b.requestedDate;
        const db = a.paidDate ?? a.requestedDate;
        return da.localeCompare(db);
      });
  }, [account.id, state.payoutEntries]);

  const metrics = useMemo(() => getAccountFinancialMetrics(state, account.id), [state, account.id]);
  const totalPayoutsDisplay = useMemo(
    () => getAccountPayoutTotalDisplayCents(state, account.id),
    [state, account.id]
  );

  const compareRow = rulesCompareRow(account);
  const evalRow = findEvalCompareRow(account);
  const maxDdCents = compareMaxDrawdownCentsForJournal(account);
  const bufferCents = lookupJournalBufferCents(account);

  const profitTargetFromCompare = evalRow?.target ?? account.profitTargetLabel ?? "—";

  const ageDays = useMemo(() => {
    const start = account.evaluationStartedDate ?? account.startDate;
    return daysActiveFrom(start);
  }, [account.evaluationStartedDate, account.startDate]);

  const timeline = useMemo(
    () => buildTimeline(account, fees, payouts, state),
    [account, fees, payouts, state]
  );

  const onAddFee = useCallback(
    (payload: { type: FeeType; amountCents: number; date: string; note?: string }) => {
      const t = nowIso();
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `fee-${Date.now()}`;
      dispatch({
        type: "fee/upsert",
        payload: {
          id,
          accountId: account.id,
          date: payload.date,
          type: payload.type,
          amountCents: payload.amountCents,
          currency: "USD",
          note: payload.note,
          createdAt: t,
          updatedAt: t,
        },
      });
    },
    [account.id, dispatch]
  );

  const deleteFee = useCallback(
    (entryId: string) => {
      dispatch({ type: "fee/delete", payload: { entryId } });
    },
    [dispatch]
  );

  const deletePayout = useCallback(
    (entryId: string) => {
      dispatch({ type: "payout/delete", payload: { entryId } });
    },
    [dispatch]
  );

  const openEditPayoutFlow = useCallback(
    (initialPayoutId?: string) => {
      if (payouts.length === 0) return;
      setEditPayoutTarget(initialPayoutId ? { initialPayoutId } : {});
    },
    [payouts.length]
  );

  const payoutLine: PayoutModalAccountLine[] = useMemo(
    () => [
      {
        id: account.id,
        label: resolvedName,
        firmName: account.propFirm.name,
        journalAccount: account,
      },
    ],
    [account.id, account.propFirm.name, resolvedName]
  );

  const confirmPayout = useCallback(
    (payload: {
      date: string;
      note: string;
      perAccount: { accountId: string; netUsd: number }[];
    }) => {
      const t = nowIso();
      for (const { accountId, netUsd } of payload.perAccount) {
        if (accountId !== account.id || netUsd <= 0) continue;
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `payout-${Date.now()}`;
        const grossCents = Math.round(netUsd * 100);
        if (grossCents <= 0) continue;
        const priorGross =
          isTradeDayFundedJournalAccount(account)
            ? sumNonRejectedJournalPayoutGrossCents(state, account.id)
            : 0;
        const netAmountCents = isTradeDayFundedJournalAccount(account)
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
      setPayoutModalOpen(false);
    },
    [account, dispatch, state]
  );

  const code = account.displayAccountCode?.trim() || resolvedName;
  const subline = `${account.propFirm.name} · ${formatUsdWholeGrouped(account.sizeNominalCents / 100)}`;
  const totalFees = metrics.totalFeesCents;
  const totalPayouts = totalPayoutsDisplay;
  const netCash = totalPayoutsDisplay - totalFees;
  const roiPct =
    totalFees > 0 ? (netCash / totalFees) * 100 : totalPayouts === 0 && totalFees === 0 ? null : 0;

  const maxBar = Math.max(totalFees, totalPayouts, 1);
  const feeBarPct = Math.min(100, (totalFees / maxBar) * 100);
  const payoutBarPct = Math.min(100, (totalPayouts / maxBar) * 100);

  const evalCtx = isEvalAccount(account);
  const apexRulesCard = useMemo(
    () => resolveApexAccountRulesCard(state, account),
    [state, account]
  );
  const topStepRulesCard = useMemo(
    () => resolveTopStepAccountRulesCard(state, account),
    [state, account]
  );
  const bulenoxRulesCard = useMemo(
    () => resolveBulenoxAccountRulesCard(state, account),
    [state, account]
  );
  const tptRulesCard = useMemo(() => resolveTptAccountRulesCard(state, account), [state, account]);
  const lucidRulesCard = useMemo(() => resolveLucidAccountRulesCard(state, account), [state, account]);
  const tradeifyRulesCard = useMemo(
    () => resolveTradeifyAccountRulesCard(state, account),
    [state, account]
  );
  const sevenFirmsRulesCard = useMemo(
    () => resolveSevenFirmsAccountRulesCard(state, account),
    [state, account]
  );
  const fundedNextRulesCard = useMemo(
    () => resolveFundedNextAccountRulesCard(state, account),
    [state, account]
  );
  const fundedFuturesNetworkRulesCard = useMemo(
    () => resolveFundedFuturesNetworkAccountRulesCard(state, account),
    [state, account]
  );
  const compareBackedRulesCard = useMemo(
    () => resolveCompareBackedJournalAccountRules(state, account),
    [state, account]
  );
  const evalRulesCard =
    apexRulesCard ??
    topStepRulesCard ??
    bulenoxRulesCard ??
    tradeifyRulesCard ??
    sevenFirmsRulesCard ??
    fundedNextRulesCard ??
    fundedFuturesNetworkRulesCard ??
    tptRulesCard ??
    lucidRulesCard ??
    compareBackedRulesCard;
  const lucidSplit =
    account.propFirm.name.trim().toLowerCase() === "lucid trading" ? "90%" : "Coming soon";

  const bufferDisplayStr = useMemo(
    () => (bufferCents != null ? formatUsdWholeGrouped(bufferCents / 100) : "—"),
    [bufferCents]
  );
  const maxDdDisplayStr = useMemo(
    () =>
      maxDdCents != null && maxDdCents > 0
        ? formatUsdWholeGrouped(maxDdCents / 100)
        : "—",
    [maxDdCents]
  );
  const canRecordPayout =
    account.accountType === "funded" || account.accountType === "live";

  const feesShareDeg =
    totalFees + totalPayouts > 0 ? (totalFees / (totalFees + totalPayouts)) * 360 : 180;

  return (
    <>
      <header className="relative z-10 shrink-0 border-b border-white/10 bg-black/55 px-[clamp(12px,2.5vw,40px)] py-[clamp(14px,1.8vw,24px)] backdrop-blur-xl">
        <div className="mx-auto flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {onClose ? (
              <button type="button" onClick={onClose} className={`${BACK_NAV_CLASS} active:scale-[0.99]`}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-sky-400/95 transition group-hover/back:-translate-x-0.5 group-hover/back:text-sky-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="tracking-tight">Close</span>
              </button>
            ) : (
              <Link href="/desk/accounts" className={`${BACK_NAV_CLASS} active:scale-[0.99]`}>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0 text-sky-400/95 transition group-hover/back:-translate-x-0.5 group-hover/back:text-sky-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="tracking-tight">Back to Accounts</span>
              </Link>
            )}
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">Account</p>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">{code}</h1>
            <p className="mt-1 text-sm text-slate-500">{subline}</p>
          </div>
          <div
            className="shrink-0 self-start sm:self-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <AccountStatusDropdown
              accountId={account.id}
              account={account}
              onSelect={handleOverviewStatusSelect}
              labelForStatus={statusHeaderLabel}
              classNameForStatus={statusHeaderClass}
              planReadOnly={readOnly}
            />
          </div>
        </div>
      </header>

      {readOnly ? (
        <div className="relative z-[1] border-b border-amber-400/25 bg-amber-500/10 px-[clamp(12px,2.5vw,40px)] py-3 text-center text-[13px] leading-snug text-amber-100/95">
          View only — this account is frozen under your plan. History stays visible; delete it from the Accounts list if you
          need to free an editable slot.
        </div>
      ) : null}

      <div
        className={`relative z-[1] w-full flex-1 px-[clamp(12px,2.5vw,40px)] py-[clamp(18px,3vw,42px)] ${readOnly ? "opacity-[0.92]" : ""}`}
        {...(readOnly ? { inert: true } : {})}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={STAT_CARD}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Status</p>
            <p className="mt-2 text-lg font-semibold text-white/95">{statusHeaderLabel(account.status)}</p>
          </div>
          <div className={STAT_CARD}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Age</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white">
              {ageDays} {ageDays === 1 ? "day" : "days"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              From {formatShortDate(account.evaluationStartedDate ?? account.startDate)}
            </p>
          </div>
          <div className={STAT_CARD}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Total fees</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-white/90">
              −{formatUsdWholeGrouped(totalFees / 100)}
            </p>
          </div>
          <div className={STAT_CARD}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/55">
              Total payouts
            </p>
            <button
              type="button"
              disabled={!canRecordPayout}
              onClick={() => {
                if (!canRecordPayout) return;
                if (payouts.length === 0) setPayoutModalOpen(true);
                else openEditPayoutFlow();
              }}
              aria-label={
                payouts.length === 0 ? "Add payout" : "Edit payout amounts"
              }
              className={`${payoutAmountClickableClass} mt-2 block w-full text-2xl font-semibold tabular-nums text-amber-200/95 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              +{formatUsdWholeGrouped(totalPayouts / 100)}
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className={SECTION_LABEL}>Fees</p>
            <button
              type="button"
              onClick={() => setFeeModalOpen(true)}
              className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:border-sky-400/30 hover:bg-sky-500/10 hover:text-sky-100"
            >
              + Add
            </button>
          </div>
          <Panel className="p-4">
            {fees.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No fees recorded yet</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {fees.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white/90">{feeTypeLabel(f.type)}</p>
                      <p className="text-xs text-slate-500">
                        {formatShortDate(f.date)}
                        {f.note ? ` · ${f.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-sm font-medium text-white/75">
                        −{formatUsdWholeGrouped(f.amountCents / 100)}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove fee"
                        onClick={() => deleteFee(f.id)}
                        className="rounded-lg p-1.5 text-white/35 transition hover:bg-red-500/15 hover:text-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className={SECTION_LABEL}>Payouts</p>
            <button
              type="button"
              onClick={() => setPayoutModalOpen(true)}
              className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-300/35 hover:bg-amber-500/15"
            >
              + Add
            </button>
          </div>
          <Panel className="p-4">
            {payouts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No payouts recorded yet</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {payouts.map((p) => {
                  const d = p.paidDate ?? p.requestedDate;
                  return (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-amber-100/90">Payout</p>
                        <p className="text-xs text-slate-500">
                          {formatShortDate(d)}
                          {p.note ? ` · ${p.note}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditPayoutFlow(p.id)}
                          aria-label="Edit payout amount"
                          className={`${payoutAmountClickableClass} tabular-nums text-sm font-semibold text-amber-200/95`}
                        >
                          +{formatUsdWholeGrouped(journalPayoutDisplayCents(p, account, state) / 100)}
                        </button>
                        <button
                          type="button"
                          aria-label="Remove payout"
                          onClick={() => deletePayout(p.id)}
                          className="rounded-lg p-1.5 text-white/35 transition hover:bg-red-500/15 hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <Panel className="p-4">
            <p className={SECTION_LABEL}>P&amp;L</p>
            <h2 className={`mt-2 ${CARD_TITLE}`}>Summary</h2>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div
                className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0"
                style={{
                  background: `conic-gradient(from 220deg, rgba(113,113,122,0.65) 0deg ${feesShareDeg}deg, rgba(251,191,36,0.55) ${feesShareDeg}deg 360deg)`,
                  borderRadius: "50%",
                  boxShadow: "inset 0 0 0 10px rgba(3,5,10,0.92), 0 0 24px rgba(0,0,0,0.35)",
                }}
              >
                <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-[#080b12]/95 text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Net
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold tabular-nums ${
                      netCash >= 0 ? "text-emerald-300/95" : "text-red-400/95"
                    }`}
                  >
                    {netCash >= 0 ? "+" : "−"}
                    {formatUsdWholeGrouped(Math.abs(netCash) / 100)}
                  </p>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">Net profit / loss (cash)</p>
                  {roiPct != null ? (
                    <p className="mt-0.5 text-sm tabular-nums text-slate-400">
                      {roiPct >= 0 ? "+" : ""}
                      {roiPct.toFixed(1)}% vs fees paid
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-slate-500">—</p>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Total fees</span>
                    <span className="tabular-nums text-white/75">
                      −{formatUsdWholeGrouped(totalFees / 100)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-zinc-500/70 to-zinc-400/45 transition-all duration-500"
                      style={{ width: `${feeBarPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-amber-200/60">
                    <span>Total payouts</span>
                    <button
                      type="button"
                      disabled={!canRecordPayout}
                      onClick={() => {
                        if (!canRecordPayout) return;
                        if (payouts.length === 0) setPayoutModalOpen(true);
                        else openEditPayoutFlow();
                      }}
                      aria-label={
                        payouts.length === 0 ? "Add payout" : "Edit payout amounts"
                      }
                      className={`${payoutAmountClickableClass} tabular-nums text-amber-200/90 disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      +{formatUsdWholeGrouped(totalPayouts / 100)}
                    </button>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-600/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500/75 to-amber-400/55 transition-all duration-500"
                      style={{ width: `${payoutBarPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-6 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
                  <span>
                    <span className="font-semibold text-white/80">{payouts.length}</span> payouts
                  </span>
                  <span>
                    <span className="font-semibold text-white/80">{ageDays}</span> days active
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-4">
            <p className={SECTION_LABEL}>History</p>
            <h2 className={`mt-2 ${CARD_TITLE}`}>Timeline</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Setup start date, status (passed / blown), funded conversion, and every fee or payout
              you add here — all in one place.
            </p>
            <ul className="mt-4 max-h-[min(50dvh,28rem)] space-y-0 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
              {timeline.length === 0 ? (
                <li className="py-8 text-center text-sm text-slate-500">No events yet</li>
              ) : (
                timeline.map((row) => (
                  <li
                    key={row.id}
                    className="relative flex gap-3 border-l border-white/10 py-3 pl-5"
                  >
                    <span
                      className="absolute left-0 top-[18px] h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.12)]"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white/90">{row.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatShortDate(row.date)}
                        {row.detail ? ` · ${row.detail}` : ""}
                      </p>
                    </div>
                    {row.amountCents != null ? (
                      row.isPayout && row.payoutEntryId ? (
                        <button
                          type="button"
                          onClick={() => openEditPayoutFlow(row.payoutEntryId)}
                          aria-label="Edit payout amount"
                          className={`${payoutAmountClickableClass} shrink-0 tabular-nums text-sm font-medium text-amber-200/95`}
                        >
                          +{formatUsdWholeGrouped(Math.abs(row.amountCents) / 100)}
                        </button>
                      ) : (
                        <span
                          className={`shrink-0 tabular-nums text-sm font-medium ${
                            row.isPayout ? "text-amber-200/95" : "text-white/70"
                          }`}
                        >
                          {row.isPayout ? "+" : "−"}
                          {formatUsdWholeGrouped(Math.abs(row.amountCents) / 100)}
                        </span>
                      )
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </Panel>
        </div>

        <div className="mt-10">
          <p className={SECTION_LABEL}>Rules</p>
          <Panel className="mt-3 grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {evalRulesCard ? (
              evalRulesCard.phase === "eval" ? (
                <ApexEvalRulesSection layout={evalRulesCard.evalLayout} />
              ) : (
                <ApexFundedRulesSection layout={evalRulesCard.fundedLayout} />
              )
            ) : isOtherPropFirm(account) ? (
              <OtherAccountRulesSection
                account={account}
                dispatch={dispatch}
                evalCtx={evalCtx}
                profitTargetFromCompare={profitTargetFromCompare}
                bufferDisplay={bufferDisplayStr}
                maxDdDisplay={maxDdDisplayStr}
              />
            ) : (
              <>
                <RuleCell label="Payout rules" value="Coming soon" />
                <RuleCell
                  label={evalCtx ? "Profit target" : "Buffer"}
                  value={
                    evalCtx
                      ? profitTargetFromCompare
                      : bufferCents != null
                        ? formatUsdWholeGrouped(bufferCents / 100)
                        : "—"
                  }
                />
                {!evalCtx ? <RuleCell label="Profit split" value={lucidSplit} /> : null}
                <RuleCell label="Payout frequency" value="Coming soon" />
                <RuleCell
                  label="Max drawdown"
                  value={
                    maxDdCents != null && maxDdCents > 0
                      ? formatUsdWholeGrouped(maxDdCents / 100)
                      : "—"
                  }
                />
                <RuleCell label="News trading" value="Coming soon" />
                <RuleCell label="Scaling plan" value="Coming soon" />
                <RuleCell label="Overnight / weekend" value="Coming soon" />
                <RuleCell
                  label="Drawdown type"
                  value={formatDrawdownFromCompare(compareRow?.drawdown)}
                />
                <RuleCell
                  label="Min. trading days"
                  value={evalCtx ? (compareRow?.rules.minDays ?? "—") : "Coming soon"}
                />
              </>
            )}
          </Panel>
        </div>
      </div>

      <PassedConvertModalHost
        open={passedFlowOverview !== null}
        flow={passedFlowOverview}
        account={passedOverviewAccount}
        formatAccountLabel={formatOverviewAccountLabel}
        onClose={closePassedOverview}
        onIntroMaybeLater={introOverviewMaybeLater}
        onIntroConvertNow={introOverviewConvertNow}
        onConfirmConvert={confirmOverviewConvert}
      />
      <AddAccountFeeModal
        open={feeModalOpen}
        defaultDate={isoDateLocal()}
        onClose={() => setFeeModalOpen(false)}
        onConfirm={onAddFee}
      />
      <AddPayoutModal
        open={payoutModalOpen}
        accounts={payoutLine}
        variant="singleAccount"
        defaultDate={isoDateLocal()}
        suggestedAmountUsdByAccountId={undefined}
        journalPayoutState={state}
        onClose={() => setPayoutModalOpen(false)}
        onConfirm={confirmPayout}
      />
      <EditPayoutFlowModal
        open={editPayoutTarget != null}
        account={account}
        payouts={payouts}
        journalState={state}
        initialPayoutId={editPayoutTarget?.initialPayoutId}
        onClose={() => setEditPayoutTarget(null)}
        dispatch={dispatch}
      />
    </>
  );
}

function ApexEvalRulesSection({ layout }: { layout: ApexEvalRulesLayout }) {
  const {
    rules,
    drawdownType,
    sizing,
    profitTarget,
    tradingNews,
    drawdown,
    overnight,
    dll,
  } = layout;

  return (
    <>
      {/* Lecture ligne par ligne (mobile) — même ordre que la grille 3×3 (ligne par ligne) */}
      <div className="col-span-full flex flex-col gap-4 sm:hidden">
        <RuleCell
          label={rules.label}
          value={rules.value}
          multiline={rules.multiline}
          labelInfoTooltip={rules.labelInfoPopover ? undefined : rules.labelInfoTooltip}
          labelInfoPopover={rules.labelInfoPopover}
        />
        <RuleCell label={drawdownType.label} value={drawdownType.value} />
        <RuleCell label={sizing.label} value={sizing.value} multiline={sizing.multiline} />
        <RuleCell label={tradingNews.label} value={tradingNews.value} />
        <RuleCell label={drawdown.label} value={drawdown.value} />
        <RuleCell label={profitTarget.label} value={profitTarget.value} />
        <RuleCell label={overnight.label} value={overnight.value} />
        <RuleCell label={dll.label} value={dll.value} />
      </div>
      {/* Grille 3×3 : r1 Rules | Drawdown type | Sizing ; r2 … ; r3 Overnight | DLL | vide */}
      <div className="col-span-full hidden gap-x-8 gap-y-4 sm:grid sm:grid-cols-3 sm:grid-rows-3">
        <div className="sm:col-start-1 sm:row-start-1">
          <RuleCell
            label={rules.label}
            value={rules.value}
            multiline={rules.multiline}
            labelInfoTooltip={rules.labelInfoPopover ? undefined : rules.labelInfoTooltip}
            labelInfoPopover={rules.labelInfoPopover}
          />
        </div>
        <div className="sm:col-start-2 sm:row-start-1">
          <RuleCell label={drawdownType.label} value={drawdownType.value} />
        </div>
        <div className="sm:col-start-3 sm:row-start-1">
          <RuleCell label={sizing.label} value={sizing.value} multiline={sizing.multiline} />
        </div>
        <div className="sm:col-start-1 sm:row-start-2">
          <RuleCell label={tradingNews.label} value={tradingNews.value} />
        </div>
        <div className="sm:col-start-2 sm:row-start-2">
          <RuleCell label={drawdown.label} value={drawdown.value} />
        </div>
        <div className="sm:col-start-3 sm:row-start-2">
          <RuleCell label={profitTarget.label} value={profitTarget.value} />
        </div>
        <div className="sm:col-start-1 sm:row-start-3">
          <RuleCell label={overnight.label} value={overnight.value} />
        </div>
        <div className="sm:col-start-2 sm:row-start-3">
          <RuleCell label={dll.label} value={dll.value} />
        </div>
        <div className="sm:col-start-3 sm:row-start-3" aria-hidden />
      </div>
    </>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
