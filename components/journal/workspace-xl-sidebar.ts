/**
 * Desktop (xl+) sidebar width — keep in sync with {@link JournalWorkspaceShell} aside.
 * Main column uses {@link WORKSPACE_XL_MAIN_COLUMN_PADDING_CLASS} when the rail is `position: fixed`.
 */
export const WORKSPACE_XL_ASIDE_WIDTH_CLASS = "w-[clamp(230px,18vw,290px)]";

/** Offset for main + footer so content clears the fixed left rail (must match aside width). */
export const WORKSPACE_XL_MAIN_COLUMN_PADDING_CLASS = "xl:pl-[clamp(230px,18vw,290px)]";
