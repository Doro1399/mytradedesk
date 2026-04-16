"use client";

import { useEffect, useState, type AnimationEvent, type FormEvent } from "react";
import { FORMSPREE_FEEDBACK_ACTION } from "@/lib/formspree-feedback";
import { handleModalEnterToSubmit } from "@/components/journal/modal-enter-submit";

const MODAL_EXIT_UNMOUNT_MS = 460;

const panelClass =
  "relative z-10 w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0c0c0e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] [will-change:transform,opacity]";

const headerBtnClass =
  "flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 text-xl leading-none text-white/60 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";

type WorkspaceFeedbackCategory = "bug" | "suggestion" | "other";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Current app path for context in the submission. */
  pagePath: string;
};

export function WorkspaceFeedbackModal({ open, onClose, pagePath }: Props) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [category, setCategory] = useState<WorkspaceFeedbackCategory>("bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (open) {
      setCategory("bug");
      setEmail("");
      setMessage("");
      setSubmitting(false);
      setDone(false);
      setErrorText("");
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!closing || !mounted) return;
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, MODAL_EXIT_UNMOUNT_MS);
    return () => clearTimeout(t);
  }, [closing, mounted]);

  const onPanelAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!closing) return;
    if (!String(e.animationName).includes("compare-modal-panel-out")) return;
    setMounted(false);
    setClosing(false);
  };

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
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

  if (!mounted) return null;

  const backdropAnim = closing ? "compare-modal-backdrop--out" : "compare-modal-backdrop--in";
  const panelAnim = closing ? "compare-modal-panel--out" : "compare-modal-panel--in";

  const subjectLabel =
    category === "bug"
      ? "[MyTradeDesk] Bug report"
      : category === "suggestion"
        ? "[MyTradeDesk] Suggestion"
        : "[MyTradeDesk] Feedback";

  const canSubmit =
    Boolean(FORMSPREE_FEEDBACK_ACTION) && message.trim().length > 0 && !submitting && !done;

  async function submit() {
    if (!FORMSPREE_FEEDBACK_ACTION) {
      setErrorText("Feedback form URL is not configured (NEXT_PUBLIC_FORMSPREE_FEEDBACK_ACTION).");
      return;
    }
    const body = message.trim();
    if (!body) return;

    setSubmitting(true);
    setErrorText("");
    try {
      const payload: Record<string, string> = {
        category,
        message: body,
        page: pagePath,
        _subject: subjectLabel,
      };
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        payload.email = trimmedEmail;
        payload._replyto = trimmedEmail;
      }

      const res = await fetch(FORMSPREE_FEEDBACK_ACTION, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setDone(true);
        return;
      }

      let detail = "Something went wrong. Please try again.";
      try {
        const data = (await res.json()) as { error?: string; errors?: Record<string, string> };
        if (typeof data.error === "string" && data.error) detail = data.error;
        else if (data.errors && typeof data.errors === "object") {
          const first = Object.values(data.errors).find((v) => typeof v === "string" && v);
          if (first) detail = first;
        }
      } catch {
        /* ignore */
      }
      setErrorText(detail);
    } catch {
      setErrorText("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className={`absolute inset-0 bg-black/50 backdrop-blur-xl backdrop-saturate-150 ${backdropAnim}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-feedback-title"
        className={`flex ${panelClass} ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onPanelAnimationEnd}
        onKeyDown={(e) => handleModalEnterToSubmit(e, () => void submit(), !canSubmit)}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 id="workspace-feedback-title" className="text-lg font-semibold tracking-tight text-white/92">
            Send feedback
          </h2>
          <button type="button" onClick={onClose} className={headerBtnClass} aria-label="Close">
            ×
          </button>
        </header>

        {done ? (
          <div className="px-5 py-6">
            <p className="text-[14px] leading-relaxed text-zinc-300">Thank you — we received your message.</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[10px] border border-white/10 bg-sky-600/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-sky-400/50 hover:bg-sky-500"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col" onSubmit={handleSubmit}>
            <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto px-5 py-5">
              <p className="text-[13px] leading-relaxed text-zinc-500">
                Report a bug, share a suggestion, or anything else that helps us improve MyTradeDesk.
              </p>

              <div>
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Type
                </span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "bug" as const, label: "Bug" },
                      { id: "suggestion" as const, label: "Suggestion" },
                      { id: "other" as const, label: "Other" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition ${
                        category === opt.id
                          ? "border-sky-500/55 bg-sky-500/15 text-white"
                          : "border-white/10 text-white/65 hover:border-white/18 hover:bg-white/[0.04]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="feedback-category"
                        value={opt.id}
                        checked={category === opt.id}
                        onChange={() => setCategory(opt.id)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="workspace-feedback-message"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45"
                >
                  Message
                </label>
                <textarea
                  id="workspace-feedback-message"
                  name="message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened or what you would like to see…"
                  className="w-full resize-y rounded-[10px] border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-[14px] text-white/90 placeholder:text-zinc-600 focus:border-sky-500/45 focus:outline-none focus:ring-1 focus:ring-sky-500/35"
                />
              </div>

              <div>
                <label
                  htmlFor="workspace-feedback-email"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45"
                >
                  Email <span className="font-normal normal-case tracking-normal text-zinc-600">(optional)</span>
                </label>
                <input
                  id="workspace-feedback-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-[10px] border border-white/10 bg-zinc-950/80 px-3 py-2.5 text-[14px] text-white/90 placeholder:text-zinc-600 focus:border-sky-500/45 focus:outline-none focus:ring-1 focus:ring-sky-500/35"
                />
              </div>

              {!FORMSPREE_FEEDBACK_ACTION ? (
                <p className="text-[13px] text-amber-400/90">
                  Set{" "}
                  <code className="rounded bg-white/5 px-1 py-0.5 text-[12px] text-amber-200/95">
                    NEXT_PUBLIC_FORMSPREE_FEEDBACK_ACTION
                  </code>{" "}
                  to your Formspree form URL (from{" "}
                  <a
                    href="https://formspree.io/projects/2980602923806883156"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-amber-400/40 underline-offset-2 hover:text-amber-300"
                  >
                    your Formspree project
                  </a>
                  ).
                </p>
              ) : null}

              {errorText ? <p className="text-[13px] text-red-400/95">{errorText}</p> : null}
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[10px] border border-white/10 bg-zinc-900/55 px-4 py-2.5 text-sm font-medium text-white/88 transition hover:border-white/18 hover:bg-zinc-800/75"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-[10px] border border-sky-500/40 bg-sky-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(2,132,199,0.2)] transition enabled:hover:border-sky-400/55 enabled:hover:bg-sky-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-zinc-800/50 disabled:text-white/35"
              >
                {submitting ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
