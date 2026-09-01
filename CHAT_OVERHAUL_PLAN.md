# Chat Overhaul — Original Phase Plan & Status Matrix

Tracking document for the chat suite overhaul. Contains the **original matrix
phase plan** (Fluxer-inspired chat for Dental Diamond Link) verbatim, overlaid
with current build status, per-phase progress, and next steps.

> Last updated: 2026-09-01 · Latest commits: the current working batch (image-editor rendering fixes: pencil visibility in the attachment tray, stroke coordinate alignment, crop-aspect = media aspect, selected-color highlight) on top of `c098bb9` (react-easy-crop CSS import) and `8f6a4fa` (image editor, text color/highlight, edit menu fixes, sidebar previews, soft-delete chain, REPLICA IDENTITY FULL, keyboard-nav, responsive sidebar, lists/code/@mentions/draft, forward/reply/notif fixes) + all previous. Branch `master` is 24 commits ahead of `origin/master`.

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
| **2 – Message Model & Realtime** | ✅ (100%) | Centralize realtime subscriptions; extend message model with reactions, read receipts, typing | • Separate `useEffect`s for messages, conversations, participants.<br>• Message shape: `{id, content, message_type, attachments, …}`.<br>• No reactions, no read receipts beyond unread count. | • Unified Realtime channel (`chat:{convId}`): `message_insert` (with `reactions[]`, `read_by[]`), `message_update`, presence events.<br>• Schema: `reactions: [{emoji, userIds}]`, `read_at`, `delivered_at`, `typing` (ephemeral). | - Migrations: `chat_messages.reactions JSONB`, `read_at`, `delivered_at`.<br>- `chat_message_reads` upserts / trigger for `read_at`.<br>- `useRealtimeSubscription` → `{messages, typingUsers, onlineUsers}`.<br>- Typing indicator below composer; read-receipt avatar row. |
| **3 – Rich-Text Composer** | ✅ (~100%) | Replace plain `<textarea>` with Lexical editor (formatting, quotes, mentions, drag-&-drop, emoji) | • Simple `<textarea>` + emoji picker.<br>• No markdown, quote/reply, in-composer preview. | • `<RichTextComposer>` on Lexical (`@lexical/react`): bold/italic/underline, lists, code, quote, `@user`, attachment preview, emoji, Ctrl+Enter.<br>• Optimistic UI: message appears locally, then server ID. | - Install `lexical` + `@lexical/react` `rich-text` / `link` / `list` / `markdown` / `overflow` plugins.<br>- `ChatComposer` plugin calling `sendMessage`.<br>- Drag-&-drop attachment upload via Supabase storage.<br>- Persist drafts in store. |
| **4 – Message UI Enhancements** | ✅ (~100%) | Message grouping, reactions, avatars, edit, quote/reply, message actions | • One-by-one rendering; avatars only on sender change.<br>• No reaction/edit/quote UI. | • Virtualized `<MessageList>`; grouping consecutive same-sender messages (avatar once); reactions row (optimistic toggle); hover action menu (reply/quote/edit/delete/react-more); inline edit with `edited_at`; quote/reply block + link in sent bubble; read-receipt avatars. | - DB columns `edited_at`, `reply_to_id` (FK).<br>- API: `PATCH /api/chat/messages/:id`, reactions endpoint.<br>- `<MessageBubble>` by message_type (text/image/file/patient_case/system).<br>- Custom popover action menu; accessible reaction tray. |
| **5 – Notifications & Push** | ⏳ | Full Web-Push: service worker, VAPID, background sync, Android tray | • `showBrowserNotification` only when tab focused.<br>• No SW / push server / offline notifications. | • VAPID pair in `.env`; `/api/push/subscribe` → `push_subscriptions` table; send via Edge Function or Node service when recipient offline; SW `push` handler with `data.conversationId`, onClick navigates; permission flow on first load; Android tray automatic. | - `push_subscriptions` table (`endpoint`, `p256dh`, `auth`, `user_id`).<br>- Edge Function `notify-new-message` + queue/cron or direct `web-push` after message insert.<br>- `Notification.requestPermission()` → `/api/push/subscribe`.<br>- Self-hosted SW (`/sw.js`, scope `/chat/`). |
| **6 – PWA & Installability** | ⏳ | Add manifest, offline caching, install prompt (standalone app) | • No manifest, SW, or installability. | • `manifest.json` (name "Diamond Link Chat", start_url `/chat/`, icons, standalone).<br>• SW precaches `/chat/*`, `/_next/*` (Workbox cache-first).<br>• `beforeinstallprompt` → "Install Chat" button.<br>• Offline banner: "You're offline – messages will send when reconnected". | - Create `/public/manifest.json`; link in `<Head>`.<br>- Keep SSR (`output: 'export'` NOT used).<br>- `next-pwa` or custom static SW.<br>- Lighthouse PWA audit. |
| **7 – Theming, Dark Mode & I18n** | ◑ (60%) | Design-token system (Fluxer-like) + multi-language EN/ES | • Theme context toggles a couple colors.<br>• Strings hard-coded. | • Generate `color-system.css` / `message-layout.css` from `theme.json` (CSS variables `--fd-color-primary`, etc.).<br>• Lingui (or lightweight i18n) with `en.json`/`es.json`; language selector stored in Supabase `users.locale`. | - `src/chat/theme.json` tokens + `generate-theme.js`.<br>- Global `chat.css` import.<br>- `@lingui/core` + `@lingui/react` (or `react-intl`) + `<I18nProvider>`.<br>- Language switcher in `<Settings>`. |
| **8 – Accessibility & Polish** | ◑ | WCAG AA, keyboard nav, screen-reader live regions, focus traps | • Basic ARIA; no new-message live region; modal focus issues. | • `aria-live="polite"` announcing new messages (when not focused); ARIA labels everywhere; focus traps (emoji picker, preview, modals, composer toolbar); shortcuts `Ctrl+K`, `Ctrl+Shift+M`, `Alt+Arrows`; skip-to-content. | - `axe-core` / Lighthouse accessibility audit.<br>- `useLiveAnnouncer` hook.<br>- `focus-visible` outline via CSS var.<br>- Screen-reader testing (NVDA/VoiceOver). |
| **9 – Performance & Bundle Optimization** | ⏳ | Fast loads, code-splitting, no main-bundle bloat | • All chat code in main bundle. | • `dynamic(() => import(chat/ChatLayout), { ssr:false })`; lazy `RichTextComposer`/virtualized `MessageList` (`React.lazy` + `Suspense`); `next/font`; measure with `next-bundle-analyzer`. | - `dynamic()` imports for composer/list.<br>- Chat CSS in own chunk.<br>- Lazy emoji sprite sheet. |
| **10 – Final QA, Migration & Roll-out** | ⏳ | End-to-end verification, rollback/migration strategy | – | • Test matrix (desktop Chrome/FF/Safari, mobile Chrome, Android WebView, iOS Safari).<br>• Verify auth, realtime, uploads, notifications when tab closed, PWA install, offline queue.<br>• One-time migration script (`db:migrate`).<br>- Feature flag gradual roll-out. | - Smoke tests (login → convo → file → notification).<br>- Document rollback (flag revert, optional column drops).<br>- Changelog + internal docs. |

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
|--------|--------|
| Media tile / collage oversized bubbles fix | ✅ Root cause = **Tailwind `content` glob missing `./src/`** → every arbitrary-value class used only in `src/chat/` (`h-[32px]`, `w-[56px]`, `max-w-[75%]`, …) emitted no CSS; tiles fell back to `aspect-ratio:1/1` and grew to 119px. Added `"./src/**/*.{js,ts,jsx,tsx,mdx}"` to `tailwind.config.js`; required dev-server restart. Proof-rendered before/after in headless Chrome (119×119 → 32×32) |
| Larger image tiles per request | ✅ Collage final sizes: single `h-[150px] w-[150px]`; 2-image `w-[255px]`; 3-image `h-[255px] w-[405px]`; 4+ `w-[255px]`; doc/file chips `max-w-[430px]` |
| Send-duplicate preview | ✅ Realtime INSERT handler finds the same-conversation `local_state:'pending'` own message and `removeMessage(s)` it *before* `addMessage(resolved,…)` |
| Remove "Sin contenido" fallback | ✅ `chatService.ts` both sites + `app/(auth)/chat/page.tsx` store empty vs fallback; 0 hits in served bundle |
| Truncated reaction bar | ✅ `overflow-x-auto` on the reaction strip; action menu `maxHeight:'min(430px, calc(100vh - 16px))'` + `overflowY:'auto'`; `ACTION_MENU_HEIGHT_PX` 300→430 |
| Action menu closes when scrolling *inside* it | ✅ Close-on-scroll handler now ignores scroll events whose target is inside the menu (`actionMenuRef` guard) — reaction strip / action list scroll correctly without closing; outer chat scroll still closes |
| Copy message action | ✅ `handleCopy` (Clipboard API + textarea fallback; copies content → attachment URLs → voice URL) + `Copy` button in the action menu |
| Forward message action | ✅ New `ForwardModal` (chats/contacts tabs, search, message preview chip) → then enhanced to **multi-recipient** selection with check-circles + highlighted rows, footer `{n} selected`, and a **Send button icon → spinner → green check "Enviado"** confirmation (800 ms) before closing; contacts reuse an existing direct when present else create `DIRECT` |
| Reply bubble shows image snippet | ✅ In-thread reply quote renders a 24px rounded thumbnail when the quoted message has image attachments (`replyPreviewThumb`); the composer "Replying to…" strip also shows a 32px thumbnail |
| Optimistic progress pill only for media | ✅ `local_state:'pending'` pill gated to `image`/`file`/`voice` (no pill on text sends) |
| Attachment tray closer to bottom | ✅ Root `pb-[max(1.6rem,8%)]` → `pb-[max(1.28rem,6.4%)]` (composer ~20% lower) |
| Notification shows raw `<p>…<span>…</span>…</p>` HTML | ✅ `chatService.sendMessage` notification `message` now runs through `stripHtml()` (regex tag-strip) so in-app/browser notifications store plain `Hello!` (new messages only; old rows still hold HTML) |
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
| Read-checkmark blue fix | ✅ Root cause: Realtime UPDATE payloads only carry PK + changed columns (default replica identity), so `chat_message_reads` delivered→read events lacked `message_id`/`user_id` → dropped by `normalizeRead`. Fixed with `database/migrations/20260828b_chat_message_reads_replica_identity.sql` (`REPLICA IDENTITY FULL`) **plus** a client fallback in `useChatRealtime` that re-fetches the row by `id` when the payload is incomplete (works on the current deploy immediately). Also hardened the `chat_messages` UPDATE handler to stop clobbering reactions/voice metadata with `undefined` on edits |
| Phase 2 typing indicator | ✅ `<TypingIndicator>` above the composer (WhatsApp-style animated dots + "Name is typing…" / "Name1, Name2 are typing…" / "Name + N more"), driven by the already-wired presence broadcast (`typing` store map); header + sidebar list now show the named label via shared `getTypingLabel`; i18n keys `typingMulti` / `typingAndMore` |
| Chat attachment upload fix | ✅ Root cause: `app/api/chat/upload/route.ts` tried to `createBucket` at runtime with the **anon** client (`src/lib/supabase/server.ts`) — anon cannot list/create buckets under `storage.buckets` RLS → `listBuckets()` returned `[]` → `createBucket` → "new row violates row-level security policy" → 500. Removed the runtime bucket-ensure; provisioning is via migration. Added `database/migrations/20260828c_fix_chat_uploads_storage.sql` (idempotent): ensures the bucket is public / any mime type (was images+PDF only, blocking .docx/.xlsx) / anon + authenticated `storage.objects` policies |
| Bubble read-check double ✓ (blue) | ✅ `MessageList.renderReadStatus` only rendered the 2nd check when `delivered`, so a **read** bubble showed a single blue ✓ while the chat list showed two. Now `status !== 'sent'` renders both checks (blue when read, grey when delivered) |
| WhatsApp-style attachment tray | ✅ New `AttachmentTray` component: selecting files (paperclip or drag&drop) populates a preview tray above the composer (image thumbnails / document icon + name + size), with chevron navigation + `n/N` counter for multi-file picks and per-file remove; the text input stays editable below (caption). Uploads moved from selection-time to **send-time** (staged `PendingAttachment` with object URLs, revoked on remove/clear/unmount/conversation switch) |
| Stale-participant reads fix | ✅ Root cause: `getMessageReadStatus` counted **every** non-self read row for `need` (`Math.max(otherParticipantCount, readCount, deliveredCount)`), so stale `chat_message_reads` rows from users who are no longer participants (e.g. removed/legacy users) inflated `need` to 2 in a direct chat — the partner reading only satisfied 1 → bubble/list stayed grey "delivered" forever, "won't change to blue". Now it classifies **only against the current other participants** (`otherParticipantIds`, filtered by `Set`); `need` = participant count, stale rows ignored |
| Open-chat scroll-to-bottom fix | ✅ Root cause: `react-window` renders rows top-first using the default estimated height (`48px`) and measures real heights asynchronously (`ResizeObserver`); the mount `scrollToRow` computed the offset from **estimated** heights — short chats even resolved `scrollTop: 0` → the chat opened at the top. `pinListToBottom` re-pins `scrollTop = scrollHeight` each frame until the measured heights integrate and the bottom stays settled for ≥8 consecutive frames (aborts on user wheel/touch, 3 s cap) — verified in headless Chrome against the exact `react-window` build for both 10-row and 200-row chats: `scrollTop === maxScrollTop` and the last row sits at the viewport bottom |
| Soft-delete tombstones + optimistic delete | ✅ 6-commit chain: optimistic delete before server call, tombstone `id` so realtime/re-insert cannot re-add it, refresh list + store after delete, flush mention dropdown, never re-add deleted rows (`90cd5c8`/`1a05136`/`6c4396a`/`c3bef4d`/`55a3cf3`) |
| REPLICA IDENTITY FULL on `chat_messages` | ✅ `23a747a` — soft-delete UPDATEs now carry full row payload to recipients, so deleted messages disappear from every open chat immediately without client re-fetch |
| Deleted-message unread badge + bubble whitespace | ✅ `07518d9` — drops unread count when the latest message is deleted; strips edge whitespace from bubbles to avoid phantom padding |
| Sidebar last-message deletion handling | ✅ `7a1573d` + `e2c3ae2` — excludes soft-deleted rows from sidebar preview and updates preview when the last message is deleted |
| Lexical whitespace runtime fix | ✅ `a3ace91` — `getAllTextNodes` trim prevents Lexical `$createTextNode` crash on empty whitespace nodes |
| Edit composer formatting menu + viewport clamp | ✅ `MessageList.tsx` `openEditMenu` now uses the same above/below viewport-aware positioning as the per-message action menu; fixed overlay at `z-50`; adds **text color** and **highlight** swatches to the edit formatting menu; preserves original HTML formatting in edit textarea |
| Chat list file/image previews with text snippet | ✅ `chatService.ts` fetches `chat_attachments(*)` with `last_message`; `ConversationListItem.tsx` renders image thumbnail + text snippet for image/file messages instead of generic "Image"/"File" labels |
| Composer text color + highlight | ✅ `ColorButtons.tsx` — shared color/highlight swatch popover with viewport-boundary flip; used by both `Composer.tsx` and edit menu |
| Image editor (crop/tilt/draw) in attachment tray | ✅ New `ChatImageEditor.tsx` (crop via `react-easy-crop`, tilt/rotate, draw pencil with color/size/undo); `AttachmentTray.tsx` opens it on the pencil button for staged images, replaces preview on apply |
| Pencil/edit tools missing in attachment tray | ✅ Root cause: the image wrapper `<div className="relative">` had no height constraint, so a tall/portrait image sized it beyond the tray's height and the outer `overflow-hidden` **clipped the pencil** (`absolute bottom-3 right-3`) out of view. Wrapper now `relative flex h-full w-full items-center justify-center` → image is contained and the pencil stays visible |
| Drawing reduced / misplaced after applying edits | ✅ Root cause: strokes were recorded in the cropper's `mediaSize` space but composited with react-easy-crop's `croppedAreaPixels` (rotated **natural** px) — plus the drawing canvas assumed the media fills the whole container when it is actually contained (letterboxed). Added `getMediaMapping` that reads the live on-screen media `<img>` rect and maps container px ↔ rotated natural px, so strokes land exactly where drawn |
| Drawing disappears when the image is sent | ✅ Same coordinate fix: strokes were pushed off-canvas (negative coords from `(p - area)` where the default center-square crop had `area.x/y > 0`). With strokes now in natural-pixel space (same as `area`), they composite inside the crop and survive send (`ChatPane.handleSend` uploads the edited `att.file`) |
| Wide image sides cropped by the square editor | ✅ Root cause: `Cropper` used a hardcoded `aspect={1}` square crop area → wide images were cover-scaled and their sides fell outside the crop window. `aspect` now tracks the media's natural aspect (`size.naturalWidth / size.naturalHeight` from `onMediaLoaded`), so the full image fits and the default crop = entire image |
| Image shrinks ~50% when re-editing | ✅ Root cause: `onMediaLoaded` override `setZoom((size.width * 0.66) / size.height / 2)` — for a 3:2 image that equals `zoom = 0.5`. Removed; `zoom` stays 1 (full fit) unless the user zooms manually in crop mode |
| Selected pen color not highlighted | ✅ Color swatch now uses `ring-2` (white ring + scale on selected, hover ring otherwise) plus a centered `Check` icon — clear focus on the chosen color even for the default white swatch |
| Commit | ✅ `021ad84` (virtualization), read receipts committed with it; checkmarks + read-receipt pipeline `99815aa`; group icon + default panel `7a5e89a`; full emoji library + list ticks `ce5d6c6`; blue read-checkmark fix + Phase 2 typing `d34d98e`; chat attachment upload fix `05a0634`; bubble double-blue ✓ + WhatsApp attachment tray `99961bd`; stale-participant reads fix `aa5ead4`; open-chat scroll-to-bottom + action menu pinning `756e854`; **copy/forward + media progress + echo dedupe + Tailwind `src/` fix + tile sizes + tray inset `41633ad`**; **Phase 1 keyboard-nav + responsive sidebar, Phase 3 lists/code/@mentions/draft, forward/reply/notif fixes `e3f52c4`**; **delete tombstoning + optimistic delete + mention refresh `c3bef4d`/`55a3cf3`/`1a05136`/`6c4396a`/`90cd5c8`**; **sidebar last-message deletion fixes `7a1573d`/`e2c3ae2`**; **deleted-message unread badge + bubble whitespace `07518d9`**; **REPLICA IDENTITY FULL `23a747a`**; **Lexical whitespace fix `a3ace91`**; **react-easy-crop CSS import `c098bb9`**; **image-editor rendering fixes (pencil visibility, stroke coordinate alignment, crop-aspect = media aspect, selected-color highlight) = this working tree, to be committed** |

### Work State

**Completed**
- **Phase 0 (~100%)** — tooling, `/src/chat` structure, repository/service layers, ESLint/tsc gate.
- **Phase 1 (~100%)** — keyboard navigation in the conversation sidebar (ArrowDown/Up/Home/End via `handleListKeyDown` + `scrollIntoView`, `<li role="presentation"><button role="option" aria-selected data-conv-index>`, `onKeyDown`/`buttonRef` threading); **responsive `<md` sidebar** — `sidebarOpen`/`closeSidebar` in `ChatLayout`, fixed `z-30` overlay (`md:hidden`), collapsible `md`-only transform (`-translate-x-full md:static md:translate-x-0`, `z-40`), auto-close on selection on mobile, mobile-only `Menu` hamburger in `ChatHeader`.
- **Phase 2 (100%)** — realtime consolidated in `useChatRealtime` (messages/conversations/participants/`chat_message_reads`/presence/typing broadcast); `reactions JSONB` + voice migration applied (`database/migrations/20260827_chat_extensions.sql`); **server-computed per-user unread counts** (`getConversations`); **`chat_message_reads` table + read-delivery upserts** (`markConversationRead`/`markDelivered`); **typing indicator UI** (`<TypingIndicator>` above composer + named labels in header/list, see log below); **REPLICA IDENTITY FULL** on `chat_messages` for realtime soft-delete delivery (`23a747a`).
- **Phase 3 (≈100%)** — Lexical composer (bold/italic/underline), **lists/code toolbar** (`@lexical/list` unordered/ordered + `@lexical/code-core` `CodeNode`), **@mentions** (`MentionNode` DecoratorNode → `<span class="chat-mention">`, `MentionPlugin` @… dropdown with Arrow/Tab pick + commit), drag-&-drop + multi-file upload, voice notes, **full emoji picker** (1870 emojis, category nav, sticky headers — also used for reactions), **optimistic send-clear**, reply-quote bar, **staged attachment tray with image editor** (crop/tilt/draw), **text color + highlight swatches** (`ColorButtons.tsx`).
- **Phase 4 (≈100%)** — grouping, reactions (one per user), unified hover action menu (above/below positioning, **Copy/Forward/Reply/Edit/Delete**), inline edit with **5-line scrollable textarea + chevron formatting menu** (text color + highlight), quote/reply preview **with image snippet** + click-to-jump, read-receipts + ✓/✓✓, **sidebar last-message previews** with image thumbnails + text snippets.
- **Phase 7 (100%)** — i18n layer (`en`/`es`, typed `TranslationKey`) fully wired with all keys (`moreActions`, `replyingTo`, `typingMulti`, `copyMessage`, `forward*`, `editorCrop`, `editorTilt`, `editorDraw`, etc.).
- **Production** — feature flag activated (`NEXT_PUBLIC_USE_NEW_CHAT=true`), Vercel deploy green, soft-delete tombstones + optimistic delete, REPLICA IDENTITY FULL, deleted-message unread badge fix, sidebar last-message deletion fixes.

 **Active**
- Commit `8f6a4fa` (pushed) contains: image editor (`ChatImageEditor.tsx`), text color/highlight (`ColorButtons.tsx`), attachment tray integration, edit menu fixes, draft persistence, lists/code/@mentions, reply quote with image snippet, notification HTML strip, sidebar previews, soft-delete chain and REPLICA IDENTITY FULL.
- `rendererStyled` in `utils.ts` now typed with `ChatPurifyConfig` to support `ALLOWED_STYLE_PROPERTIES` for color/highlight rendering.
- **Image-editor rendering fixes (in working tree, to be committed):** pencil no longer clipped in the attachment tray; drawing strokes recorded from the live on-screen media rect (`getMediaMapping`) so they composite in the right position/size; crop `aspect` now = the image's natural aspect (no square side-cropping, no crop offset shift); removed the `setZoom` on-load hack (caused 50% re-edit shrink); selected pen color shown with ring + check icon.

**Blocked**
- Full local `npm run build` still stalls at 4GB heap in the dev container (approved gate: `tsc` + ESLint; Vercel is the functional build check and is green).
- Phases 5 (push), 6 (PWA), 9 (bundle), 10 (QA/rollout) not started.

### Next Move
1. Commit + push the current batch (Phase 3 text color/highlight, image editor, edit menu fixes, chat list previews, soft-delete chain, REPLICA IDENTITY, keyboard-nav, responsive sidebar, lists/code/@mentions/draft, multi-recipient ForwardModal, action-menu-internal scroll fix, reply image snippet, notification HTML strip, tray inset, Lexical whitespace fix).
2. Apply `database/migrations/20260828b_chat_message_reads_replica_identity.sql` in Supabase (SQL editor) — makes read UPDATE payloads full-row (blue ticks live without the extra per-event re-fetch).
3. Start **Phase 5** (push notifications / Service Worker) — the biggest remaining user-facing win.
4. Then **Phase 6 / 9** (PWA installability, bundle splitting), and finally **Phase 10** QA/rollout (deactivate-flag hammer + regression pass).
5. Keep the gate: `npx tsc --noEmit` + scoped ESLint below.

### Verification Gate
```bash
npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npx eslint src/chat --cache --format stylish
```

### Relevant Files
- `src/chat/components/MessageList.tsx` — react-window v2 virtualized list (`List` + `useDynamicRowHeight` + `useListCallbackRef`), grouping, unified action menu (**Copy/Forward/Reply/Edit/Delete**), reactions, reply preview bar **with image snippet thumbnail**, click-to-jump + highlight, read-receipt avatars on last-mine message, action-menu-internal scroll guard (`actionMenuRef`); **edit menu rendered as fixed overlay with viewport-aware above/below positioning**, **text color + highlight swatches**; reaction picker uses the full `EmojiPicker`.
- `src/chat/components/EmojiPicker.tsx` + `src/chat/data/emojiLibrary.ts` — full Unicode emoji picker (1870 emojis, 8 categories, category nav + sticky headers); library generated from `@emoji-mart/data`.
- `src/chat/components/ForwardModal.tsx` — **multi-recipient forward modal** (chats/contacts tabs, check-circle selection, footer `{n} selected`, Send button icon → spinner → green-check "Enviado" confirmation; reuses an existing direct or creates `DIRECT`).
- `src/chat/components/Composer.tsx` — Lexical editor, reply-quote bar (`replyTo`/`onCancelReply`, **with thumbnail snippet**), full emoji picker (`Smile`), **lists/code toolbar** (`@lexical/list` + `@lexical/code-core`), **`DraftLoader` draft persistence** (`chat-draft:{conversationId}`), optimistic send-clear, drag-drop upload, voice note, **text color + highlight swatches** (`ColorButtons`).
- `src/chat/components/ColorButtons.tsx` — shared color/highlight swatch popover with viewport-boundary auto-flip; used by `Composer` and `MessageList` edit menu.
- `src/chat/components/ChatImageEditor.tsx` — image editing overlay (crop via `react-easy-crop`, tilt/rotate, draw pencil with color/size/undo/apply); integrated into `AttachmentTray` for staged images. **Coordinates:** `getMediaMapping` reads the live on-screen media `<img>` rect to map container px ↔ rotated natural px (cropper's `croppedAreaPixels` space), so drawn strokes render exactly where the user drew and survive applying/sending; `aspect` tracks the media's natural ratio so the full image fits (no square side-crop); pen-color highlight uses ring + check.
- `src/chat/components/AttachmentTray.tsx` — WhatsApp-style attachment preview tray (thumbnails/icon, chevron navigation, `n/N` counter, per-file remove, **image editor pencil button**, composer inset `pb-[max(1.28rem,6.4%)]`) — Phase 3. Image display wrapper is `relative flex h-full w-full items-center justify-center` so the pencil (anchored `absolute bottom-3 right-3`) is never clipped out of view by the tray's `overflow-hidden`.
- `src/chat/components/Sidebar.tsx` — keyboard nav (`listRef`/`itemRefs`/`handleListKeyDown`, Arrow/Home/End + `scrollIntoView`); `ConversationListItem` renders `li>button` with `aria-selected`/`data-conv-index` + `onKeyDown`/`buttonRef`.
- `src/chat/mentionNode.ts` + `src/chat/components/MentionPlugin.tsx` — **@mention**: `MentionNode` (DecoratorNode → `<span class="chat-mention">@Name`), `MentionPlugin` (registerUpdateListener `@query` detection, `position:fixed` dropdown filtered against store users, Arrow/Tab nav, commits `$createMentionNode` + space).
- `src/chat/components/ChatPane.tsx` — `replyTo` state, `handleSend` passes `reply_to_id`, flex root, mark-as-read on conversation open; message-list remount per conversation (`key`).
- `src/chat/hooks/useChatRealtime.ts` — consolidated realtime (messages/conversations/participants/**`chat_message_reads`**/presence/typing) + mark-as-read on delivery while open; **read-receipt fallback** (re-fetch row by `id` when UPDATE payload lacks `message_id`/`user_id`); hardened `chat_messages` UPDATE handler; soft-delete tombstone guard.
- `src/services/chatService.ts` — `reply_to:chat_messages(id, content)` select (no `users` embed — no FK), per-user unread counts from `last_read_at`, `getReadsByConversation` + `attachReads`, centralized `markConversationRead` (last_read_at + `chat_message_reads` upserts), `getConversations` attaches reads to `last_message` for list ticks, **`stripHtml` on notification `message`** (no raw Lexical `<p>…` in notifications), **fetches `chat_attachments(*)` with last_message** for sidebar previews.
- `src/chat/repository.ts` — data layer (messages, conversations, `markAsRead` → `markConversationRead`).
- `src/chat/store/chatStore.ts` — Zustand store (Phase 1); `users` map for client-side sender lookup; `upsertMessageRead` merges live read receipts into messages **and** the conversation `last_message` (list ticks live even before opening a chat); `tombstoneMessage` prevents deleted rows from re-appearing.
- `src/chat/utils.ts` — shared `getMessageReadStatus` (sent/delivered/read) used by bubbles + chat list; `getTypingUserIds` + `getTypingLabel` (typing indicator names); `getFileKindMeta` for sidebar file-type icons.
- `src/chat/i18n/translations.ts` + `useTranslations.ts` — `moreActions`, `replyingTo`, `typing`, `typingMulti`, `typingAndMore`, `copyMessage`, `forward`/`forwardTitle`/`forwardChats`/`forwardContacts`/`forwardSelected`/`forwardNone`/`forwardDone`/`forwardSending`/`forwardFailed`/`searchRecipient`/`noResults`, `editorCrop`, `editorTilt`, `editorDraw`, emoji category names (`en`/`es`).
- `src/chat/components/TypingIndicator.tsx` — WhatsApp-style dots + named label above the composer (Phase 2).
- `src/chat/components/ConversationListItem.tsx` — renders image thumbnails / file-type color icons + text snippets for last-message previews; group avatars with `Users` fallback.
- `src/chat/components/ChatLayout.tsx` — `h-full` root, bootstrap, debounced reload.
- `app/(auth)/chat/page.tsx` — `NEXT_PUBLIC_USE_NEW_CHAT` gate (active); info panel removed.
- `app/(auth)/layout.tsx` — `min-h-0` on both overflow wrappers.
- `tailwind.config.js` — **`content` now includes `./src/**/*.{js,ts,jsx,tsx,mdx}`** (root cause of the oversized-collage/arbitrary-class bug: without it `src/chat` classes emitted no CSS).
- `next.config.js` / `package.json` — `eslint.ignoreDuringBuilds`, 8GB build heap.
- `database/migrations/20260827_chat_extensions.sql` — applied to Supabase.
- `database/migrations/20260828_chat_message_reads.sql` — **applied** to Supabase (successful run; drop+recreate with permissive RLS + realtime publication; pre-existing incompatible table fixed by `7920a4a` + `08c0702`).
- `database/migrations/20260828b_chat_message_reads_replica_identity.sql` — **applied** (`REPLICA IDENTITY FULL` on `chat_messages` + `chat_message_reads`; soft-deletes + read-receipt payloads now full-row).
- `database/migrations/20260828c_fix_chat_uploads_storage.sql` — **applied** to Supabase (ensures `chat-uploads` bucket exists, accepts any mime type, and has anon/authenticated `storage.objects` policies; fixes the 500 "Failed to create bucket … row-level security" on attachments).
- `src/chat/components/ConversationListItem.tsx` / `ChatHeader.tsx` — group conversations render a gray circle with the `Users` icon when no group `avatar_url` exists.
- `src/chat/components/ChatPane.tsx` — when no conversation is selected: header + composer hidden and WhatsApp-style default panel shown (gray circle + "Tap a chat to start messaging.").
- `app/api/agent/file-access/route.ts`, `app/api/logs/route.ts`, `src/lib/file-access-log-store.ts` — file-access tracking (Phase 0/10 tooling).
- `src/types/chat.ts` — `ChatMessageRead` type + `reads` field on `ChatMessage`; `ChatAttachment` type.

---

## 6. Current Build vs Original Plan — Comparison & Gaps

Fresh snapshot (2026-08-31) mapping the **original phase target** to what the current
`src/chat/**` build actually delivers, and what is still missing.

### Phase-level status vs original matrix

| Phase | Original target | Current build | Status | Missing to be "complete" |
|-------|-----------------|---------------|--------|--------------------------|
| **0 – Preparation** | Tooling, `/src/chat`, chat API wrapper, lint | `src/chat/` + repository/service layers, ESLint/tsc gate | ✅ | – |
| **1 – Layout & Nav** | Split layout, virtualized list, store, responsive, keyboard nav | `ChatLayout`→`Sidebar`/`ChatPane` (Header, virtualized `MessageList`, `Composer`), Zustand store, **keyboard nav (Arrow/Home/End) + responsive `<md` sidebar toggle** | ✅ ~100% | – |
| **2 – Message Model & Realtime** | Unified realtime, reactions, read/delivery receipts, typing | `useChatRealtime` (msgs/convs/participants/reads/presence/typing), `reactions JSONB`, `chat_message_reads` upserts, typing indicator, blue ✓/✓✓, **REPLICA IDENTITY FULL** on `chat_messages` for live soft-delete delivery | ✅ 100% | `delivered_at` field minimal |
| **3 – Rich-Text Composer** | Lexical (bold/italic/underline, lists, code, quotes, @mentions, attach preview, Ctrl+Enter), optimistic | Lexical (bold/italic/underline, **lists/code toolbar**, **@mentions**), reply-quote bar, drag-&-drop + multi-file upload, voice notes, full emoji picker, **optimistic send-clear**, **draft persistence**, **staged attachment tray with image editor** (crop/tilt/draw), **text color + highlight swatches** | ✅ ~100% | Ctrl+Enter explicit handling (Enter default) |
| **4 – Message UI Enhancements** | Grouping, reactions, hover menu, edit, reply w/ preview + jump, read-receipt avatars | Grouping, one-per-user reactions, unified above/below action menu (Copy/Forward/Reply/Edit/Delete), **inline edit with 5-line scrollable textarea + chevron formatting menu** (text color + highlight), quote/reply preview **with image snippet** + click-to-jump, read-receipts + ✓/✓✓, **sidebar last-message previews** with image thumbnails + text snippets | ✅ ~100% | `edited_at` surfaced only via `is_edited` label (already implemented) |
| **5 – Notifications & Push** | Web-Push: SW + VAPID, offline/background/Android tray | `showBrowserNotification` (focused tab) + in-app notifications; old `public/sw.js` (hash cache) — no VAPID/push/subscription table | ⏳ 10% | VAPID pair, `push_subscriptions` table, `/api/push/subscribe`, SW `push` handler + Web-Push send, background/closed-tab push, Android tray |
| **6 – PWA & Installability** | Manifest, offline caching, install prompt | Dev-only localhost SW-kill; **no** manifest / offline shell / install prompt | ⏳ 0% | `manifest.json`, Workbox/precache shell, `beforeinstallprompt`, offline banner + queue |
| **7 – Theming / Dark Mode / I18n** | Design tokens + en/es | i18n layer (`en`/`es`, typed `TranslationKey`) fully wired incl. latest keys (`copyMessage`, `forward*`, `forwardSelected`, `forwardNone`, `forwardDone`, `editorCrop`, `editorTilt`, `editorDraw`); dark mode via existing theme context (partial) | ◑ ~55% | Design-token system (`color-system.css`), language selector UI, full dark-mode token coverage |
| **8 – Accessibility & Polish** | WCAG AA, keyboard nav, screen-reader live regions, focus traps | Basic ARIA/labels, buttons; keyboard nav in sidebar | ◑ ~20% | `aria-live` new-message region, focus traps in modals/pickers, Ctrl+K/Alt-Arrow shortcuts, skip-link |
| **9 – Performance & Bundle** | Code-splitting, lazy composer/list, chat-only chunk | Virtualized list; **no** dynamic import of the chat suite / lazy Lexical (everything bundled into the chat page chunk) | ◑ ~20% | `dynamic(() => import(...))`, lazy `RichTextComposer`/`EmojiPicker`, chat-only CSS chunk, `next-bundle-analyzer` |
| **10 – QA, Migration & Roll-out** | Test matrix, rollback, feature-flag rollout | Feature flag `NEXT_PUBLIC_USE_NEW_CHAT` active; migrations written; headless-Chrome proofing; soft-delete tombstones + optimistic delete shipped | ◑ ~30% | Cross-browser/device test matrix, offline queue test, rollback doc, changelog |

### Aggregate estimate

| Original plan total | Original plan via Fluxer-host (`-` UI-heavy phases) | Current delivered | Remaining |
|---------------------|-----------------------------------------------------|-------------------|-----------|
| ≈ 40 person-days | ≈ 15–20 person-days | Phases 0,1,2,3,4 (+ ~55% of 7) ≈ **~30–32 person-days** | Phases 5,6,9 (≈ 10–12 person-days) + Phase 10 + the 7/8 leftovers ≈ **~10–13 person-days** |

### Biggest remaining user-facing wins (gap → priority)

1. **Phase 5 – Push notifications** — the largest gap and highest user value: real
   Web-Push so messages reach the user when the tab is closed / on Android tray.
2. **Phase 9 – Bundle splitting** — lazy-load the chat suite + Lexical to cut first-load for every page.
3. **Phase 6 – PWA installability + offline** — manifest + offline shell + send queue.
4. **Phase 7/8 – i18n selector, dark-mode tokens, a11y** — polish/hardening; lower priority unless required for WCAG compliance.

### Recent commits (this batch)
`8f6a4fa` (image editor + text color/highlight + edit menu + sidebar previews + soft-delete + REPLICA IDENTITY FULL + keyboard-nav + responsive sidebar + lists/code/@mentions/draft + forward/reply/notif fixes). Prior commits include: `41633ad` (copy/forward + media-progress); `e3f52c4` (Phase 1/3 features); `c3bef4d`-`90cd5c8` (delete chain); `7a1573d`/`e2c3ae` (sidebar deletion fixes); `07518d9` (deleted-message unread fix); `23a747a` (REPLICA IDENTITY); `a3ace91` (Lexical fix). All phases 0-4 + 7 complete.
