"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isJournalOtherPropFirm } from "@/lib/journal/journal-other-firm";
import { nowIso, type JournalAction } from "@/lib/journal/reducer";
import type { JournalAccount, OtherFirmRulesText } from "@/lib/journal/types";

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38";
const inputClass =
  "mt-1.5 min-h-[2.75rem] w-full resize-y rounded-lg border border-white/10 bg-black/45 px-2.5 py-2 text-sm font-medium leading-snug text-white/88 outline-none transition placeholder:text-white/28 focus:border-sky-400/45 focus:ring-1 focus:ring-sky-400/18";

type FieldKey = keyof OtherFirmRulesText;

/** Merge legacy keys from older builds. */
function readOtherRulesMap(account: JournalAccount): Record<FieldKey, string> {
  const o = account.rulesSnapshot.otherRulesText as
    | (OtherFirmRulesText & { maxDrawdown?: string; profitTargetOrBuffer?: string })
    | undefined;
  return {
    drawdown: o?.drawdown ?? o?.maxDrawdown ?? "",
    dll: o?.dll ?? "",
    profitTarget: o?.profitTarget ?? o?.profitTargetOrBuffer ?? "",
    buffer: o?.buffer ?? "",
  };
}

function buildOtherRulesPayload(
  evalCtx: boolean,
  m: Record<FieldKey, string>
): OtherFirmRulesText {
  if (evalCtx) {
    return {
      drawdown: m.drawdown,
      dll: m.dll,
      profitTarget: m.profitTarget,
    };
  }
  return {
    drawdown: m.drawdown,
    dll: m.dll,
    buffer: m.buffer,
  };
}

function EditableCell({
  label,
  field,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  field: FieldKey;
  value: string;
  placeholder: string;
  onCommit: (field: FieldKey, next: string) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  return (
    <div>
      <p className={labelClass}>{label}</p>
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onCommit(field, local);
        }}
        placeholder={placeholder}
        rows={3}
        spellCheck={false}
        className={inputClass}
      />
    </div>
  );
}

export const isOtherPropFirm = isJournalOtherPropFirm;

export function OtherAccountRulesSection({
  account,
  dispatch,
  evalCtx,
  profitTargetFromCompare,
  bufferDisplay,
  maxDdDisplay,
}: {
  account: JournalAccount;
  dispatch: (a: JournalAction) => void;
  evalCtx: boolean;
  profitTargetFromCompare: string;
  bufferDisplay: string;
  maxDdDisplay: string;
}) {
  const display = useMemo(() => readOtherRulesMap(account), [account]);

  const ddPlaceholder = maxDdDisplay || "—";

  const commit = useCallback(
    (field: FieldKey, next: string) => {
      const prev = display[field] ?? "";
      if (next === prev) return;
      const nextMap = { ...display, [field]: next };
      dispatch({
        type: "account/upsert",
        payload: {
          ...account,
          rulesSnapshot: {
            ...account.rulesSnapshot,
            otherRulesText: buildOtherRulesPayload(evalCtx, nextMap),
          },
          updatedAt: nowIso(),
        },
      });
    },
    [account, dispatch, display, evalCtx]
  );

  const ph = (s: string) => s || "—";

  const evalRows: { label: string; field: FieldKey; placeholder: string }[] = [
    { label: "Drawdown", field: "drawdown", placeholder: ph(ddPlaceholder) },
    { label: "DLL", field: "dll", placeholder: ph("—") },
    {
      label: "Profit target (USD)",
      field: "profitTarget",
      placeholder: ph(profitTargetFromCompare || "1500 or $1,500"),
    },
  ];

  const fundedRows: { label: string; field: FieldKey; placeholder: string }[] = [
    { label: "Drawdown", field: "drawdown", placeholder: ph(ddPlaceholder) },
    { label: "DLL", field: "dll", placeholder: ph("—") },
    {
      label: "Buffer (USD)",
      field: "buffer",
      placeholder: ph(bufferDisplay || "2100 or $2,100"),
    },
  ];

  const rows = evalCtx ? evalRows : fundedRows;

  return (
    <>
      <p className="col-span-full text-[11px] leading-snug text-white/45">
        Amounts for profit target and buffer are in US dollars (plain number or $).
      </p>
      <div className="col-span-full flex flex-col gap-4 sm:hidden">
        {rows.map((row) => (
          <EditableCell
            key={row.field}
            label={row.label}
            field={row.field}
            value={display[row.field] ?? ""}
            placeholder={row.placeholder}
            onCommit={commit}
          />
        ))}
      </div>
      <div className="col-span-full hidden gap-x-8 gap-y-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <EditableCell
            key={`grid-${row.field}`}
            label={row.label}
            field={row.field}
            value={display[row.field] ?? ""}
            placeholder={row.placeholder}
            onCommit={commit}
          />
        ))}
      </div>
    </>
  );
}
