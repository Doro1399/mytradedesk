"use client";

import { useEffect, useRef } from "react";

/** Same styling as compare page filters (`FilterCheckbox`) and accounts table. */
export function FilterCheckbox({
  checked,
  onCheckedChange,
  indeterminate,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  indeterminate?: boolean;
  "aria-label"?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={() => onCheckedChange()}
        aria-label={ariaLabel}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <span
        className={
          indeterminate
            ? "pointer-events-none col-start-1 row-start-1 flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-white/55 bg-zinc-900/80 shadow-[0_0_12px_rgba(255,255,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.05)] transition duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-500/40"
            : "pointer-events-none col-start-1 row-start-1 flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-zinc-600/40 bg-zinc-950/90 transition duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-500/40 peer-checked:border-white/55 peer-checked:bg-zinc-900/80 peer-checked:shadow-[0_0_12px_rgba(255,255,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.05)]"
        }
        aria-hidden
      >
        {indeterminate ? (
          <span className="h-0.5 w-2.5 rounded-full bg-white/90" />
        ) : (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className={`h-2.5 w-2.5 stroke-white transition duration-150 ${
              checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m2.5 6 2.5 2.5L9.5 3.5" />
          </svg>
        )}
      </span>
    </span>
  );
}
