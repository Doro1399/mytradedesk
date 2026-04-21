"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  aggregateDailyPnlCents,
  buildStoredTradesFromCsv,
  buildStoredTradesFromCsvWithResolver,
  parseBrokerTradeCsv,
  type CsvTradeParseSuccess,
} from "@/lib/journal/csv-trade-import";
import {
  applyManualAccountMappings,
  collectCsvAccountLabelsFromRows,
  resolveCsvImportAccountLabels,
} from "@/lib/journal/csv-account-resolution";
import type { CsvImportModalSnapshot, StoredTrade } from "@/lib/journal/trades-storage";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import type { ISODate, JournalAccount, JournalId } from "@/lib/journal/types";
import { resolveAccountDisplayName } from "@/components/journal/account-auto-labels";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";
import { parseUsdInputToCents } from "@/lib/journal/parse-usd-input";

/** Match journal calendar filter triggers. */
const SELECT_CLASS =
  "rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-[13px] text-white/85 outline-none transition focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25";

/** Match calendar dropdown panel — high z so list paints above modal footer + scroll clipping. */
const FILTER_MENU_PANEL =
  "absolute left-0 right-0 top-[calc(100%+6px)] z-[320] rounded-xl border border-white/12 bg-[#0c1018] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]";

const MENU_ITEM =
  "w-full rounded-lg px-3 py-2 text-left text-[13px] transition text-white/88 hover:bg-white/[0.06]";
const MENU_ITEM_ACTIVE = "bg-sky-500/15 text-sky-200/95";

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarStyleAccountSelect({
  label,
  value,
  onValueChange,
  accounts,
  labelByAccountId,
  menuOpen,
  onMenuOpenChange,
  containerRef,
}: {
  label: string;
  value: JournalId | "";
  onValueChange: (id: JournalId | "") => void;
  accounts: JournalAccount[];
  labelByAccountId: Map<string, string>;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const selectedAcc = value ? accounts.find((a) => a.id === value) : undefined;
  const summary = selectedAcc
    ? resolveAccountDisplayName(selectedAcc, labelByAccountId)
    : "— Select account —";

  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</span>
      <div ref={containerRef} className={`relative ${menuOpen ? "z-[340]" : ""}`}>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          className={`${SELECT_CLASS} inline-flex w-full items-center justify-between gap-2 text-left`}
          onClick={() => onMenuOpenChange(!menuOpen)}
        >
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-white/45 transition ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>
        {menuOpen ? (
          <div
            className={`${FILTER_MENU_PANEL} max-h-[min(60vh,22rem)] overflow-y-auto overscroll-y-contain py-1 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]`}
            role="listbox"
            aria-label={label}
          >
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => {
                onValueChange("");
                onMenuOpenChange(false);
              }}
              className={`${MENU_ITEM} ${value === "" ? MENU_ITEM_ACTIVE : ""}`}
            >
              — Select account —
            </button>
            {accounts.map((a) => {
              const name = resolveAccountDisplayName(a, labelByAccountId);
              const selected = value === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onValueChange(a.id);
                    onMenuOpenChange(false);
                  }}
                  className={`${MENU_ITEM} ${selected ? MENU_ITEM_ACTIVE : ""}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatUsdSignedNet(cents: number): string {
  const sign = cents > 0 ? "+" : "";
  return (
    sign +
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  );
}

type ImportTab = "auto" | "csv" | "manual";

export type ManualPnlCommit = {
  accountId: JournalId;
  date: ISODate;
  pnlCents: number;
  note?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: JournalAccount[];
  labelByAccountId: Map<string, string>;
  lastImportAt?: string;
  onCommitImport: (trades: StoredTrade[], snapshot: CsvImportModalSnapshot) => void;
  onCommitManualPnl: (payload: ManualPnlCommit) => void;
};

export function ImportTradesModal({
  open,
  onClose,
  accounts,
  labelByAccountId,
  lastImportAt,
  onCommitImport,
  onCommitManualPnl,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ImportTab>("csv");
  const [accountId, setAccountId] = useState<JournalId | "">("");
  const [parseResult, setParseResult] = useState<CsvTradeParseSuccess | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [csvRawText, setCsvRawText] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [manualDate, setManualDate] = useState<ISODate>(() => isoDateLocal());
  const [manualAccountId, setManualAccountId] = useState<JournalId | "">("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [accountMenu, setAccountMenu] = useState<null | "csv" | "manual">(null);
  const csvAccountRef = useRef<HTMLDivElement>(null);
  const manualAccountRef = useRef<HTMLDivElement>(null);
  /** When CSV has Account values that don’t auto-match, map each normalized label → workspace account. */
  const [manualAccountByNorm, setManualAccountByNorm] = useState<Record<string, JournalId | "">>({});

  /** Blown / closed / archived : pas d’import ciblé sur ces comptes. */
  const importEligibleAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => !a.isArchived && (a.status === "active" || a.status === "passed")
      ),
    [accounts]
  );

  const netPnlCents = parseResult?.rows.reduce((s, r) => s + r.pnlCents, 0) ?? 0;
  const rowCount = parseResult?.rows.length ?? 0;

  const csvAccountRouting = useMemo(() => {
    if (!parseResult) return null;
    const accountColumn = parseResult.detected.accountColumn;
    const { uniqueNormalized, displayByNormalized } = collectCsvAccountLabelsFromRows(parseResult.rows);
    if (!accountColumn || uniqueNormalized.length === 0) {
      return { mode: "legacy" as const };
    }
    const resolution = resolveCsvImportAccountLabels(
      uniqueNormalized,
      displayByNormalized,
      importEligibleAccounts,
      labelByAccountId
    );
    return {
      mode: "multi" as const,
      accountColumn,
      uniqueNormalized,
      displayByNormalized,
      resolution,
    };
  }, [parseResult, importEligibleAccounts, labelByAccountId]);

  const importCsvDisabled =
    !parseResult ||
    (csvAccountRouting?.mode === "legacy" && !accountId) ||
    (csvAccountRouting?.mode === "multi" && csvAccountRouting.resolution.kind === "ambiguous") ||
    (csvAccountRouting?.mode === "multi" &&
      csvAccountRouting.resolution.kind === "unmatched" &&
      csvAccountRouting.resolution.unmatchedNormalized.some((n) => !manualAccountByNorm[n]));

  const resetFileState = useCallback(() => {
    setParseResult(null);
    setParseError(null);
    setFileLabel(null);
    setCsvRawText(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const resetManualState = useCallback(() => {
    setManualDate(isoDateLocal());
    setManualAccountId("");
    setManualAmount("");
    setManualNote("");
    setManualError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFileState();
      resetManualState();
      setAccountId("");
      setTab("csv");
      setAccountMenu(null);
      setManualAccountByNorm({});
    }
  }, [open, resetFileState, resetManualState]);

  useEffect(() => {
    setAccountMenu(null);
  }, [tab]);

  useEffect(() => {
    if (!open) return;
    if (accountId && !importEligibleAccounts.some((a) => a.id === accountId)) setAccountId("");
    if (manualAccountId && !importEligibleAccounts.some((a) => a.id === manualAccountId)) {
      setManualAccountId("");
    }
  }, [open, accountId, manualAccountId, importEligibleAccounts]);

  useEffect(() => {
    if (!open || !accountMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const ref = accountMenu === "csv" ? csvAccountRef.current : manualAccountRef.current;
      if (ref && !ref.contains(e.target as Node)) setAccountMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, accountMenu]);

  useEffect(() => {
    if (!csvRawText) {
      setParseResult(null);
      setParseError(null);
      return;
    }
    const res = parseBrokerTradeCsv(csvRawText);
    if (!res.ok) {
      setParseError(res.error);
      setParseResult(null);
      return;
    }
    setParseError(null);
    setParseResult(res);
  }, [csvRawText]);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setFileLabel(file.name);
    const text = await file.text();
    setCsvRawText(text);
  }, []);

  const commitCsv = useCallback(() => {
    if (!parseResult) return;
    const fallbackAccountId = accountId || importEligibleAccounts[0]?.id;
    if (!fallbackAccountId) return;

    let added: StoredTrade[];
    if (!csvAccountRouting || csvAccountRouting.mode === "legacy") {
      if (!accountId) return;
      added = buildStoredTradesFromCsv(parseResult.rows, accountId);
    } else {
      const { resolution, uniqueNormalized } = csvAccountRouting;
      if (resolution.kind === "ambiguous") return;

      let labelToAccountId: Map<string, JournalId>;
      if (resolution.kind === "resolved") {
        labelToAccountId = resolution.labelToAccountId;
      } else if (resolution.kind === "unmatched") {
        labelToAccountId = applyManualAccountMappings(resolution.partialLabelToAccountId, manualAccountByNorm);
        for (const n of uniqueNormalized) {
          if (!labelToAccountId.has(n)) return;
        }
      } else {
        return;
      }
      added = buildStoredTradesFromCsvWithResolver(parseResult.rows, labelToAccountId, fallbackAccountId);
    }

    const modalDailyPnlByDate = Object.fromEntries(aggregateDailyPnlCents(parseResult.rows)) as Record<
      ISODate,
      number
    >;
    const modalNetCents = parseResult.rows.reduce((s, r) => s + r.pnlCents, 0);
    onCommitImport(added, {
      modalNetCents,
      modalDailyPnlByDate,
      importedBroker: parseResult.detected.broker,
    });
    onClose();
  }, [
    parseResult,
    accountId,
    csvAccountRouting,
    manualAccountByNorm,
    importEligibleAccounts,
    onCommitImport,
    onClose,
  ]);

  const commitManual = useCallback(() => {
    setManualError(null);
    if (!manualAccountId) {
      setManualError("Select an account.");
      return;
    }
    const cents = parseUsdInputToCents(manualAmount);
    if (cents === null) {
      setManualError("Enter a valid P&L amount (e.g. 125.50 or -50).");
      return;
    }
    onCommitManualPnl({
      accountId: manualAccountId,
      date: manualDate,
      pnlCents: cents,
      note: manualNote.trim() || undefined,
    });
    onClose();
  }, [manualAccountId, manualAmount, manualDate, manualNote, onCommitManualPnl, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-trades-pnl-title"
    >
      <button
        type="button"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`relative z-[1] my-auto flex w-full max-w-lg max-h-[min(calc(100dvh-2rem),100vh)] flex-col rounded-xl border border-white/12 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] ${
          accountMenu ? "overflow-visible" : "overflow-hidden"
        }`}
        onKeyDown={(e) => {
          if (tab === "manual") handleModalEnterToSubmit(e, commitManual, false);
          else if (tab === "csv") handleModalEnterToSubmit(e, commitCsv, importCsvDisabled);
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="journal-trades-pnl-title" className="text-lg font-semibold tracking-tight text-white">
              {"Trades & P&L"}
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Upload a CSV, add a manual P&amp;L line, or connect a broker (soon).
            </p>
            {lastImportAt ? (
              <p className="mt-2 text-xs text-white/30">
                Last CSV import: {new Date(lastImportAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="shrink-0 px-5 pt-4">
          <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setTab("auto")}
              className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-semibold transition sm:gap-2 sm:px-3 sm:text-xs ${
                tab === "auto"
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              <LightningIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Auto</span>
              <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-emerald-300/90 sm:px-2 sm:text-[9px]">
                Soon
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("csv")}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                tab === "csv"
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              <UploadSmIcon className="h-3.5 w-3.5 shrink-0" />
              CSV
            </button>
            <button
              type="button"
              onClick={() => setTab("manual")}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                tab === "manual"
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              <PenIcon className="h-3.5 w-3.5 shrink-0" />
              Manual
            </button>
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 overscroll-y-contain px-5 py-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] ${
            accountMenu ? "relative z-[50] overflow-visible" : "overflow-y-auto"
          }`}
        >
          {tab === "auto" ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/45">
              Automatic broker sync is coming soon.
            </p>
          ) : tab === "manual" ? (
            <div className="space-y-4">
              <p className="text-xs text-white/45">
                Add a single daily P&amp;L line to the workspace (Calendar and Accounts). This is separate from CSV
                imports and is not overwritten when you sync trades.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="manual-pnl-date" className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Date
                </label>
                <input
                  id="manual-pnl-date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value as ISODate)}
                  className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <CalendarStyleAccountSelect
                label="Account"
                value={manualAccountId}
                onValueChange={(id) => setManualAccountId(id)}
                accounts={importEligibleAccounts}
                labelByAccountId={labelByAccountId}
                menuOpen={accountMenu === "manual"}
                onMenuOpenChange={(o) => setAccountMenu(o ? "manual" : null)}
                containerRef={manualAccountRef}
              />
              <p className="text-[11px] text-white/35">
                Only Active and Passed accounts — blown accounts are hidden.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="manual-pnl-amount" className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Net P&amp;L (USD)
                </label>
                <input
                  id="manual-pnl-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="e.g. 125.50 or -50"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="manual-pnl-note" className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Note (optional)
                </label>
                <input
                  id="manual-pnl-note"
                  type="text"
                  placeholder="Session recap, adjustment…"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
              {manualError ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90">
                  {manualError}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              <div
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 transition ${
                  dragOver
                    ? "border-sky-400/50 bg-sky-500/10"
                    : "border-white/20 bg-black/30 hover:border-white/30 hover:bg-white/[0.04]"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) void onFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileRef.current?.click();
                  }
                }}
              >
                <UploadLgIcon className="h-10 w-10 text-white/35" />
                <p className="text-sm font-semibold text-white">Drop your CSV file here</p>
                <p className="text-xs text-white/40">or click to browse</p>
                {fileLabel ? (
                  <p className="mt-1 text-[11px] text-sky-300/80">{fileLabel}</p>
                ) : null}
              </div>

              <div className="text-xs text-white/40">
                <p className="font-medium text-white/50">Supported formats:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 pl-0.5">
                  <li>NinjaTrader</li>
                  <li>Tradovate</li>
                  <li>Rithmic</li>
                </ul>
              </div>

              {csvAccountRouting?.mode === "multi" ? (
                <div className="space-y-3">
                  {csvAccountRouting.resolution.kind === "ambiguous" ? (
                    <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100/90">
                      Several workspace accounts match the CSV name &quot;{csvAccountRouting.resolution.csvDisplay}&quot;. Set a{" "}
                      <span className="font-medium text-white/95">unique Platform account name</span> on Accounts for each, then try again.
                    </div>
                  ) : csvAccountRouting.resolution.kind === "unmatched" ? (
                    <div className="space-y-3">
                      <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/85">
                        Some values in <span className="font-medium text-amber-50/95">{csvAccountRouting.accountColumn}</span> don&apos;t match a workspace account yet. Map each broker name to an account, or rename accounts under{" "}
                        <span className="font-medium text-white/90">Platform account name</span> on the Accounts page to match your platform exactly.
                      </p>
                      {csvAccountRouting.resolution.unmatchedNormalized.map((norm) => {
                        const csvLabel =
                          csvAccountRouting.displayByNormalized.get(norm) ?? norm;
                        return (
                          <div key={norm} className="space-y-1.5">
                            <span className="block text-[11px] font-medium uppercase tracking-wider text-white/40">
                              CSV: {csvLabel}
                            </span>
                            <select
                              value={manualAccountByNorm[norm] ?? ""}
                              onChange={(e) => {
                                const v = e.target.value as JournalId | "";
                                setManualAccountByNorm((prev) => ({ ...prev, [norm]: v }));
                              }}
                              className={`${SELECT_CLASS} w-full`}
                            >
                              <option value="">— Select workspace account —</option>
                              {importEligibleAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {resolveAccountDisplayName(a, labelByAccountId)}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <p className="text-[11px] text-white/35">
                    Only <span className="text-white/50">Active</span> and{" "}
                    <span className="text-white/50">Passed</span> accounts — blown accounts are hidden.
                  </p>
                </div>
              ) : (
                <>
                  <CalendarStyleAccountSelect
                    label="Target account"
                    value={accountId}
                    onValueChange={(id) => setAccountId(id)}
                    accounts={importEligibleAccounts}
                    labelByAccountId={labelByAccountId}
                    menuOpen={accountMenu === "csv"}
                    onMenuOpenChange={(o) => setAccountMenu(o ? "csv" : null)}
                    containerRef={csvAccountRef}
                  />
                  <p className="text-[11px] text-white/35">
                    Only <span className="text-white/50">Active</span> and{" "}
                    <span className="text-white/50">Passed</span> accounts — blown accounts are hidden.
                  </p>
                </>
              )}

              {parseError ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100/90">
                  {parseError}
                </div>
              ) : null}

              {parseResult ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    Net P&amp;L (this file)
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold tabular-nums ${
                      netPnlCents > 0 ? "text-emerald-400" : netPnlCents < 0 ? "text-rose-400" : "text-white/70"
                    }`}
                  >
                    {formatUsdSignedNet(netPnlCents)}
                  </p>
                  <p className="mt-1 text-xs text-white/40">{rowCount} trade{rowCount === 1 ? "" : "s"} detected</p>
                  {parseResult.warnings.length > 0 ? (
                    <details className="mt-2 text-[11px] text-amber-200/70">
                      <summary className="cursor-pointer select-none text-amber-200/80 hover:text-amber-100/90">
                        {parseResult.warnings.length} warning{parseResult.warnings.length === 1 ? "" : "s"} — open for
                        detail
                      </summary>
                      <ul className="mt-2 max-h-36 list-inside list-disc space-y-0.5 overflow-y-auto text-left font-mono text-[10px] text-amber-100/55 [scrollbar-width:thin]">
                        {parseResult.warnings.map((w, i) => (
                          <li key={i} className="break-words">
                            {w}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="relative z-0 flex shrink-0 justify-end gap-2 border-t border-white/10 bg-[#0d1117] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/14 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          {tab === "csv" ? (
            <button
              type="button"
              disabled={importCsvDisabled}
              onClick={commitCsv}
              className="rounded-xl border border-white/20 bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 transition enabled:hover:from-sky-400 enabled:hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Import
            </button>
          ) : null}
          {tab === "manual" ? (
            <button
              type="button"
              onClick={commitManual}
              className="rounded-xl border border-white/20 bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 transition hover:from-sky-400 hover:to-sky-500"
            >
              Save entry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        fill="currentColor"
      />
    </svg>
  );
}

function UploadSmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 4v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m8 9 4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UploadLgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M24 10v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m14 20 10-8 10 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 38h32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
