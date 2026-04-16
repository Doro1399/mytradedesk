"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Navbar from "@/components/navbar";
import {
  LUCID_EVAL_CHILD_IDS,
  LUCID_FUNDED_CHILD_IDS,
  LUCID_NAV,
  lucidFlatSectionIds,
  lucidNormalizeScrollSectionId,
  lucidOpenGroupForSection,
  type LucidEvalChildId,
  type LucidFundedChildId,
} from "@/lib/lucid-guide-nav";
import { LucidGuideBody } from "./lucid-guide-body";
import { DiscordIcon } from "./discord-icon";

/** Near top of document: nav stays on Overview (submenus stay folded) unless URL hash targets a section. */
const TOP_SCROLL_ANCHOR_MAX_PX = 80;

/**
 * Viewport Y (px from top): last section whose top is at or above this line is "active"
 * in the fallback path. Slightly above mid-view (~32% vh) so the spy triggers a bit
 * earlier while reading.
 */
function lucidGuideActivationLinePx(): number {
  const vh =
    typeof window !== "undefined" ? window.innerHeight : 800;
  return Math.max(120, Math.min(400, Math.round(vh * 0.32)));
}

/** Sidebar: compact pill (Discord, FAQ) — journal glass + sky hover. */
const BTN_SIDEBAR_PILL =
  "inline-flex shrink-0 items-center justify-center gap-0.5 rounded-xl border border-white/14 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-2 py-1.5 text-[10px] font-semibold leading-none text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-400/35 hover:from-sky-500/15 hover:to-sky-950/25";

/** Sidebar: primary outbound link — slightly larger for full label. */
const BTN_SIDEBAR_WEB =
  "inline-flex min-w-0 shrink items-center justify-center gap-1 rounded-xl border border-white/14 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-2.5 py-1.5 text-[11px] font-semibold leading-tight text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-400/35 hover:from-sky-500/15 hover:to-sky-950/25";

const TRUSTPILOT_GREEN = "#00b67a";

const TRUSTPILOT_STAR_PATH =
  "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z";

function TrustpilotStarFull({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={14}
      height={14}
      aria-hidden
    >
      <path fill="currentColor" d={TRUSTPILOT_STAR_PATH} />
    </svg>
  );
}

function TrustpilotStarHalf() {
  return (
    <span
      className="relative inline-block h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-3.5 w-3.5 text-white/20"
        viewBox="0 0 24 24"
      >
        <path fill="currentColor" d={TRUSTPILOT_STAR_PATH} />
      </svg>
      <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
        <svg
          className="h-3.5 w-3.5 text-[#00b67a]"
          viewBox="0 0 24 24"
        >
          <path fill="currentColor" d={TRUSTPILOT_STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

function LucidTrustpilotLink() {
  return (
    <a
      href="https://www.trustpilot.com/review/lucidtrading.com"
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-1.5 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md py-1 -mx-1 px-1 transition hover:bg-white/[0.04]"
      aria-label="Lucid Trading on Trustpilot — 4.7 out of 5, 2,633 reviews (opens in a new tab)"
    >
      <span
        className="text-[15px] font-semibold tabular-nums"
        style={{ color: TRUSTPILOT_GREEN }}
      >
        4.7
      </span>
      <span className="inline-flex items-center gap-px">
        <TrustpilotStarFull className="shrink-0 text-[#00b67a]" />
        <TrustpilotStarFull className="shrink-0 text-[#00b67a]" />
        <TrustpilotStarFull className="shrink-0 text-[#00b67a]" />
        <TrustpilotStarFull className="shrink-0 text-[#00b67a]" />
        <TrustpilotStarHalf />
      </span>
      <span className="text-[12px] leading-none text-white/45 transition group-hover:text-white/65">
        2,633 reviews
      </span>
    </a>
  );
}

function LucidBrandingAndActions({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Link
        href="/compare"
        className="group/back inline-flex w-fit items-center gap-2 rounded-xl border border-white/14 bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-sky-400/40 hover:from-sky-500/15 hover:to-sky-950/25 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 shrink-0 text-sky-400/90 transition group-hover/back:-translate-x-0.5 group-hover/back:text-sky-300"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Compare
      </Link>
      <div className="mt-4 flex items-start gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/12 bg-white/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Image
            src="/firms/lucid.png"
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-white">
            Lucid Trading
          </h1>
          <LucidTrustpilotLink />
        </div>
      </div>
      {/*
        Full-width row below logo + title so buttons center on the sidebar column,
        not only in the narrow text column beside the logo.
      */}
      <div className="mt-3 -ml-[10px] flex w-full flex-wrap items-center justify-center gap-1">
        <a
          href="https://discord.com/invite/lucidtrading"
          target="_blank"
          rel="noreferrer"
          className={`${BTN_SIDEBAR_PILL} px-2`}
          aria-label="Official Discord"
        >
          <DiscordIcon className="h-3.5 w-3.5" />
        </a>
        <a
          href="https://lucidtrading.com/"
          target="_blank"
          rel="noreferrer"
          className={BTN_SIDEBAR_WEB}
        >
          Official website
          <span className="shrink-0 text-white/45" aria-hidden>
            ↗
          </span>
        </a>
        <a
          href="https://support.lucidtrading.com/en/"
          target="_blank"
          rel="noreferrer"
          className={`${BTN_SIDEBAR_PILL} min-w-0`}
          aria-label="FAQ"
        >
          FAQ
          <span className="text-white/45" aria-hidden>
            ↗
          </span>
        </a>
      </div>
    </div>
  );
}

function MobileNav({
  activeId,
  evaluationPickId,
  fundedPickId,
  onNavigate,
}: {
  activeId: string;
  evaluationPickId: LucidEvalChildId;
  fundedPickId: LucidFundedChildId;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="mb-10 lg:hidden">
      <details className="group rounded-[22px] border border-white/10 bg-[#0a0f18]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/85 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            On this page
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 text-white/45 transition-transform group-open:rotate-180"
              aria-hidden
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <nav className="border-t border-white/10 px-2 py-2">
          <ul className="space-y-1">
            {LUCID_NAV.map((item) => {
              const sectionActive =
                item.id === "evaluations"
                  ? activeId === "evaluations"
                  : item.id === "funded-account"
                    ? activeId === "funded-account"
                    : activeId === item.id ||
                      Boolean(item.children?.some((c) => c.id === activeId));
              const subActive = (cid: string) => {
                if (item.id === "evaluations") {
                  return activeId === "evaluations" && evaluationPickId === cid;
                }
                if (item.id === "funded-account") {
                  return activeId === "funded-account" && fundedPickId === cid;
                }
                if (item.id === "good-to-know") {
                  return (
                    activeId === "good-to-know" && cid === "gtk-promotions"
                  );
                }
                return activeId === cid;
              };
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-[13px] transition-[color,background-color] duration-200 ease-out ${
                      sectionActive
                        ? "bg-white/[0.1] text-white"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                  >
                    {item.label}
                  </button>
                  {item.children ? (
                    <ul className="ml-2 border-l border-white/[0.06] pl-2 pb-1">
                      {item.children.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => onNavigate(c.id)}
                            className={`w-full rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors duration-200 ease-out ${
                              subActive(c.id)
                                ? "text-white"
                                : "text-white/45 hover:text-white/80"
                            }`}
                          >
                            {c.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>
      </details>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-white/45 transition-transform duration-300 ease-out ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Submenu drawer: height + fade in `globals.css` (`.lucid-nav-submenu-*`). */
function LucidNavSubmenuDrawer({
  groupId,
  expandedGroupId,
  exitingGroupId,
  onExitComplete,
  children,
}: {
  groupId: string;
  expandedGroupId: string | null;
  exitingGroupId: string | null;
  onExitComplete: (id: string) => void;
  children: ReactNode;
}) {
  const show =
    expandedGroupId === groupId || exitingGroupId === groupId;
  const isExit = exitingGroupId === groupId;

  useEffect(() => {
    if (!isExit) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    onExitComplete(groupId);
  }, [isExit, groupId, onExitComplete]);

  return (
    <div
      className={`lucid-nav-submenu-grid grid overflow-hidden ${
        show ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        {show ? (
          <div
            className={
              isExit ? "lucid-nav-submenu-exit" : "lucid-nav-submenu-enter"
            }
            onAnimationEnd={(e) => {
              if (!isExit) return;
              if (e.target !== e.currentTarget) return;
              onExitComplete(groupId);
            }}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SidebarNavItem({
  item,
  index,
  activeId,
  evaluationPickId,
  fundedPickId,
  onNavigate,
  expandedGroupId,
  exitingGroupId,
  onExitComplete,
}: {
  item: (typeof LUCID_NAV)[number];
  index: number;
  activeId: string;
  evaluationPickId: LucidEvalChildId;
  fundedPickId: LucidFundedChildId;
  onNavigate: (id: string) => void;
  expandedGroupId: string | null;
  exitingGroupId: string | null;
  onExitComplete: (id: string) => void;
}) {
  const num = String(index + 1).padStart(2, "0");

  if (item.children?.length) {
    const parentActive =
      item.id === "evaluations"
        ? activeId === "evaluations"
        : item.id === "funded-account"
          ? activeId === "funded-account"
          : activeId === item.id ||
            Boolean(item.children.some((c) => c.id === activeId));
    const subLinkActive = (childId: string) => {
      if (item.id === "evaluations") {
        return activeId === "evaluations" && evaluationPickId === childId;
      }
      if (item.id === "funded-account") {
        return activeId === "funded-account" && fundedPickId === childId;
      }
      if (item.id === "good-to-know") {
        return (
          activeId === "good-to-know" && childId === "gtk-promotions"
        );
      }
      return activeId === childId;
    };
    const showSub =
      expandedGroupId === item.id || exitingGroupId === item.id;

    return (
      <div className="rounded-xl border border-transparent">
        <button
          type="button"
          onClick={() => onNavigate(item.id)}
          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-[color,background-color] duration-200 ease-out ${
            parentActive
              ? "bg-white/[0.1] text-white"
              : "text-white/45 hover:bg-white/[0.05] hover:text-white/85"
          }`}
        >
          <span
            className={`w-6 shrink-0 tabular-nums text-[11px] transition-colors duration-200 ease-out ${
              parentActive ? "text-white/50" : "text-white/35"
            }`}
          >
            {num}
          </span>
          <span className="min-w-0 flex-1 font-medium">{item.label}</span>
          <Chevron open={showSub} />
        </button>
        <LucidNavSubmenuDrawer
          groupId={item.id}
          expandedGroupId={expandedGroupId}
          exitingGroupId={exitingGroupId}
          onExitComplete={onExitComplete}
        >
          <ul className="lucid-nav-submenu-list space-y-0.5 pb-1.5 pl-[2.85rem] pt-1">
            {item.children.map((child) => {
              const active = subLinkActive(child.id);
              return (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(child.id)}
                    className={`lucid-nav-sublink block w-full rounded-lg border-l-2 py-1.5 pl-2.5 pr-1 text-left text-[13px] font-semibold tracking-tight transition-[color,background-color,border-color] duration-200 ease-out ${
                      active
                        ? "border-sky-400/60 bg-sky-500/10 text-white shadow-[0_0_16px_rgba(56,189,248,0.08)]"
                        : "border-transparent text-white/45 hover:text-white/85"
                    }`}
                  >
                    {child.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </LucidNavSubmenuDrawer>
      </div>
    );
  }

  const active = activeId === item.id;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.id)}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-[color,background-color] duration-200 ease-out ${
        active
          ? "bg-white/[0.1] text-white"
          : "text-white/45 hover:bg-white/[0.05] hover:text-white/85"
      }`}
    >
      <span
        className={`w-6 shrink-0 tabular-nums text-[11px] transition-colors duration-200 ease-out ${
          active ? "text-white/50" : "text-white/35"
        }`}
      >
        {num}
      </span>
      <span className="font-medium">{item.label}</span>
    </button>
  );
}

function ReadingProgress({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="border-t border-white/10 bg-[#070b13]/98 px-3 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600/95 to-sky-400/85 transition-[width] duration-150 ease-out shadow-[0_0_12px_rgba(56,189,248,0.35)]"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className="shrink-0 tabular-nums text-[11px] font-medium text-white/55">
          {clamped}%
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-white/38">Reading progress</p>
    </div>
  );
}

function Sidebar({
  activeId,
  evaluationPickId,
  fundedPickId,
  onNavigate,
  expandedGroupId,
  exitingGroupId,
  onExitComplete,
  readPercent,
}: {
  activeId: string;
  evaluationPickId: LucidEvalChildId;
  fundedPickId: LucidFundedChildId;
  onNavigate: (id: string) => void;
  expandedGroupId: string | null;
  exitingGroupId: string | null;
  onExitComplete: (id: string) => void;
  readPercent: number;
}) {
  return (
    <aside className="hidden border-r border-white/10 bg-[#070b13] lg:sticky lg:top-0 lg:flex lg:h-full lg:max-h-full lg:min-h-0 lg:w-[clamp(220px,22vw,300px)] lg:shrink-0 lg:self-start lg:flex-col lg:overflow-hidden xl:w-[clamp(240px,20vw,320px)]">
      {/*
        Same shell as Compare filters: full viewport height from the top, nav
        scrolls inside; reading progress pinned to the bottom of the column.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-5 pl-3 pr-3 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/12">
          <LucidBrandingAndActions />
          <div
            className="my-5 h-px shrink-0 bg-white/10"
            role="separator"
            aria-hidden
          />
          <p className="px-1 pb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-400/75">
            On this page
          </p>
          {LUCID_NAV.map((item, index) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              index={index}
              activeId={activeId}
              evaluationPickId={evaluationPickId}
              fundedPickId={fundedPickId}
              onNavigate={onNavigate}
              expandedGroupId={expandedGroupId}
              exitingGroupId={exitingGroupId}
              onExitComplete={onExitComplete}
            />
          ))}
        </div>
        <ReadingProgress percent={readPercent} />
      </div>
    </aside>
  );
}

export function LucidGuidePage() {
  const [activeId, setActiveId] = useState("overview");
  /** Pro / Flex / Direct: click-only in sidebar; Pro when entering Evaluation block. */
  const [evaluationPickId, setEvaluationPickId] =
    useState<LucidEvalChildId>("evaluations-pro");
  /** Same pattern for Funded account. */
  const [fundedPickId, setFundedPickId] =
    useState<LucidFundedChildId>("funded-pro");
  /** At most one nav group shows its submenu; mirrors Compare rules row. */
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  /** Group playing the close (drawer + exit keyframe) animation. */
  const [exitingGroupId, setExitingGroupId] = useState<string | null>(null);
  const [readPercent, setReadPercent] = useState(0);

  const ids = useMemo(() => lucidFlatSectionIds(), []);

  const clearNavExit = useCallback((id: string) => {
    setExitingGroupId((current) => (current === id ? null : current));
  }, []);

  const prevScrollSectionRef = useRef<string>(activeId);
  /** Skip pick reset when user (or hash) jumps straight to Pro/Flex/Direct. */
  const skipEvalPickResetRef = useRef(false);
  const skipFundedPickResetRef = useRef(false);
  /**
   * After picking Funded Pro/Flex/Direct from the in-page segment, scroll-spy can
   * still report `evaluations` while the viewport is in that block — hold `funded-account`
   * as active until the reader scrolls into the funded zone or leaves.
   */
  const fundedNavHoldRef = useRef(false);

  useEffect(() => {
    const prev = prevScrollSectionRef.current;
    if (activeId === "evaluations" && prev !== "evaluations") {
      if (!skipEvalPickResetRef.current) {
        setEvaluationPickId("evaluations-pro");
      }
      skipEvalPickResetRef.current = false;
    }
    if (activeId === "funded-account" && prev !== "funded-account") {
      if (!skipFundedPickResetRef.current) {
        setFundedPickId("funded-pro");
      }
      skipFundedPickResetRef.current = false;
    }
    prevScrollSectionRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const next = lucidOpenGroupForSection(activeId);
    setExpandedGroupId((prev) => {
      if (prev === next) return prev;
      if (prev !== null && next !== null && prev !== next) {
        setExitingGroupId(prev);
      } else if (prev !== null && next === null) {
        setExitingGroupId(prev);
      } else {
        setExitingGroupId(null);
      }
      return next;
    });
  }, [activeId]);

  const onNavigate = useCallback((id: string) => {
    if ((LUCID_FUNDED_CHILD_IDS as readonly string[]).includes(id)) {
      fundedNavHoldRef.current = true;
    } else {
      fundedNavHoldRef.current = false;
    }

    if (id === "evaluations") {
      setEvaluationPickId("evaluations-pro");
    }
    if (id === "funded-account") {
      setFundedPickId("funded-pro");
    }
    if ((LUCID_EVAL_CHILD_IDS as readonly string[]).includes(id)) {
      skipEvalPickResetRef.current = true;
      setEvaluationPickId(id as LucidEvalChildId);
    }
    if ((LUCID_FUNDED_CHILD_IDS as readonly string[]).includes(id)) {
      skipFundedPickResetRef.current = true;
      setFundedPickId(id as LucidFundedChildId);
    }
    setActiveId(lucidNormalizeScrollSectionId(id));

    /** Evaluation types: align viewport with the detail block under the matrix (not the section title). */
    if (
      id === "evaluations" ||
      (LUCID_EVAL_CHILD_IDS as readonly string[]).includes(id)
    ) {
      requestAnimationFrame(() => {
        document
          .getElementById("evaluations-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /**
   * In-page Pro/Flex/Direct segments: update picks + nav active section only — no
   * scrollIntoView (avoids jump + scroll-spy fighting; sidebar still syncs).
   */
  const onSegmentPick = useCallback((id: string) => {
    if ((LUCID_EVAL_CHILD_IDS as readonly string[]).includes(id)) {
      fundedNavHoldRef.current = false;
      skipEvalPickResetRef.current = true;
      setEvaluationPickId(id as LucidEvalChildId);
      setActiveId("evaluations");
      return;
    }
    if ((LUCID_FUNDED_CHILD_IDS as readonly string[]).includes(id)) {
      fundedNavHoldRef.current = true;
      skipFundedPickResetRef.current = true;
      setFundedPickId(id as LucidFundedChildId);
      setActiveId("funded-account");
      return;
    }
  }, []);

  /**
   * Scroll-spy: reading band (upper–mid viewport), near-bottom → FAQ, then line fallback.
   * gtk-* normalizes to `good-to-know` so other groups’ submenus don’t steal focus.
   */
  const computeActiveSectionId = useCallback((): string => {
    const scrollY = window.scrollY;
    const hashId = window.location.hash.slice(1);

    if (scrollY <= TOP_SCROLL_ANCHOR_MAX_PX) {
      if (!hashId || !ids.includes(hashId)) return "overview";
      return lucidNormalizeScrollSectionId(hashId);
    }

    const doc = document.documentElement;
    const vh = window.innerHeight;
    const scrollBottom = scrollY + vh;
    const maxScroll = Math.max(0, doc.scrollHeight - 1);
    if (scrollBottom >= maxScroll - 32) {
      const faqEl = document.getElementById("faq");
      if (faqEl) {
        const fr = faqEl.getBoundingClientRect();
        if (fr.bottom > 0 && fr.top < vh) {
          return "faq";
        }
      }
    }

    const bandTop = Math.round(vh * 0.1);
    const bandBottom = Math.round(vh * 0.38);
    const bandMatches: string[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > bandTop && r.top < bandBottom) {
        bandMatches.push(id);
      }
    }
    if (bandMatches.length > 0) {
      let bandHit = bandMatches[bandMatches.length - 1]!;
      if (bandMatches.includes("evaluations") && bandMatches.includes("trading-rules")) {
        bandHit = "evaluations";
      }
      return lucidNormalizeScrollSectionId(bandHit);
    }

    const line = lucidGuideActivationLinePx();
    let lastCrossing = ids[0] ?? "overview";
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= line) {
        lastCrossing = id;
      }
    }
    return lucidNormalizeScrollSectionId(lastCrossing);
  }, [ids]);

  const scrollRafRef = useRef<number | null>(null);

  /** Deep link + same-tab hash changes: scroll, activate nav, sync Pro/Flex/Direct picks. */
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash || !ids.includes(hash)) return;
      if ((LUCID_EVAL_CHILD_IDS as readonly string[]).includes(hash)) {
        skipEvalPickResetRef.current = true;
        setEvaluationPickId(hash as LucidEvalChildId);
      }
      if ((LUCID_FUNDED_CHILD_IDS as readonly string[]).includes(hash)) {
        skipFundedPickResetRef.current = true;
        setFundedPickId(hash as LucidFundedChildId);
      }
      setActiveId(lucidNormalizeScrollSectionId(hash));
      const scrollEl =
        hash === "evaluations" ||
        (LUCID_EVAL_CHILD_IDS as readonly string[]).includes(hash)
          ? "evaluations-detail"
          : hash;
      requestAnimationFrame(() => {
        document.getElementById(scrollEl)?.scrollIntoView({ block: "start" });
      });
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [ids]);

  useEffect(() => {
    const flush = () => {
      scrollRafRef.current = null;
      const next = computeActiveSectionId();
      let resolved = next;
      if (fundedNavHoldRef.current) {
        if (next === "funded-account") {
          fundedNavHoldRef.current = false;
          resolved = "funded-account";
        } else if (next === "evaluations") {
          resolved = "funded-account";
        } else {
          fundedNavHoldRef.current = false;
          resolved = next;
        }
      }
      setActiveId((prev) => (prev === resolved ? prev : resolved));

      const doc = document.documentElement;
      const scrollTop = window.scrollY;
      const height = doc.scrollHeight - window.innerHeight;
      const pct =
        height <= 0 ? 100 : Math.round((scrollTop / height) * 100);
      setReadPercent(Math.min(100, Math.max(0, pct)));
    };

    const scheduleFlush = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = requestAnimationFrame(flush);
    };

    window.addEventListener("scroll", scheduleFlush, { passive: true });
    window.addEventListener("resize", scheduleFlush, { passive: true });
    flush();

    return () => {
      window.removeEventListener("scroll", scheduleFlush);
      window.removeEventListener("resize", scheduleFlush);
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [computeActiveSectionId]);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-black text-white">
      {/*
        lg+: sidebar aligns with the top of the viewport like Compare filters;
        Navbar only spans the article column.
      */}
      <div className="flex min-h-0 w-full max-w-[100vw] flex-1 flex-col lg:flex-row">
        <Sidebar
          activeId={activeId}
          evaluationPickId={evaluationPickId}
          fundedPickId={fundedPickId}
          onNavigate={onNavigate}
          expandedGroupId={expandedGroupId}
          exitingGroupId={exitingGroupId}
          onExitComplete={clearNavExit}
          readPercent={readPercent}
        />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[6%] top-32 h-56 w-56 rounded-full bg-blue-700/14 blur-3xl" />
            <div className="absolute right-[8%] top-48 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute bottom-[20%] left-1/4 h-48 w-48 rounded-full bg-blue-600/8 blur-3xl" />
          </div>
          <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
          <Navbar />
          <div className="min-w-0 flex-1 px-4 py-10 sm:px-8 lg:py-14 lg:pl-10 lg:pr-12 xl:pl-14 xl:pr-20">
            <div className="lg:hidden">
              <LucidBrandingAndActions className="mb-8" />
            </div>
            <MobileNav
              activeId={activeId}
              evaluationPickId={evaluationPickId}
              fundedPickId={fundedPickId}
              onNavigate={onNavigate}
            />
            <LucidGuideBody
              evaluationPickId={evaluationPickId}
              fundedPickId={fundedPickId}
              onSegmentPick={onSegmentPick}
            />
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
