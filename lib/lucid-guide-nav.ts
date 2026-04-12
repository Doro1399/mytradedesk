/**
 * Lucid Trading guide — nav tree for sidebar, mobile menu, scroll-spy anchors.
 * Template for other firm pages: same shape (sections + optional children).
 */

export const LUCID_GUIDE_SLUG = "lucid-trading";

export type LucidNavItem = {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
};

export const LUCID_NAV: LucidNavItem[] = [
  { id: "overview", label: "Overview" },
  {
    id: "evaluations",
    label: "Evaluation types",
    children: [
      { id: "evaluations-pro", label: "Pro" },
      { id: "evaluations-flex", label: "Flex" },
      { id: "evaluations-direct", label: "Direct" },
    ],
  },
  {
    id: "trading-rules",
    label: "Trading rules",
    children: [
      { id: "rules-drawdown", label: "Drawdown" },
      { id: "rules-consistency", label: "Consistency" },
      { id: "rules-news", label: "News" },
      { id: "rules-hours", label: "Trading hours" },
      { id: "rules-accounts", label: "Multiple accounts" },
    ],
  },
  {
    id: "trading-styles",
    label: "Trading styles",
    children: [
      { id: "styles-scalping", label: "Scalping" },
      { id: "styles-bots", label: "Automated trading" },
      { id: "styles-dca", label: "DCA & risk" },
      { id: "styles-summary", label: "Summary" },
    ],
  },
  {
    id: "platforms",
    label: "Platforms",
    children: [
      { id: "platforms-data", label: "Data feeds" },
      { id: "platforms-license", label: "Provided platforms" },
    ],
  },
  {
    id: "instruments-commissions",
    label: "Instruments & commissions",
    children: [
      { id: "inst-instruments", label: "Instruments" },
      { id: "inst-commissions", label: "Commissions" },
      { id: "inst-max-size", label: "Max Size" },
    ],
  },
  {
    id: "funded-account",
    label: "Funded account",
    children: [
      { id: "funded-pro", label: "Pro" },
      { id: "funded-flex", label: "Flex" },
      { id: "funded-direct", label: "Direct" },
    ],
  },
  {
    id: "our-opinion",
    label: "Our opinion",
    children: [
      { id: "opinion-pros-cons", label: "Pros & cons" },
      { id: "opinion-audience", label: "Who Lucid Trading suits" },
      { id: "opinion-score", label: "Score" },
    ],
  },
  { id: "faq", label: "FAQ" },
];

export function lucidFlatSectionIds(): string[] {
  const ids: string[] = [];
  for (const item of LUCID_NAV) {
    ids.push(item.id);
    if (item.children) {
      for (const c of item.children) ids.push(c.id);
    }
  }
  return ids;
}

/** Returns parent nav id if `id` is a child anchor, else null. */
export function lucidParentNavId(
  sectionId: string
): string | null {
  for (const item of LUCID_NAV) {
    if (item.children?.some((c) => c.id === sectionId)) return item.id;
  }
  return null;
}

/**
 * Which sidebar group should show its submenu for this section anchor.
 * Child anchors map to their parent; a parent section id opens its own group.
 */
export function lucidOpenGroupForSection(sectionId: string): string | null {
  const parent = lucidParentNavId(sectionId);
  if (parent) return parent;
  for (const item of LUCID_NAV) {
    if (item.id === sectionId && item.children?.length) return item.id;
  }
  return null;
}

/** Pro / Flex / Direct under Evaluation types — sidebar selection is click-driven, not scroll. */
export const LUCID_EVAL_CHILD_IDS = [
  "evaluations-pro",
  "evaluations-flex",
  "evaluations-direct",
] as const;
export type LucidEvalChildId = (typeof LUCID_EVAL_CHILD_IDS)[number];

/** Pro / Flex / Direct under Funded account — same pattern as evaluations. */
export const LUCID_FUNDED_CHILD_IDS = [
  "funded-pro",
  "funded-flex",
  "funded-direct",
] as const;
export type LucidFundedChildId = (typeof LUCID_FUNDED_CHILD_IDS)[number];

/** Good to know — scroll-spy collapses to parent so the sidebar stays on this group + Promotions highlight only. */
export const LUCID_GTK_CHILD_IDS = [
  "gtk-promotions",
  "gtk-support",
  "gtk-inactivity",
  "gtk-countries",
] as const;
export type LucidGtkChildId = (typeof LUCID_GTK_CHILD_IDS)[number];

const evalChildSet = new Set<string>(LUCID_EVAL_CHILD_IDS);
const fundedChildSet = new Set<string>(LUCID_FUNDED_CHILD_IDS);
const gtkChildSet = new Set<string>(LUCID_GTK_CHILD_IDS);

/**
 * Collapse scroll-spy to parent section for evaluation/funded triplets so
 * sidebar children stay on user-picked Pro/Flex/Direct while reading the block.
 */
export function lucidNormalizeScrollSectionId(sectionId: string): string {
  if (evalChildSet.has(sectionId)) return "evaluations";
  if (fundedChildSet.has(sectionId)) return "funded-account";
  if (gtkChildSet.has(sectionId)) return "good-to-know";
  return sectionId;
}
