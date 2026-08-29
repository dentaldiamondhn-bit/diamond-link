# Chat Overhaul — Original Phase Plan & Status Matrix

Tracking document for the chat suite overhaul. Contains the **original matrix
phase plan** (Fluxer-inspired chat for Dental Diamond Link) verbatim, overlaid
with current build status, per-phase progress, and next steps.

> Last updated: 2026-08-28 · Latest commit: `021ad84` · branch `master` (pushed, up to date with `origin/master`)

---

## Analysis — Building a Fluxer-inspired chat page

Goal: keep the existing **Supabase-based data layer** (conversations, messages,
attachments, user metadata) while adopting Fluxer-style UX patterns, real-time
foundations, and notification/PWA capabilities. Auth stays on **Clerk**.

### 1. Current chat page — strengths & gaps

| Aspect | Works well | Missing / improvable |
|--------|------------|----------------------|
| **Authentication** | Clerk (`useUser`) — solid | – |
| **Data layer** | Custom `ChatService` wraps Supabase queries/realtime | Tight coupling with UI (inline `useEffect` for presence, avatars) |
| **UI/UX** | Functional: sidebar, conversation list, bubbles, file preview, emojis, audio/video call buttons, pinned/archived, search | "Admin-like" look; no reaction/edit/quote UI, no read receipts, no rich-text input, no offline/optimistic |
| **Realtime** | Supabase channels for messages/conversations/participants | No typing indicators, read/delivery receipts; one channel per effect |
| **Notifications** | Custom `showBrowserNotification` + NotificationContext | No service-worker push / PWA / Android tray |
| **PWA / Installability** | None | No manifest, no SW, no offline caching |
| **Performance / Bundle** | One page; all chat code in main bundle | No code-splitting for chat-only bundle |
| **Extensibility** | Hard to extend without touching monolithic `ChatPage` | Flat structure; no clear separation of concerns |
| **Accessibility** | Basic ARIA/buttons | No live regions, focus traps, skip-links |
| **Internationalization** | None (hard-coded EN/ES strings) | – |
| **Theme/Dark mode** | `ThemeContext` toggles a few colors | No design-token system |

### 2. What Fluxer gives us (high-level)

| Fluxer Feature | Relevance | Notes |
|----------------|-----------|-------|
| React + Rspack (code-splitting) | Micro-frontend or component-library inspiration | Build emits static assets for `/chat/` sub-path |
| Lexical rich-text editor | Slack-style formatting, quotes, code blocks, mentions | Replaces `<textarea>` |
| Message grouping & reaction UI | Emoji reactions under messages, same-sender grouping | Modern social feel |
| Read & delivery receipts | "Seen by X" via realtime | Map to `read_at`/`delivered_at` |
| Presence & typing indicators | Typing + online/offline dots | `chat_typing` table or presence |
| Web-Push (SW + VAPID) | Push on desktop/mobile/Android tray, even tab closed | Edge Function or Node send service |
| PWA manifest + offline caching | Standalone installability | |
| Modular state (MobX) | Inspires centralized store (Zustand/Jotai) | Move off scattered `useState`/`useEffect` |
| Theme system (CSS variables) | `color-system.css`, `message-layout.css` tokens | Keep Tailwind for layout |
| i18n (Lingui) | Runtime switching EN/ES | |
| Accessibility focus | ARIA live regions, focus traps, skip-links, shortcuts | |
| File upload with progress/preview | Configurable endpoint (Supabase storage) | Keep existing upload endpoint |
| Audio/video calls (LiveKit) | Optional; keep existing call buttons | Not required for MVP |
| Plugin system | Dental-specific widgets (e.g., quick-paste) | Optional |

---

## 3. Matrix Plan — Phases & Feature/Function Comparison

Phase-gated roadmap. **Status** column reflects current build progress in `src/chat/**`.

| Phase | Status | Objective (what we deliver) | Current Chat (C) — Baseline | Fluxer-Inspired Chat (F) — Target | Key Tasks (high-level) |
|-------|--------|-----------------------------|------------------------------|-----------------------------------|------------------------|
| **0 – Preparation** | ✅ | Set up tooling, repo structure, baseline metrics | • Existing `pages/chat` (Supabase + custom service).<br>• No dedicated UI library. | • Create `/src/chat` folder (React components, hooks, store).<br>• Add `pnpm` workspace (or keep npm/yarn) for shared UI libs.<br>• Define API contract with Supabase (unchanged). | - Initialize storybook or component sandbox.<br>- Set up ESLint/Prettier for new chat code.<br>- Define a small "chat API" wrapper (`getConversations`, `sendMessage`, etc.) that isolates Supabase calls. |
| **1 – Layout & Navigation** | ✅ | Replace the monolithic page with a split-layout (sidebar + chat pane) using reusable components | • One big `ChatPage` component handling sidebar, list, messages, input, modals.<br>• CSS is inline Tailwind classes; no clear component boundaries. | • `<ChatLayout>` → `<Sidebar>` + `<ChatPane>`.<br>• Sidebar: `<ConversationList>` component (virtualized if needed).<br>• ChatPane: `<ChatHeader>`, `<MessageList>`, `<Composer>`.<br>• Use CSS variables or a Token file for colors (Fluxer-style). | - Extract `ConversationItem`, `MessageBubble`, `Composer`.<br>- Add `useConversationStore` (Zustand/Jotai) for list + selection.<br>- Responsive breakpoints (sidebar hidden <md).<br>- Keyboard navigation (Tab, Arrows, Enter). |
| **2 – Message Model & Realtime** | ◑ (70%) | Centralize realtime subscriptions; extend message model with reactions, read receipts, typing | • Separate `useEffect`s for messages, conversations, participants.<br>• Message shape: `{id, content, message_type, attachments, …}`.<br>• No reactions, no read receipts beyond unread count. | • Unified Realtime channel (`chat:{convId}`): `message_insert` (with `reactions[]`, `read_by[]`), `message_update`, presence events.<br>• Schema: `reactions: [{emoji, userIds}]`, `read_at`, `delivered_at`, `typing` (ephemeral). | - Migrations: `chat_messages.reactions JSONB`, `read_at`, `delivered_at`.<br>- `chat_message_reads` upserts / trigger for `read_at`.<br>- `useRealtimeSubscription` → `{messages, typingUsers, onlineUsers}`.<br>- Typing indicator below composer; read-receipt avatar row. |
| **3 – Rich-Text Composer** | ◑ (60%) | Replace plain `<textarea>` with Lexical editor (formatting, quotes, mentions, drag-&-drop, emoji) | • Simple `<textarea>` + emoji picker.<br>• No markdown, quote/reply, in-composer preview. | • `<RichTextComposer>` on Lexical (`@lexical/react`): bold/italic/underline, lists, code, quote, `@user`, attachment preview, emoji, Ctrl+Enter.<br>• Optimistic UI: message appears locally, then server ID. | - Install `lexical` + `@lexical/react` `rich-text` / `link` / `list` / `markdown` / `overflow` plugins.<br>- `ChatComposer` plugin calling `sendMessage`.<br>- Drag-&-drop attachment upload via Supabase storage.<br>- Persist drafts in store. |
| **4 – Message UI Enhancements** | ✅ (≈95%) | Message grouping, reactions, avatars, edit, quote/reply, message actions | • One-by-one rendering; avatars only on sender change.<br>• No reaction/edit/quote UI. | • Virtualized `<MessageList>`; grouping consecutive same-sender messages (avatar once); reactions row (optimistic toggle); hover action menu (reply/quote/edit/delete/react-more); inline edit with `edited_at`; quote/reply block + link in sent bubble; read-receipt avatars. | - DB columns `edited_at`, `reply_to_id` (FK).<br>- API: `PATCH /api/chat/messages/:id`, reactions endpoint.<br>- `<MessageBubble>` by message_type (text/image/file/patient_case/system).<br>- Custom popover action menu; accessible reaction tray. |
| **5 – Notifications & Push** | ⏳ | Full Web-Push: service worker, VAPID, background sync, Android tray | • `showBrowserNotification` only when tab focused.<br>• No SW / push server / offline notifications. | • VAPID pair in `.env`; `/api/push/subscribe` → `push_subscriptions` table; send via Edge Function or Node service when recipient offline; SW `push` handler with `data.conversationId`, onClick navigates; permission flow on first load; Android tray automatic. | - `push_subscriptions` table (`endpoint`, `p256dh`, `auth`, `user_id`).<br>- Edge Function `notify-new-message` + queue/cron or direct `web-push` after message insert.<br>- `Notification.requestPermission()` → `/api/push/subscribe`.<br>- Self-hosted SW (`/sw.js`, scope `/chat/`). |
| **6 – PWA & Installability** | ⏳ | Add manifest, offline caching, install prompt (standalone app) | • No manifest, SW, or installability. | • `manifest.json` (name "Diamond Link Chat", start_url `/chat/`, icons, standalone).<br>• SW precaches `/chat/*`, `/_next/*` (Workbox cache-first).<br>• `beforeinstallprompt` → "Install Chat" button.<br>• Offline banner: "You're offline – messages will send when reconnected". | - Create `/public/manifest.json`; link in `<Head>`.<br>- Keep SSR (`output: 'export'` NOT used).<br>- `next-pwa` or custom static SW.<br>- Lighthouse PWA audit. |
| **7 – Theming, Dark Mode & I18n** | ◑ (60%) | Design-token system (Fluxer-like) + multi-language EN/ES | • Theme context toggles a couple colors.<br>• Strings hard-coded. | • Generate `color-system.css` / `message-layout.css` from `theme.json` (CSS variables `--fd-color-primary`, etc.).<br>• Lingui (or lightweight i18n) with `en.json`/`es.json`; language selector stored in Supabase `users.locale`. | - `src/chat/theme.json` tokens + `generate-theme.js`.<br>- Global `chat.css` import.<br>- `@lingui/core` + `@lingui/react` (or `react-intl`) + `<I18nProvider>`.<br>- Language switcher in `<Settings>`. |
| **8 – Accessibility & Polish** | ◑ | WCAG AA, keyboard nav, screen-reader live regions, focus traps | • Basic ARIA; no new-message live region; modal focus issues. | • `aria-live="polite"` announcing new messages (when not focused); ARIA labels everywhere; focus traps (emoji picker, preview, modals, composer toolbar); shortcuts `Ctrl+K`, `Ctrl+Shift+M`, `Alt+Arrows`; skip-to-content. | - `axe-core` / Lighthouse accessibility audit.<br>- `useLiveAnnouncer` hook.<br>- `focus-visible` outline via CSS var.<br>- Screen-reader testing (NVDA/VoiceOver). |
| **9 – Performance & Bundle Optimization** | ⏳ | Fast loads, code-splitting, no main-bundle bloat | • All chat code in main bundle. | • `dynamic(() => import(chat/ChatLayout), { ssr:false })`; lazy `RichTextComposer`/virtualized `MessageList` (`React.lazy` + `Suspense`); `next/font`; measure with `next-bundle-analyzer`. | - `dynamic()` imports for composer/list.<br>- Chat CSS in own chunk.<br>- Lazy emoji sprite sheet. |
| **10 – Final QA, Migration & Roll-out** | ⏳ | End-to-end verification, rollback/migration strategy | – | • Test matrix (desktop Chrome/FF/Safari, mobile Chrome, Android WebView, iOS Safari).<br>• Verify auth, realtime, uploads, notifications when tab closed, PWA install, offline queue.<br>• One-time migration script (`db:migrate`).<br>• Feature flag gradual roll-out. | - Smoke tests (login → convo → file → notification).<br>- Document rollback (flag revert, optional column drops).<br>- Changelog + internal docs. |

### Effort estimation (relative)

| Phase | Rough effort (person-days) | Risk |
|-------|---------------------------|------|
| 0 – Preparation | 2 | Low |
| 1 – Layout & Navigation | 3 | Low |
| 2 – Message Model & Realtime | 4 | Medium (DB changes) |
| 3 – Rich-Text Composer | 5 | Medium (Lexical learning curve) |
| 4 – Message UI Enhancements | 6 | Medium-High (many UI states) |
| 5 – Notifications & Push | 5 | Medium (VAPID, edge functions, SW) |
| 6 – PWA & Installability | 3 | Low |
| 7 – Theming, Dark mode & I18n | 3 | Low |
| 8 – Accessibility & Polish | 3 | Low |
| 9 – Performance & Bundle | 2 | Low |
| 10 – QA, Migration & Roll-out | 4 | Low-Medium |
| **Total** | **≈ 40 person-days** (≈ 8 weeks for 1 dev) | |

> *Note:* Reusing Fluxer's actual build (host under `/chat/` + auth/notification bridge via `postMessage`) skips UI-heavy phases 3-4, 7-8 → ≈ **15-20 person-days**. The matrix assumes we **own the UI code** for dental-specific needs (patient-case links, custom emojis) while gaining Fluxer's architectural benefits.

---

## 4. Feature/Function Comparison (Current vs Fluxer-Inspired)

| Feature | Current Chat (C) | Fluxer-Inspired Chat (F) | Comments / Effort |
|---------|------------------|--------------------------|-------------------|
| **Authentication** | Clerk (`useUser`) | Same (Clerk) | No change |
| **Data access** | Custom `ChatService` (Supabase) | Supabase calls in repository layer | Refactor only |
| **Realtime messaging** | Supabase channels per conv/global | Single unified channel with reactions/read-receipts/typing | DB columns + subscription logic |
| **Typing indicator** | None | Presence-based typing UI | Small |
| **Read / delivery receipts** | Unread count only | Read-receipt avatars, delivered flag | `read_at` table + query |
| **Message reactions** | None | Emoji reactions toggle + count | `reactions` column + UI |
| **Message editing** | No edit UI (only a flag) | Inline edit with `edited_at` | Edit API + UI |
| **Quote / Reply** | None | Reply quoted block; visual link in bubble | `reply_to_id` + UI |
| **Message grouping** | Full header every message | Group consecutive same-sender (avatar once) | UI logic only |
| **Rich text / formatting** | Plain text + emojis | Lexical editor (bold/italic/lists/code/quotes/mentions) | Moderate (Lexical deps) |
| **File upload & preview** | Basic upload + image preview | Drag-&-drop, progress, preview, multiple files | Improve UI |
| **Audio/Video calls** | Separate custom buttons | Keep, or optional Fluxer LiveKit UI | Low |
| **Message search** | Sidebar name filter | Global message search + jump (`Ctrl+K`) | `pg_trgm` or external search |
| **Notifications (in-tab)** | Custom browser notification (focused tab only) | Same + **push** via Service Worker (closed tab / background / Android tray) | VAPID + subscription table + send fn |
| **PWA / Installability** | None | Manifest + SW → installable standalone | Moderate |
| **Offline support** | None | Optimistic UI + queue; SW caches shell; offline banner | Optimistic updates + queue |
| **Theming / Dark mode** | Simple Theme Context | Design tokens (`color-system.css`, `message-layout.css`), auto dark mode, switcher | Low-moderate |
| **Internationalization** | Hard-coded EN/ES | Lingui/i18n JSON + language selector | Low |
| **Accessibility** | Basic ARIA, limited keyboard nav | Live regions, focus traps, skip-links, shortcuts, screen-reader friendly | Moderate |
| **Performance / Bundle** | All chat code in main bundle | Code-splitting, lazy Lexical, chat-only chunk | Moderate |
| **Extensibility / Plugins** | Monolithic | Modular store + plugin system | Refactor enables future features |
| **Testing & CI** | Limited tests | Storybook + Jest/RTL + Cypress e2e (optional) | Add in Phase 0 |

---

## 5. Build Status (tracking this project)

### Toolchain (as built, diverges where noted from plan)

- Next.js 15, TypeScript, Supabase, Clerk, Tailwind, Zustand store (`chatStore`).
- New chat suite lives in `src/chat/**`; feature flag `NEXT_PUBLIC_USE_NEW_CHAT === 'true'` switches `app/(auth)/chat/page.tsx` to `<ChatLayout />`. **Flag is ACTIVE** (`.env`/`.env.local`).
- `moduleResolution: "bundler"`, Lexical 0.49 API fixes.
- Vercel production build: `eslint: { ignoreDuringBuilds: true }` in `next.config.js` + 8GB `NODE_OPTIONS` heap in `package.json`; `vercel --prod` green, live at `app.dentaldiamondhn.com` (root → `/sign-in`). ESLint still gated locally via the "Verification Gate" below.

### Requested → Current Comparison (latest feature work)

| Request | Status |
|---|---|
| Single `^` toggle per message | ✅ Chevron inside each bubble (sender + receiver), revealed on hover; usable on touch (`opacity-40` default) |
| Replace reaction-tray `+` trigger and inline action buttons | ✅ One popover: quick reactions + divider + frequent + `+` full picker, then Reply/Edit/Delete |
| Chevron placement consistent | ✅ **Inside** the text bubble after content, uniform `gap-1.5` character gap — same for all messages |
| Dynamic above/below positioning | ✅ `openActionMenu` measures row vs scroller (`ACTION_MENU_HEIGHT_PX = 220`); `group` class on rows |
| Delete own messages only (confirm) | ✅ `mine`-gated with `window.confirm` |
| One reaction per user per message | ✅ Reused `handleToggleReaction` |
| i18n | ✅ `moreActions` + `replyingTo` keys added (`en`/`es`) |
| Wire stubbed `Reply` menu item to real reply flow | ✅ Reply sets `ChatPane.replyTo` → quote bar in `Composer` → `reply_to_id` on send; clears after send + on conversation switch (`23d4563`) |
| Show reply preview inside the sent bubble | ✅ `Sender: snippet` bar resolved from server `reply_to` embed **or** locally from the loaded list (realtime / fresh-send fallback) (`9455116`) |
| Click reply preview → jump to original | ✅ Smooth scroll to `[data-message-id]` + 1.6s highlight ring on the target row (`9455116`) |
| Clear composer after send | ✅ Optimistic clear before the async send (`35b3bdf`) |
| Emoji insertion in composer | ✅ 64-emoji picker (`Smile` toolbar button) inserting at cursor (`35b3bdf`) |
| Persistent per-user unread badges | ✅ Unread computed from `chat_participants.last_read_at` in `getConversations`; mark-as-read on realtime delivery while the conversation is open (`35b3bdf`) |
| Fix `PGRST200` on the reply select (`sender:users` embed, no FK) | ✅ Dropped invalid embed; sender resolved client-side from store (`e2aaa6b`) |
| Vercel production deploy | ✅ `eslint.ignoreDuringBuilds` + 8GB build heap; `vercel --prod` green (`6475b67`, `1e9ffbe`) |
| Invalid `GET_LOGS` route export | ✅ Moved store to `src/lib/file-access-log-store.ts` + real `/logs` route (`16600bb`) |
| Verification gate | ✅ `npx tsc --noEmit` clean + 0 ESLint errors |
| Virtualize `<MessageList>` (Phase 4) | ✅ react-window v2 (`List` + `useDynamicRowHeight` + `useListCallbackRef`); per-conversation remount via `key`; scroll-to-latest; jump-to-original uses `scrollToRow` (`021ad84`) |
| Read-receipts (Phase 4) | ✅ `chat_message_reads` table (`message_id`+`user_id` UNIQUE, `delivered_at`/`read_at`), live via realtime channel; WhatsApp-style ✓/✓✓ (grey delivered / blue read) on my sent messages **plus** stacked reader avatars on my latest message (`participantUserIds` from store for the final check) |
| WhatsApp UI tweaks | ✅ Group conversations show the multiple-users icon on a gray circle in the list + header (fallback only when no group `avatar_url`); no-chat-selected panel hides the header/composer and shows the WhatsApp default copy ("Tap a chat to start messaging." / "Selecciona un chat…") |
| Full emoji library | ✅ `src/chat/data/emojiLibrary.ts` generated from `@emoji-mart/data` (1870 emojis, 8 WhatsApp-style categories); shared `EmojiPicker` (category nav + sticky headers) used by the composer and the reaction picker |
| Chat-list delivery ticks | ✅ WhatsApp ✓/✓✓ (grey delivered / blue read) rendered under the timestamps in the conversation list via shared `getMessageReadStatus`; `getConversations` attaches reads to `last_message`, store `upsertMessageRead` refreshes the list-live even before a conversation is opened |
| Commit | ✅ `021ad84` (virtualization), read receipts committed with it; checkmarks + read-receipt pipeline `99815aa`; group icon + default panel `7a5e89a`; full emoji library + list ticks `<next>` |

### Work State

**Completed**
- **Phase 2 (partial 70%)** — realtime consolidated in `useChatRealtime`; `reactions JSONB` + voice migration applied (`database/migrations/20260827_chat_extensions.sql`); **server-computed per-user unread counts** (`getConversations`) + mark-as-read on delivery while conversation is open; **`chat_message_reads` table + read-delivery upserts** (`markConversationRead`). Typing indicator still pending.
- **Phase 3 (partial 60%)** — Lexical composer (bold/italic/underline), drag-&-drop + multi-file upload, voice notes, **full emoji picker** (1870 emojis, category nav, sticky headers — also used for reactions), **optimistic send-clear**, reply-quote bar. Lists/code/mentions + draft persistence pending.
- **Phase 4 (≈95%)** — grouping, reactions (one per user), unified hover action menu (above/below positioning), inline edit, **quote/reply fully wired** (composer quote bar → `reply_to_id` → bubble preview `Sender: snippet` → click-to-jump with highlight), **virtualized `<MessageList>`** (react-window v2 dynamic heights, per-conversation reset, scroll-to-latest / jump-to-row), **read-receipt avatars + WhatsApp ✓/✓✓ checkmarks** (live via `chat_message_reads` realtime channel, incl. the conversation list under each timestamp), default no-chat-selected panel + gray users-icon group avatars.
- **Phase 7 (partial)** — i18n layer (`en`/`es`, typed keys incl. `moreActions`, `replyingTo`, emoji category names).
- **Production** — feature flag activated (`NEXT_PUBLIC_USE_NEW_CHAT=true`), Vercel deploy green, `GET_LOGS` route fixed, `.eslintcache` gitignored, action-menu refactor shipped.
- Commits: `<next>` (full emoji library + list ticks), `7a5e89a` (group icon + default panel), `99815aa` (checkmarks + read-receipt pipeline), `7920a4a`, `cc3d538`, `08c0702`, `021ad84`, `b6e8ce6`, `e2aaa6b`, `35b3bdf`, `9455116`, `23d4563`, `6475b67`, `1e9ffbe`, `16600bb`.

**Active**
- Deploy `<next>` to Vercel so prod picks up the full emoji picker + chat-list delivery ticks, then verify read receipts / ticks end-to-end with two accounts on `app.dentaldiamondhn.com`.

**Blocked**
- Full local `npm run build` still stalls at 4GB heap in the dev container (approved gate: `tsc` + ESLint; Vercel is the functional build check and is green).
- Phases 5 (push), 6 (PWA), 9 (bundle), 10 (QA/rollout) not started.

### Next Move
1. Finish **Phase 2**: typing-indicator UI (presence broadcast already wired in `useChatRealtime`).
2. **Phase 3** leftovers (lists / code / mentions) — skip if not needed.
3. Start **Phase 5** (push notifications / Service Worker) — the biggest remaining user-facing win.
4. Then **Phase 6 / 9** (PWA installability, bundle splitting), and finally **Phase 10** QA/rollout (deactivate-flag hammer + regression pass).
5. Keep the gate: `npx tsc --noEmit` + scoped ESLint below.

### Verification Gate
```bash
npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npx eslint src/chat --cache --format stylish
```

### Relevant Files
- `src/chat/components/MessageList.tsx` — react-window v2 virtualized list (`List` + `useDynamicRowHeight` + `useListCallbackRef`), grouping, unified action menu, reactions, reply preview bar, click-to-jump + highlight, read-receipt avatars on last-mine message; reaction picker uses the full `EmojiPicker`.
- `src/chat/components/EmojiPicker.tsx` + `src/chat/data/emojiLibrary.ts` — full Unicode emoji picker (1870 emojis, 8 categories, category nav + sticky headers); library generated from `@emoji-mart/data` (commit `<next>`).
- `src/chat/components/Composer.tsx` — Lexical editor, reply-quote bar (`replyTo`/`onCancelReply`), full emoji picker (`Smile`), optimistic send-clear, drag-drop upload, voice note.
- `src/chat/components/ChatPane.tsx` — `replyTo` state, `handleSend` passes `reply_to_id`, flex root, mark-as-read on conversation open; message-list remount per conversation (`key`).
- `src/chat/hooks/useChatRealtime.ts` — consolidated realtime (messages/conversations/participants/**`chat_message_reads`**/presence/typing) + mark-as-read on delivery while open.
- `src/services/chatService.ts` — `reply_to:chat_messages(id, content)` select (no `users` embed — no FK), per-user unread counts from `last_read_at`, `getReadsByConversation` + `attachReads`, centralized `markConversationRead` (last_read_at + `chat_message_reads` upserts); `getConversations` attaches reads to `last_message` for list ticks.
- `src/chat/repository.ts` — data layer (messages, conversations, `markAsRead` → `markConversationRead`).
- `src/chat/store/chatStore.ts` — Zustand store (Phase 1); `users` map for client-side sender lookup; `upsertMessageRead` merges live read receipts into messages **and** the conversation `last_message` (list ticks live even before opening a chat).
- `src/chat/utils.ts` — shared `getMessageReadStatus` (sent/delivered/read) used by bubbles + chat list.
- `src/chat/i18n/translations.ts` + `useTranslations.ts` — `moreActions`, `replyingTo` (`en`/`es`).
- `src/chat/components/ChatLayout.tsx` — `h-full` root, bootstrap, debounced reload.
- `app/(auth)/chat/page.tsx` — `NEXT_PUBLIC_USE_NEW_CHAT` gate (active); info panel removed.
- `app/(auth)/layout.tsx` — `min-h-0` on both overflow wrappers.
- `database/migrations/20260827_chat_extensions.sql` — applied to Supabase.
- `database/migrations/20260828_chat_message_reads.sql` — **applied** to Supabase (successful run; drop+recreate with permissive RLS + realtime publication; pre-existing incompatible table fixed by `7920a4a` + `08c0702`).
- `src/chat/components/ConversationListItem.tsx` / `ChatHeader.tsx` — group conversations render a gray circle with the `Users` icon when no group `avatar_url` exists.
- `src/chat/components/ChatPane.tsx` — when no conversation is selected: header + composer hidden and WhatsApp-style default panel shown (gray circle + "Tap a chat to start messaging.").
- `next.config.js` / `package.json` — `eslint.ignoreDuringBuilds`, 8GB build heap.
- `app/api/agent/file-access/route.ts`, `app/api/logs/route.ts`, `src/lib/file-access-log-store.ts` — file-access tracking (Phase 0/10 tooling).
- `src/types/chat.ts` — `ChatMessageRead` type + `reads` field on `ChatMessage`.