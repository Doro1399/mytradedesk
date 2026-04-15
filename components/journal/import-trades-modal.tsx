"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  aggregateDailyPnlCents,
  buildStoredTradesFromCsv,
  parseBrokerTradeCsv,
  type CsvAmbiguousSlashDateOrder,
  type CsvTradeParseSuccess,
  type ParseBrokerTradeCsvOptions,
} from "@/lib/journal/csv-trade-import";
import type { CsvImportModalSnapshot, StoredTrade } from "@/lib/journal/trades-storage";
import { isoDateLocal } from "@/lib/journal/local-iso-date";
import type { ISODate, JournalAccount, JournalId } from "@/lib/journal/types";
import { resolveAccountDisplayName } from "@/components/journal/account-auto-labels";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

/** Match journal calendar filter triggers. */
const SELECT_CLASS =
  "rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-[13px] text-white/85 outline-none transition focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25";

/** Match calendar dropdown panel (modal needs higher z-index). */
const FILTER_MENU_PANEL =
  "absolute left-0 right-0 top-[calc(100%+6px)] z-[250] rounded-xl border border-white/12 bg-[#0c1018] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]";

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
      <div ref={containerRef} className="relative">
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

/** Parses typed dollar amounts (e.g. -50.25, 1200, $1,200.50, or 0,5 for decimals). */
function parseUsdInputToCents(raw: string): number | null {
  let s = raw.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (!s) return null;
  const commaDec = /^-?\d+,\d+$/.test(s);
  if (commaDec) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
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
  const [ambiguousSlashChoice, setAmbiguousSlashChoice] = useState<"auto" | CsvAmbiguousSlashDateOrder>("auto");
  const [dragOver, setDragOver] = useState(false);

  const [manualDate, setManualDate] = useState<ISODate>(() => isoDateLocal());
  const [manualAccountId, setManualAccountId] = useState<JournalId | "">("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [accountMenu, setAccountMenu] = useState<null | "csv" | "manual">(null);
  const csvAccountRef = useRef<HTMLDivElement>(null);
  const manualAccountRef = useRef<HTMLDivElement>(null);

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

  const resetFileState = useCallback(() => {
    setParseResult(null);
    setParseError(null);
    setFileLabel(null);
    setCsvRawText(null);
    setAmbiguousSlashChoice("auto");
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
    const opts: ParseBrokerTradeCsvOptions | undefined =
      ambiguousSlashChoice === "auto" ? undefined : { ambiguousSlashDateOrder: ambiguousSlashChoice };
    const res = parseBrokerTradeCsv(csvRawText, opts);
    if (!res.ok) {
      setParseError(res.error);
      setParseResult(null);
      return;
    }
    setParseError(null);
    setParseResult(res);
  }, [csvRawText, ambiguousSlashChoice]);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setFileLabel(file.name);
    const text = await file.text();
    setCsvRawText(text);
  }, []);

  const commitCsv = useCallback(() => {
    if (!parseResult || !accountId) return;
    const added = buildStoredTradesFromCsv(parseResult.rows, accountId);
    const modalDailyPnlByDate = Object.fromEntries(aggregateDailyPnlCents(parseResult.rows)) as Record<
      ISODate,
      number
    >;
    const modalNetCents = parseResult.rows.reduce((s, r) => s + r.pnlCents, 0);
    onCommitImport(added, { modalNetCents, modalDailyPnlByDate });
    onClose();
  }, [parseResult, accountId, onCommitImport, onClose]);

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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-trades-pnl-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-[1] w-full max-w-lg overflow-visible rounded-xl border border-white/12 bg-[#0d1117] shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)]"
        onKeyDown={(e) => {
          if (tab === "manual") handleModalEnterToSubmit(e, commitManual, false);
          else if (tab === "csv") handleModalEnterToSubmit(e, commitCsv, !parseResult || !accountId);
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
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

        <div className="px-5 pt-4">
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

        <div className="px-5 py-4">
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

              {fileLabel ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="csv-ambiguous-slash-dates"
                    className="block text-[11px] font-medium uppercase tracking-wider text-white/40"
                  >
                    Slash dates like 10/03/2026
                  </label>
                  <select
                    id="csv-ambiguous-slash-dates"
                    value={ambiguousSlashChoice}
                    onChange={(e) =>
                      setAmbiguousSlashChoice(e.target.value as "auto" | CsvAmbiguousSlashDateOrder)
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="auto">Auto (file hints + browser — en-US = month first)</option>
                    <option value="dmy">Day first — EU / Rithmic (10 Mar)</option>
                    <option value="mdy">Month first — US (3 Oct)</option>
                  </select>
                </div>
              ) : null}

              <div className="text-xs text-white/40">
                <p className="font-medium text-white/50">Supported formats:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 pl-0.5">
                  <li>NinjaTrader — Trade Performance Report</li>
                  <li>Tradovate — Order History Export</li>
                  <li>Lucid / Rithmic exports (date, net P/L, …)</li>
                </ul>
                <p className="mt-2 text-[11px] text-white/35">
                  P&amp;L: NinjaTrader grid — <span className="text-white/50">Profit</span> minus{" "}
                  <span className="text-white/50">Loss</span> when both exist (losses often only in Loss). Otherwise{" "}
                  <span className="text-white/50">Net profit</span> / <span className="text-white/50">Net P/L</span>.
                </p>
              </div>

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
                  <p className="mt-1 text-[10px] text-white/30">
                    Columns: <span className="text-white/45">{parseResult.detected.pnlColumn}</span>
                    {" · "}
                    <span className="text-white/45">{parseResult.detected.dateColumn}</span>
                  </p>
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

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
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
              disabled={!parseResult || !accountId}
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
