/**
 * Chat pane wallpaper.
 *
 * The "default" wallpaper mimics WhatsApp's native chat background: a subtle,
 * low-contrast doodle pattern instead of a flat color. It's an inline SVG data
 * URI (no external request, cached with the app shell, works offline).
 *
 * A custom wallpaper (user-uploaded image) is applied in chat/chatSettings and
 * ChatPane via wallpaper_type === 'custom'.
 */

const DOODLE = `<g fill="none" stroke="#c9d6dd" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"><path d="M7 8v4M5 10h4"/><circle cx="23" cy="9" r="2"/><path d="M9 24l4 4 3-5"/><circle cx="29" cy="25" r="1.6"/><path d="M7 30h8"/><path d="M20 2v5M22.5 4.5h-5"/><path d="M6 17c0-2 1.5-3.5 3.5-3.5S13 15 13 17s-1.5 3.5-3.5 3.5S6 19 6 17z"/></g>`;

/** WhatsApp-style default wallpaper (theme-neutral, tiles 60px). */
export const DEFAULT_WALLPAPER = {
  light: `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">${DOODLE}</svg>`
  )}")`,
};
