// ============================================================
// BatchKit — Design Tokens
// Edit this file to customize colors, app name, and status styles.
// Everything in the UI derives from these values.
// ============================================================

export const tokens = {
  // App identity — rename here, updates everywhere
  appName: "BatchKit",
  appDescription: "An app for managing batch orders and buy rounds for group buys and preorders",

  // ──────────────────────────────────────────────────────────
  // Status badge variants — Tailwind class strings
  // These are the ONLY color elements in the UI (everything
  // else is monochrome zinc). Adjust colors here to restyle
  // all status badges at once.
  // ──────────────────────────────────────────────────────────
  status: {
    open: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    locked: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    submitted: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    shipped: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    awaiting: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  } as const,

  // ──────────────────────────────────────────────────────────
  // MOQ Progress Bar
  // progressFill:    bar color before MOQ is met
  // progressFillMet: bar color once MOQ is reached (green)
  // progressBg:      track background
  // ──────────────────────────────────────────────────────────
  progressFill: "bg-zinc-900 dark:bg-zinc-100",
  progressFillMet: "bg-emerald-500",
  progressBg: "bg-zinc-200 dark:bg-zinc-700",

  // ──────────────────────────────────────────────────────────
  // Typography — Tailwind class strings
  // Change font family in tailwind.config.ts (--font-sans)
  // ──────────────────────────────────────────────────────────
  type: {
    pageTitle: "text-xl font-semibold",
    sectionLabel: "text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
    body: "text-sm",
    mono: "font-mono tabular-nums", // for kit counts and dollar amounts
    muted: "text-sm text-zinc-500 dark:text-zinc-400",
  },
} as const;

export type BuyRoundStatus = keyof typeof tokens.status;

// ──────────────────────────────────────────────────────────────
// Utility: map buy_round status → badge variant classes
// Usage: <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", statusBadge(round.status))}>
// ──────────────────────────────────────────────────────────────
export function statusBadge(status: string): string {
  return tokens.status[status as BuyRoundStatus] ?? tokens.status.awaiting;
}
