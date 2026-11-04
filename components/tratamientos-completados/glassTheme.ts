/**
 * Shared Dark Glassmorphism tokens for the /tratamientos-completados module.
 *
 * The class strings live here as full literals so Tailwind's scanner can see
 * them. Do not build them dynamically — `bg-${color}` style strings are purged.
 *
 * Two flavours exist:
 * - `*_DARK` variants are unconditional and are used inside modals, which are
 *   always rendered as a dark floating overlay regardless of the app theme.
 * - The remaining tokens are theme aware: the light theme gets the same glass
 *   language on a light palette, the dark theme gets the dark glass palette.
 */

export const GLASS_PANEL =
  'rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-2xl dark:shadow-black/50';

export const GLASS_PANEL_DARK =
  'rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl shadow-black/50 backdrop-blur-xl';

export const GLASS_INSET =
  'rounded-lg border border-slate-200 bg-slate-50/80 text-slate-900 placeholder-slate-400 transition focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder-slate-500 dark:backdrop-blur-md';

export const GLASS_INSET_DARK =
  'rounded-lg border border-slate-800 bg-slate-950/60 text-slate-100 placeholder-slate-500 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 dark:backdrop-blur-md';

export const GLASS_DIVIDER = 'border-slate-200/80 dark:border-slate-800/80';

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-950/50 backdrop-blur-sm transition-all hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-700 backdrop-blur-sm transition-all hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700/80';

export const BTN_SECONDARY_DARK =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 backdrop-blur-sm transition-all hover:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_DANGER =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-950/50 backdrop-blur-sm transition-all hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_GHOST_DARK =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50';

export const GLASS_SUMMARY =
  'rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3 text-sm font-semibold text-emerald-400';

export const GLASS_FIELD_LABEL = 'mb-1 block text-sm font-medium text-slate-300';

export const GLASS_HEADING = 'text-lg font-semibold text-white';

export const GLASS_MUTED = 'text-sm text-slate-400';
