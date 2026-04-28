"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
} from "react";
import type { AccountType, JournalAccount } from "@/lib/journal/types";
import {
  ALL_FIRM_OPTIONS,
  OTHER_FIRM_NAME,
  PROGRAM_KIND_OPTIONS,
  getSizeOptions,
  getSuggestedActivationFeeUsd,
  getTypeOptions,
  programKindToAccountType,
  type ProgramKind,
} from "@/lib/journal/firm-program-options";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity] min-h-[min(28rem,80dvh)] max-h-[min(96dvh,840px)]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";

const inputClass =
  "w-full rounded-lg border border-white/12 bg-black/40 px-2.5 py-1.5 text-[12px] text-white/88 outline-none transition placeholder:text-white/35 focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/25";

const labelClass = "text-[10px] font-medium uppercase tracking-wider text-white/40";

const cancelBtnClass =
  "rounded-[10px] border border-white/10 bg-zinc-900/55 px-3 py-1.5 text-[12px] font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75";

const primaryBtnClass =
  "rounded-[10px] border border-sky-400/40 bg-sky-500/90 px-3 py-1.5 text-[12px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.18)] transition hover:bg-sky-400 hover:border-sky-300/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

/** Pill colors for the existing-account list (Eval / Funded / Live). */
function accountTypePillClass(t: AccountType): string {
  if (t === "live") {
    return "border-sky-400/30 bg-sky-500/[0.12] text-sky-300/95";
  }
  if (t === "funded") {
    return "border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-300/95";
  }
  return "border-amber-400/30 bg-amber-500/[0.10] text-amber-300/90";
}

function accountTypePillLabel(t: AccountType): string {
  if (t === "challenge") return "Eval";
  if (t === "funded") return "Funded";
  return "Live";
}

/** Pill colors for the Create new programme chips (Eval / Funded / Direct). */
function programChipClass(p: ProgramKind, selected: boolean): string {
  if (!selected) {
    return "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:bg-white/[0.04]";
  }
  if (p === "direct") {
    return "border-sky-400/30 bg-sky-500/[0.12] text-sky-300/95 ring-1 ring-inset ring-sky-400/40";
  }
  if (p === "funded") {
    return "border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-300/95 ring-1 ring-inset ring-emerald-400/40";
  }
  return "border-amber-400/30 bg-amber-500/[0.10] text-amber-300/90 ring-1 ring-inset ring-amber-400/40";
}

export type RithmicCreateJournalAccountPayload = {
  accountName: string;
  firmName: string;
  /** Compare-row "type" (e.g. "LucidPro", "Tradeify Growth", "Tradeify Select Daily"). Optional for "Other". */
  programName?: string;
  /** Wizard programme (Eval / Funded / Direct). */
  program: ProgramKind;
  /** Resolved journal account type derived from `program`. */
  accountType: AccountType;
  sizeLabel: string;
  startDate: string;
  /** Funded only — activation fee paid (USD). */
  activationFeeUsd: number | null;
  /** Eval & Funded — evaluation fee paid (USD). Stored as `challenge_fee` in the journal. */
  challengeFeeUsd: number | null;
  /** Direct only — instant funding / live broker fee (USD). Stored as `activation_fee` in the journal. */
  directFeeUsd: number | null;
  notes?: string;
};

export type RithmicLinkAccountModalProps = {
  open: boolean;
  /** Friendly Rithmic connection label, shown in the header. */
  connectionName: string;
  /** The Rithmic account being linked. */
  rithmicAccount: {
    accountId: string;
    accountName: string;
    accountCurrency?: string;
    fcmId?: string;
    ibId?: string;
  } | null;
  /** Journal accounts the user can pick from (already filtered to "linkable"). */
  availableJournalAccounts: JournalAccount[];
  onClose: () => void;
  /** Link the Rithmic account to an existing journal account. */
  onLinkExisting: (journalAccountId: string) => void;
  /** Create a new journal account with the form values, then link to it. */
  onCreateAndLink: (payload: RithmicCreateJournalAccountPayload) => void;
};

type Tab = "link" | "create";

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLooseUsd(v: string): number | null {
  const cleaned = v.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function RithmicLinkAccountModal({
  open,
  connectionName,
  rithmicAccount,
  availableJournalAccounts,
  onClose,
  onLinkExisting,
  onCreateAndLink,
}: RithmicLinkAccountModalProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [tab, setTab] = useState<Tab>("create");

  const [selectedJournalId, setSelectedJournalId] = useState<string>("");

  const [accountName, setAccountName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [program, setProgram] = useState<ProgramKind>("eval");
  const [typeName, setTypeName] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [activationFee, setActivationFee] = useState("");
  const [challengeFee, setChallengeFee] = useState("");
  const [directFee, setDirectFee] = useState("");
  const [notes, setNotes] = useState("");

  /** Track whether the user manually edited each fee — auto-suggest only stops there. */
  const userEditedActivationFeeRef = useRef(false);
  const userEditedChallengeFeeRef = useRef(false);
  const userEditedDirectFeeRef = useRef(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setTab(availableJournalAccounts.length > 0 ? "link" : "create");
      setSelectedJournalId("");
      setAccountName(rithmicAccount?.accountName ?? "");
      setFirmName("");
      setProgram("eval");
      setTypeName("");
      setSizeLabel("");
      setStartDate(todayIso());
      setActivationFee("");
      setChallengeFee("");
      setDirectFee("");
      setNotes("");
      userEditedActivationFeeRef.current = false;
      userEditedChallengeFeeRef.current = false;
      userEditedDirectFeeRef.current = false;
    } else if (mounted) {
      setClosing(true);
    }
  }, [open, mounted, rithmicAccount, availableJournalAccounts.length]);

  useEffect(() => {
    if (!closing || !mounted) return;
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, MODAL_EXIT_UNMOUNT_MS);
    return () => window.clearTimeout(t);
  }, [closing, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose]);

  /** Account types (compare row `accountName`) for the selected firm + programme. */
  const typeOptions = useMemo(
    () => getTypeOptions(firmName, program),
    [firmName, program]
  );

  /** Sizes for the selected firm + programme + type. */
  const sizeOptions = useMemo(
    () => getSizeOptions(firmName, program, typeName),
    [firmName, program, typeName]
  );

  // Reset type when firm or programme changes if the current type is no longer valid.
  useEffect(() => {
    if (!typeOptions.length) {
      if (typeName) setTypeName("");
      return;
    }
    if (!typeOptions.includes(typeName)) {
      setTypeName(typeOptions[0] ?? "");
    }
  }, [typeOptions, typeName]);

  // Reset size when firm/programme/type changes if the current size is no longer valid.
  useEffect(() => {
    if (!sizeOptions.length) {
      // For "Other" firm we keep whatever the user typed.
      return;
    }
    if (!sizeOptions.includes(sizeLabel)) {
      setSizeLabel(sizeOptions[0] ?? "");
    }
  }, [sizeOptions, sizeLabel]);

  // Auto-suggest the relevant fee from compare data (only when the user hasn't typed one).
  useEffect(() => {
    const suggested = getSuggestedActivationFeeUsd(firmName, program, typeName, sizeLabel);
    const value = suggested == null ? "" : String(suggested);
    if (program === "direct") {
      if (!userEditedDirectFeeRef.current) setDirectFee(value);
    } else if (program === "funded") {
      if (!userEditedActivationFeeRef.current) setActivationFee(value);
    } else {
      // Eval — no activation fee suggestion (eval cost typed manually as evaluation fee).
      if (!userEditedActivationFeeRef.current) setActivationFee("");
    }
  }, [firmName, program, typeName, sizeLabel]);

  const sortedAvailable = useMemo(
    () =>
      availableJournalAccounts.slice().sort((a, b) => {
        const fa = a.propFirm.name.toLowerCase();
        const fb = b.propFirm.name.toLowerCase();
        if (fa !== fb) return fa.localeCompare(fb);
        return a.sizeLabel.localeCompare(b.sizeLabel);
      }),
    [availableJournalAccounts]
  );

  const isOtherFirm = firmName === OTHER_FIRM_NAME;
  const isDirect = program === "direct";
  const isFunded = program === "funded";
  const isEval = program === "eval";

  /** Funded-only activation fee. */
  const showActivationFee = isFunded;
  /** Eval & Funded — fee paid for the evaluation phase. */
  const showEvaluationFee = isEval || isFunded;
  /** Direct-only — single fee (no separate activation/eval). */
  const showDirectFee = isDirect;

  const canSubmitCreate =
    accountName.trim().length > 0 &&
    firmName.trim().length > 0 &&
    sizeLabel.trim().length > 0 &&
    startDate.length > 0 &&
    // For known firms, the user must select a type; for "Other" it's free-form.
    (isOtherFirm || typeOptions.length === 0 || typeName.length > 0);

  const canSubmitLink = selectedJournalId.length > 0;

  // Defensive: if mounted with no account target, close gracefully (effect avoids setState-in-render).
  useEffect(() => {
    if (mounted && !rithmicAccount) {
      onClose();
    }
  }, [mounted, rithmicAccount, onClose]);

  if (!mounted || !rithmicAccount) {
    return null;
  }

  const backdropAnim = closing ? "compare-modal-backdrop--out" : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  const onPanelAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!closing) return;
    if (!String(e.animationName).includes("compare-modal-panel-out")) return;
    setMounted(false);
    setClosing(false);
  };

  function handleSubmitLink(e: FormEvent) {
    e.preventDefault();
    if (!canSubmitLink) return;
    onLinkExisting(selectedJournalId);
    onClose();
  }

  function handleSubmitCreate(e: FormEvent) {
    e.preventDefault();
    if (!canSubmitCreate) return;
    const payload: RithmicCreateJournalAccountPayload = {
      accountName: accountName.trim(),
      firmName: firmName.trim(),
      programName: typeName.trim() || undefined,
      program,
      accountType: programKindToAccountType(program),
      sizeLabel: sizeLabel.trim(),
      startDate,
      activationFeeUsd: showActivationFee ? parseLooseUsd(activationFee) : null,
      challengeFeeUsd: showEvaluationFee ? parseLooseUsd(challengeFee) : null,
      directFeeUsd: showDirectFee ? parseLooseUsd(directFee) : null,
      notes: notes.trim() || undefined,
    };
    onCreateAndLink(payload);
    onClose();
  }

  return (
    <div
      className={`fixed inset-0 z-[170] flex items-center justify-center p-4 ${backdropAnim}`}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-xl backdrop-saturate-150"
        onClick={onClose}
      />
      <div
        className={`${panelClass} ${panelAnim}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rithmic-link-modal-title"
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <div className="min-w-0">
            <h2
              id="rithmic-link-modal-title"
              className="truncate text-[15px] font-semibold tracking-tight text-white/92"
            >
              Link Rithmic account
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-white/45">
              <span className="text-white/65">{connectionName}</span>
              <span className="text-white/30"> · </span>
              <span className="text-white/75">{rithmicAccount.accountName}</span>
              <span className="text-white/30"> · </span>
              <span className="text-white/45">{rithmicAccount.accountId}</span>
              {rithmicAccount.accountCurrency ? (
                <>
                  <span className="text-white/30"> · </span>
                  <span className="text-white/45">{rithmicAccount.accountCurrency}</span>
                </>
              ) : null}
            </p>
          </div>
          <button type="button" className={headerBtnClass} aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="flex shrink-0 gap-1 border-b border-white/[0.06] px-5 pt-2">
          <button
            type="button"
            onClick={() => setTab("link")}
            disabled={availableJournalAccounts.length === 0}
            className={`rounded-t-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              tab === "link"
                ? "bg-white/[0.06] text-white/92"
                : "text-white/55 hover:text-white/85"
            } disabled:cursor-not-allowed disabled:opacity-40`}
            title={
              availableJournalAccounts.length === 0
                ? "No unlinked journal account available — create one instead."
                : undefined
            }
          >
            Link to existing
            <span className="ml-1.5 rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/60">
              {availableJournalAccounts.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`rounded-t-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              tab === "create"
                ? "bg-white/[0.06] text-white/92"
                : "text-white/55 hover:text-white/85"
            }`}
          >
            Create new
          </button>
        </div>

        {tab === "link" ? (
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4"
            onSubmit={handleSubmitLink}
          >
            <p className="mb-2 shrink-0 text-[11px] text-white/55">
              Pick the journal account that this Rithmic account corresponds to. Only journal
              accounts that aren&apos;t already linked to a Rithmic account are listed.
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sortedAvailable.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-center text-[12px] text-white/45">
                  No unlinked journal account available. Switch to{" "}
                  <span className="text-white/70">Create new</span>.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {sortedAvailable.map((acc) => {
                    const checked = selectedJournalId === acc.id;
                    return (
                      <li key={acc.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition ${
                            checked
                              ? "border-sky-400/40 bg-sky-500/[0.08]"
                              : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="journal-account"
                            className="mt-[3px] h-3.5 w-3.5 shrink-0 cursor-pointer accent-sky-500"
                            checked={checked}
                            onChange={() => setSelectedJournalId(acc.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                              <span className="font-semibold text-white/88">
                                {acc.propFirm.name}
                              </span>
                              <span className="text-white/55">{acc.sizeLabel}</span>
                              <span
                                className={`rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${accountTypePillClass(
                                  acc.accountType
                                )}`}
                              >
                                {accountTypePillLabel(acc.accountType)}
                              </span>
                              {acc.compareProgramName ? (
                                <span className="text-white/45">
                                  {acc.compareProgramName}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-[11px] text-white/40">
                              {acc.displayAccountCode || acc.id}
                              {acc.startDate ? (
                                <>
                                  <span className="text-white/25"> · </span>
                                  <span>started {acc.startDate}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
              <button type="button" onClick={onClose} className={cancelBtnClass}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmitLink} className={primaryBtnClass}>
                Link account
              </button>
            </div>
          </form>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={handleSubmitCreate}
          >
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              <label className="block space-y-1">
                <span className={labelClass}>Account name</span>
                <input
                  className={inputClass}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Julien Zucchero"
                />
              </label>

              <label className="block space-y-1">
                <span className={labelClass}>Prop firm</span>
                <select
                  className={inputClass}
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                >
                  <option value="" disabled>
                    Select a prop firm…
                  </option>
                  {ALL_FIRM_OPTIONS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>

              {/* Program — Eval / Funded / Direct. Lives right after the firm so types/sizes can react. */}
              <fieldset className="space-y-1">
                <legend className={labelClass}>Program</legend>
                <div className="grid grid-cols-3 gap-1.5">
                  {PROGRAM_KIND_OPTIONS.map((opt) => {
                    const selected = program === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-[12px] font-semibold transition ${programChipClass(
                          opt.value,
                          selected
                        )}`}
                      >
                        <input
                          type="radio"
                          name="program-kind"
                          className="sr-only"
                          checked={selected}
                          onChange={() => {
                            setProgram(opt.value);
                            // Re-allow auto-suggest on programme change.
                            userEditedActivationFeeRef.current = false;
                            userEditedDirectFeeRef.current = false;
                          }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Type — compare-row accountName, varies by firm + program. */}
              {!isOtherFirm && typeOptions.length > 0 ? (
                <label className="block space-y-1">
                  <span className={labelClass}>Type</span>
                  <select
                    className={inputClass}
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className={labelClass}>Account size</span>
                  {!isOtherFirm && sizeOptions.length > 0 ? (
                    <select
                      className={inputClass}
                      value={sizeLabel}
                      onChange={(e) => setSizeLabel(e.target.value)}
                    >
                      {sizeOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputClass}
                      value={sizeLabel}
                      onChange={(e) => setSizeLabel(e.target.value)}
                      placeholder="50k"
                    />
                  )}
                </label>
                <label className="block space-y-1">
                  <span className={labelClass}>Start date</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={startDate}
                    max={todayIso()}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="block text-[10px] leading-snug text-white/35">
                    Must not be later than the first trade pulled from Rithmic.
                  </span>
                </label>
              </div>

              {/* Fees — varies by program. */}
              {showDirectFee ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className={labelClass}>Fee (USD)</span>
                    <input
                      className={inputClass}
                      value={directFee}
                      onChange={(e) => {
                        userEditedDirectFeeRef.current = true;
                        setDirectFee(e.target.value);
                      }}
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </label>
                  <div />
                </div>
              ) : showEvaluationFee || showActivationFee ? (
                <div className="grid grid-cols-2 gap-2">
                  {showEvaluationFee ? (
                    <label className="block space-y-1">
                      <span className={labelClass}>Evaluation fee (USD)</span>
                      <input
                        className={inputClass}
                        value={challengeFee}
                        onChange={(e) => {
                          userEditedChallengeFeeRef.current = true;
                          setChallengeFee(e.target.value);
                        }}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </label>
                  ) : (
                    <div />
                  )}
                  {showActivationFee ? (
                    <label className="block space-y-1">
                      <span className={labelClass}>Activation fee (USD)</span>
                      <input
                        className={inputClass}
                        value={activationFee}
                        onChange={(e) => {
                          userEditedActivationFeeRef.current = true;
                          setActivationFee(e.target.value);
                        }}
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </label>
                  ) : (
                    <div />
                  )}
                </div>
              ) : null}

              <label className="block space-y-1">
                <span className={labelClass}>Notes (optional)</span>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything you want to remember about this account."
                />
              </label>

              <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[10px] leading-snug text-white/45">
                Once created, this journal account will be linked to the Rithmic account{" "}
                <span className="text-white/70">{rithmicAccount.accountName}</span>. Future Sync
                now calls will refresh the link, and (later phases) will fill PnL / fills
                automatically into the journal.
              </p>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
              <button type="button" onClick={onClose} className={cancelBtnClass}>
                Cancel
              </button>
              <button type="submit" disabled={!canSubmitCreate} className={primaryBtnClass}>
                Create &amp; link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
