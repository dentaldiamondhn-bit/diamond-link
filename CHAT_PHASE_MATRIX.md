# Chat Overhaul — Phase Plan Matrix (Original Plan vs Current Codebase)

Phase-by-phase comparison of the **original phase plan** (Fluxer-inspired chat
for Dental Diamond Link — the 10-phase matrix in `CHAT_OVERHAUL_PLAN.md`) against
what the **current codebase actually delivers**. Every "Current Codebase" cell
below was verified against the repo at commit `833ffc2`; the Phase 8 cell was
updated at commit `7fc4838`.

Status legend: ✅ delivered · ◑ partial · ⏳ not started.

## The matrix

| # | Original Plan (objective & deliverables) | Current Codebase (implemented — evidence) | Status | Remaining gaps |
|---|------------------------------------------|--------------------------------------------|--------|----------------|
| **0 – Preparation** | Tooling, repo structure, baseline metrics. `/src/chat` folder, a small "chat API" wrapper isolating Supabase calls (`getConversations`, `sendMessage`, …), ESLint/Prettier for new chat code, component sandbox | `src/chat/**` suite built; data layer split between `src/chat/repository.ts` (messages/conversations layer) and `src/services/chatService.ts` (queries, unread counts, reads, normalization); Zustand store first used here; ESLint + `tsc --noEmit` verification gate documented and run per commit; feature gate in `app/(auth)/chat/page.tsx` (`NEXT_PUBLIC_USE_NEW_CHAT`, active in `.env`/`.env.local`); file-access tooling (`app/api/logs/route.ts`, `src/lib/file-access-log-store.ts`) | ✅ ~100% | Storybook/component sandbox not adopted (deferred — not needed for this scope) |
| **1 – Layout & Navigation** | Replace monolithic page with split layout: `<Sidebar>` + `<ChatPane>` (`ChatHeader`, `MessageList`, `Composer`); virtualized conversation list; Zustand/Jotai store; responsive breakpoints (sidebar hidden <md); keyboard navigation | `ChatLayout` → `Sidebar` (`ConversationListItem`) + `ChatPane` (`ChatHeader`/`MessageList`/`Composer`); `MessageList` virtualized with **react-window v2** (`List` + `useDynamicRowHeight` + `useListCallbackRef`, scroll-to-latest, `scrollToRow` jump-to-original); Zustand `chatStore`; responsive `<md` sidebar (fixed overlay `md:hidden`, hamburger in header, auto-close on mobile selection); sidebar keyboard nav (Arrow/Home/End + `scrollIntoView`, `role="option" aria-selected`) | ✅ ~100% | – |
| **2 – Message Model & Realtime** | Unified realtime channel (`chat:{convId}`): `message_insert` (with `reactions[]`, `read_by[]`), `message_update`, presence; schema `reactions JSONB`, `read_at`, `delivered_at`; `chat_message_reads` upserts; typing indicator; read-receipt avatar row | `useChatRealtime` — one consolidated hook (messages/conversations/participants/`chat_message_reads`/presence/typing broadcast) with dedupe + soft-delete tombstone guard; `reactions JSONB` + voice metadata (migration `20260827_chat_extensions.sql`); `chat_message_reads` delivered/read upserts (`20260828_chat_message_reads.sql` + **REPLICA IDENTITY FULL** `20260828b` so realtime UPDATEs carry full rows); WhatsApp-style ✓/✓✓ (grey delivered / blue read) + stacked reader avatars on last-mine message; `<TypingIndicator>` with animated dots + named labels ('Name is typing…', 'Name1, Name2 are…', 'Name + N more') | ✅ 100% | `delivered_at` column is minimal (delivery shown via `chat_message_reads`) |
| **3 – Rich-Text Composer** | Lexical editor: bold/italic/underline, lists, code, quote, `@user`, attachment preview, emoji, Ctrl+Enter; optimistic UI; drag-&-drop upload; draft persistence | Lexical composer in `Composer.tsx`: bold/italic/underline, **lists/code** toolbar (`@lexical/list` + `@lexical/code-core`), **@mentions** (`MentionNode` DecoratorNode + `MentionPlugin` dropdown, Arrow/Tab pick), reply-quote bar, **full emoji picker** (1870 emojis, category nav, sticky headers), drag-&-drop + multi-file **staged attachment tray** with **image editor** (crop/tilt/draw — `ChatImageEditor`), **text color + highlight swatches** (`ColorButtons`), `DraftLoader` draft persistence, optimistic send-clear, voice notes; **the composer is also the edit surface** (EditSession swaps Send→green ✓) | ✅ ~100% | Ctrl+Enter explicit handling (Enter is the default send) |
| **4 – Message UI Enhancements** | Grouping, reactions row (optimistic toggle), hover action menu (reply/quote/edit/delete/react-more), inline edit with `edited_at`, quote/reply block + link, read-receipt avatars, `MessageBubble` by type, DB `edited_at`/`reply_to_id`, PATCH messages endpoint | Grouping (avatar once); one reaction per user per message; unified hover action menu **Copy/Forward/Reply/Edit/Delete** with above/below viewport-clamp; **composer-based editing** (amber "Editing message" banner, green ✓ confirm, X/Esc cancels + restores prior draft, formatting preserved via Lexical) with `is_edited` flag; quote/reply preview **with image thumbnail** + click-to-jump + highlight; read-receipt avatars; **ForwardModal** (multi-recipient, natural-language preview) + receiver+sender "Reenviado" badge (`is_forwarded`, migration `20260901`); sidebar last-message previews w/ image thumbnails + snippets; soft-delete tombstones (optimistic delete, never re-add) | ✅ ~100% | `edited_at` timestamp only surfaced as an `is_edited` label; direct `ChatRepository.updateMessage` instead of a PATCH endpoint |
| **5 – Notifications & Push** | Web-Push: VAPID pair, `push_subscriptions` table, `/api/push/subscribe`, SW `push` handler (`data.conversationId` → navigate), background/closed-tab push + Android tray, permission flow on first load | `showBrowserNotification` + NotificationContext (focused-tab only); **no** push subscription plumbing — earlier `20260724_remove_push_subscriptions.sql` even removed the table; `public/sw.js` has no `push` handler or VAPID | ⏳ ~10% | VAPID pair; re-create `push_subscriptions` (RLS); `/api/push/subscribe`; SW `push` handler; send service (web-push); Android tray |
| **6 – PWA & Installability** | Manifest (`start_url /chat/`, standalone), SW cache-first precache of `/chat/*` + `/_next/*`, `beforeinstallprompt` → "Install Chat" button, offline banner ("…messages will send when reconnected") | `public/manifest.json` (standalone + icons) + `public/sw.js` **offline shell precache** — `scripts/build-sw-precache.mjs` runs post-`next build`, writes `public/sw-precache.json` (hashed shell/chat chunks + CSS + manifest/icons), `install` cache-adds into `diamond-link-shell-v1`, `activate` purges old caches (`CACHE_NAME` v9) → cold-offline shell boots; **install prompt** (`useInstallPrompt` + `InstallAppButton` — native dialog, iOS Add-to-Home hint, hides when installed); **offline send queue** (`offlineQueue` localStorage + `useOfflineQueue`: text sends while offline become `local_state:'queued'`, amber per-message pill + pane-top offline banner, flushed in order on reconnect); online/offline listeners | ✅ ~100% | Lighthouse PWA audit (installability + offline) — deferred, optional |
| **7 – Theming / Dark Mode / I18n** | Design tokens (Fluxer `color-system.css` / `message-layout.css`); Lingui (or lightweight i18n) `en`/`es` + `users.locale`; language switcher | Custom typed i18n layer `src/chat/i18n/translations.ts` + `useTranslations.ts` (en/es `TranslationKey`, ~150 keys) + **language selector in `ChatHeader`** (persists to global prefs + `chat-locale` localStorage); **composer spell-check** (`nspell` + en/es Hunspell dictionaries, squiggle + click-for-suggestions + personal dictionary); **design-token system** `app/color-system.css` (`--fd-*` light/dark, `.fd-accent-*` utilities, `.chat-mention` accentized, zero `blue-*` in `src/chat/**`); **per-user customizations** via `chat_settings` + `ChatSettingsPanel` (wallpaper designs/upload per-conversation scope w/ global fallback, my/other bubble colors + reset, text-size sm/md/lg, density, 12 accent swatches, my/other text-color w/ Auto) + `bubbleTextColor` auto-contrast + `chat_settings` migrations | ✅ ~100% | 3 **pending manual Supabase runs** (`20260903_chat_settings_scoped`, `20260903_chat_settings_wallpaper_style`, `20260904_chat_settings_phase7`) — chat-settings saves 400 until applied; Lingui not used (custom layer adopted instead of `/users.locale`) |
| **8 – Accessibility & Polish** | WCAG AA; `aria-live="polite"` new-message region; focus traps (emoji picker, preview, modals, composer toolbar); shortcuts `Ctrl+K`, `Ctrl+Shift+M`, `Alt+Arrows`; skip-to-content; axe/Lighthouse audit | `aria-live="polite"` **new-message live region** (announces incoming messages unless the thread is keyboard-focused; only other live region was the typing indicator); reusable **`useFocusTrap`** hooked into ForwardModal, ChatSettingsPanel, PatientCardPreviewModal, the full reaction picker, the delete-confirm dialog, the hover action menu and the new-chat modal (Tab cycling + Escape + focus restore); **ARIA labels** on all title-only buttons (more-actions w/ `aria-expanded`, reply-jump, media tiles, composer toolbar + voice controls, header search/participants, sidebar); `role="menu"/"menuitem"` action tray, `role="dialog" aria-modal aria-labelledby` on every modal, `role="toolbar"` composer, `aria-pressed` tabs/categories; **skip-to-content** link → `#chat-messages` focus target on the virtualized list; shortcuts **`Ctrl+K`** (search focus), **`Ctrl+Shift+M`** (composer focus), **`Alt+↑/↓`** (conversation nav); **`:focus-visible` accent outline** scoped to `[data-chat-root]` | ◑ ~60% | `axe-core` / Lighthouse a11y audit (manual) + NVDA/VoiceOver screen-reader testing; fix findings |
| **9 – Performance & Bundle Optimization** | `dynamic(() => import(chat/ChatLayout), { ssr:false })`; lazy `RichTextComposer`/virtualized `MessageList` (`React.lazy` + `Suspense`); chat-only CSS chunk; `next/font`; `next-bundle-analyzer` | Message list virtualized (react-window); chat suite + Lexical bundled into the chat page chunk (**no** dynamic import / lazy Lexical / code-split CSS); no bundle analyzer; `next/font`-style self-hosting not applied | ◑ ~20% | `dynamic()` import of the chat suite; lazy `RichTextComposer`/`EmojiPicker`; chat-only CSS chunk; `next-bundle-analyzer` |
| **10 – Final QA, Migration & Roll-out** | Test matrix (Chrome/FF/Safari desktop, mobile Chrome, Android WebView, iOS Safari); verify auth/realtime/uploads/notifications/PWA/offline; one-time migration script (`db:migrate`); feature-flag gradual roll-out; rollback doc + changelog | Feature flag `NEXT_PUBLIC_USE_NEW_CHAT` **active** (`.env`/`.env.local`); migrations written (`database/migrations/…`); headless-Chrome proofing of layouts; soft-delete tombstones + optimistic delete; Vercel production deploy green (`app.dentaldiamondhn.com`) | ◑ ~30% | Cross-browser/device test matrix; offline-queue test; rollback doc; changelog |

## Aggregate estimate

| Original plan total | Original plan via Fluxer-host (`-` UI-heavy phases) | Current delivered | Remaining |
|---------------------|-----------------------------------------------------|-------------------|-----------|
| ≈ 40 person-days | ≈ 15–20 person-days | Phases 0, 1, 2, 3, 4, 6, 7 ≈ ~40 person-days | Phases 5, 9 + Phase 8 audit tail + Phase 10 ≈ **~5–7 person-days** |

## Priority (biggest remaining user-facing wins)

1. **Phase 5 – Push notifications** — the largest gap / highest value: messages on
   closed tab + Android tray. (Notable: `push_subscriptions` was even *removed*
   earlier by `20260724_remove_push_subscriptions.sql`, so this is greenfield
   again.)
2. **Phase 9 – Bundle splitting** — lazy-load the chat suite + Lexical to cut
   first-load on every page.
3. **Phase 10 – QA/rollout docs** — cross-browser/device test matrix, rollback
   plan, changelog.
4. **Phase 8 tail – a11y audit** — the a11y implementation landed (live region,
   focus traps, labels, shortcuts, skip link); only the manual axe/Lighthouse +
   screen-reader audit remains.

## Divergences from the original plan (deliberate)

- **Patient-case attachment cards added beyond the original matrix** — the chat
  now shares real clinical attachments (Contacto de Paciente / Resumen de
  Tratamientos / Odontograma): send-time metadata enrichment
  (`src/chat/patientCardData.ts`), functional actions (profile, odontogram
  pilot, `tel:` call, WhatsApp `wa.me`, treatment+odontogram PDF), and an
  **odontogram mini chart** with 5-zone SVG teeth, quadrant separation and
  per-state counts (`src/chat/components/OdontogramMini.tsx`). Root-cause fix:
  PostgREST returns `patient_case_link` as a to-many array →
  `normalizePatientCaseLink()` (`chatService`/`useChatRealtime`).
- **Message editing moved from the bubble into the composer** (Phase 4 target
  said "inline edit"); the composer's EditSession (amber banner + ✓/X) replaced
  the inline bubble textarea (~380 lines removed).
- **Custom i18n layer instead of Lingui**, and per-user chat settings via the
  `chat_settings` table instead of `users.locale`.
- **Local extra guardrails**: `npx tsc --noEmit` + scoped ESLint per commit; full
  `npm run build` is slow (~10 min) and only needed to regenerate
  `public/sw-precache.json` — Vercel regenerates it at deploy.

## Evidence

- Files cited above are listed with details in `CHAT_OVERHAUL_PLAN.md`
  §5 ("Build Status — Relevant Files").
- Commit trail for the chat overhaul: `021ad84` (virtualization) → `99815aa`
  (read receipts) → `ce5d6c6` (emoji lib + list ticks) → `41633ad`
  (copy/forward/multimedia) → `e3f52c4` (Phase 1/3 features) → delete chain
  `c3bef4d`–`90cd5c8` → `23a747a` (REPLICA IDENTITY) → `16488fc`/`2c20f13`
  (wallpapers + scoping) → `c714641` (edit-composer + spell-squiggle leak)
  → patient-card chain `5c1a7b8` → `081c1ab` → `3696874` → `33f7946` →
  `9567f8b` → `db4c2e6` → `833ffc2` (odontogram mini chart) → `7149770`
  (docs matrix) → **`7fc4838` (Phase 8 a11y polish — HEAD)**.