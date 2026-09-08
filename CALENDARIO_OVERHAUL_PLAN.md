# Calendario Overhaul Plan (Diamond Link) — React-Big-Calendar (RBC) Edition

> **Last updated:** 2026-09-08 · **Status:** Phases 0–1 complete (`████████░░░░░░░░░░░░ 40%`)
>
> This plan keeps the point-for-point structure of `CHAT_OVERHAUL_PLAN.md` (same 11-phase
> skeleton, quick/full/original matrices, analysis, comparison, effort, priority,
> divergences, work state, next move, verification gate, relevant files, Phase 10 QA +
> rollback + changelog) **adapted** so the calendario's view engine is
> **`react-big-calendar` (RBC)** instead of a bespoke grid.
>
> **What changes vs the bespoke plan:** Month/Week/Day/Agenda rendering, date math,
> overlap/duration layout, view-switching and (desktop) drag-and-drop are delegated to
> RBC + `date-fns`. Custom flows stay 100% ours: Clerk auth, Supabase realtime & data,
> **all dental-domain options already in the page are preserved** — `PROCEDURES`,
> `DENTISTS`, `EVENT_COLORS` (teal/blue/violet/rose/amber/emerald swatch), patient
> search + linkage, invitee search, multi-reminders, status/priority chips, es-HN
> formatting, and push notifications (ported onto the chat web-push pipeline).
>
> **Baseline (current, 2026-09-08):** a *functional* `/calendario` exists — custom month
> grid + day panel + tasks + reminders, CRUD via `/api/events|tasks|reminders`, bell
> notifications — but it sits on **two disconnected data models**, has **live auth/RLS
> holes**, a **timezone shim**, **no realtime on the data it actually reads**, and
> **no chat-grade polish**. This overhaul re-founds the data/security/notifications
> layers exactly like chat, and swaps the view layer to RBC.
>
> **Effort impact of RBC:** Phases 1 + 4 shrink (~6 → 3 days); Phase 3 gains RBC slot
> selection handlers. Aggregate ≈ **24–26 person-days** (from ~32 bespoke).

---

## RBC architectural integration strategy

1. **View engine:** `react-big-calendar` + `date-fns` localizer (`format`, `parse`,
   `startOfWeek`, `getDay`, `es` locale) with `Views.MONTH | WEEK | WORK_WEEK | DAY | AGENDA`.
2. **Custom components:** inject `components.event`, `components.agenda.event`,
   `components.toolbar`, `components.header` so dental styling survives — dentist color
   dots, procedure badges, patient labels, status chips, `EVENT_COLORS`.
3. **Interactivity:** RBC `onSelectSlot` → pre-filled `EventModal`; `onSelectEvent` →
   detail drawer; `withDragAndDrop` (drag/resize) with optimistic react-query mutations
   and a chair/cubicle overlap check.
4. **Data bridge:** strict mapper `ClinicEvent` ↔ `RBCEvent` (`id`, `title`, `start`,
   `end`, `resource: ClinicEvent`) in `src/calendario/adapters/rbcAdapter.ts`; the domain
   object rides along in `resource` so no domain data is lost through RBC.
5. **Known constraints (documented, not silent):**
   - DnD addon (`react-big-calendar/lib/addons/dragAndDrop`) needs peer deps
     **`react-dnd` + `react-dnd-html5-backend`** (install both; the addon is not a
     standalone npm package).
   - HTML5 backend doesn't emit touch events on mobile — desktop DnD only; mobile moves
     go through the detail drawer (tap → edit times). Accept as platform behavior.
   - RBC official peer range targets React ≤ 18 — verify against the app's React 19
     (Next.js 15); if peer warnings appear, add an `overrides`/`resolution` pin and
     smoke-test drag/resize on the deployed build (QA C10–C12).
   - RBC calendar is `client-only` → load via `next/dynamic(…, { ssr:false })` with a
     `CalendarSkeleton` fallback.

---

## Audit summary (current state, 2026-09-08)

1. **Two parallel calendar worlds.**
   - **Live "simple" model (what the UI reads/writes):** `events`, `tasks`, `reminders`,
     `event_invitees` (`database/migrations/create_new_calendar_tables.sql` +
     `extend_new_calendar_with_invitees.sql`); SERIAL ids; `date`/`start_time`/`end_time`
     are **plain strings** (`src/lib/types-calendar.ts`: `ClinicEvent`/`Task`/`Reminder`,
     `PROCEDURES`/`DENTISTS`/`EVENT_COLORS`); routes `app/api/events*`, `app/api/tasks`,
     `app/api/reminders`; UI `components/calendar-new/*`.
   - **Orphaned "UUID/legacy" model:** `calendar_events/tasks/reminders/invitees` (UUID),
     `src/services/calendar*`, RPC `get_user_events`/`get_user_tasks`, routes
     `app/api/calendar/*`, realtime service, `src/types/calendar*.ts`. **No rendered UI
     consumes it.** Two routes carry `// TODO: Re-enable authentication` + `created_by:
     'temp-user'`.
2. **Auth/security holes (live, must close first).** `middleware.ts` treats `/api/(.*)`
   as public and has a "TEMPORARY Allow basic access" list that lets any authenticated
   user into `/calendario` (role map says `admin|doctor|assistant`, bypassed in practice).
   Calendar APIs trust the client `x-user-id` header with **no server-side verification**
   (`app/api/events/route.ts::getUserAndToken` ignores the Bearer token).
   `/api/notifications/send-to-user` has **no auth at all**. RLS state on the live tables
   is inconsistent (a trail of `temporarily_disable_rls` / `final_rls_fix` scripts).
3. **Timezone shims, not correct storage.** In-code `SimpleTimezoneFix` (subtract 6 h,
   hardcoded `America/Tegucigalpa`) + data fix scripts adding `+ INTERVAL '6 hours'`.
   `Dashboard` builds `selectedDate` from `new Date().toISOString().slice(0,10)` (UTC →
   off-by-one after ~6 pm local). Three reminder stores coexist (`reminders`,
   `event_reminders`, `calendar_reminders`).
4. **Realtime wired to the wrong tables.** `calendarRealtimeService` subscribes to
   `calendar_events/tasks/reminders/invitees`; the publication covers only the first
   three (drift), and calendar tables lack REPLICA IDENTITY FULL; the only live consumer
   (`CalendarNotificationCounter`) is dead UI.
5. **Notifications skip the push pipeline.** Event/reminder/invitee sends go to the
   `notifications` table via `/api/notifications/send-to-user` (unauthenticated) and the
   in-app bell; nothing flows through the chat web-push pipeline (VAPID + 
   `push_subscriptions` + `public/sw.js`). Dashboard "Próximos Eventos" is N+1.
6. **No i18n layer, chat-only theming.** Mixed `en-US`/`es-HN`/`es-ES` locale calls;
   `app/color-system.css` tokens are chat-scoped; calendar hardcodes `teal-*`/`dark:`.
7. **A11y & perf not addressed.** No focus trap in `EventModal` (883 lines), no
   `aria-live` on toasts, no keyboard nav, no `prefers-reduced-motion`; `/calendario`
   ships the modal in the initial bundle; react-query + react-window installed but
   unused here; `/calendario` **not** in the SW offline precache.
8. **Migrations are unversioned.** Calendar SQL is loose/unnumbered with a manual
   trial-and-error history; no applied-ledger (chat has date-prefixed `2026090x`).
9. **Dead surface:** `components/calendar-new/UpcomingEvents.tsx` (zero importers),
   `components/gestures/SwipeCalendar.tsx` (unused for calendar), old
   `components/calendar/*` (gone from disk; survives only in the stale
   `CALENDAR_SYSTEM_DOCUMENTATION.md`), `diamond-calendar-app/` (compiled-only Vite
   experiment, zero references).

---

### Quick Status Summary (RBC-adapted)

| # | Phase | Status | Progress | Key evidence | Remaining gaps |
|---|-------|--------|----------|--------------|----------------|
| **0** | Foundation, Data Model & Security | ✅ | `████████████████████ 100%` | Two models coexist; RLS inconsistent; `x-user-id` trust; `/api/(.*)` public; `send-to-user` unauthenticated; timezone shims; unversioned SQL | Canonical `events` family; Clerk-session auth; RLS ownership predicates; timezone policy + RBC localizer alignment; versioned migrations + `NEXT_PUBLIC_USE_NEW_CALENDARIO` |
| **1** | RBC Layout & Navigation Engine | ✅ | `████████████████████ 100%` | Custom month-only `CalendarGrid` + `DayDetail`; `en-US` label; framer-motion tiles | Install `react-big-calendar` + `date-fns`; localizer (es, Monday start); Month/Week/Work-Week/Day/Agenda; toolbar → URL sync (`?view=&date=`); responsive shell |
| **2** | Data Layer, RBC Bridge & Realtime | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Raw `fetch` + `Promise.all` + refetch-all; react-query unused; realtime on orphaned tables; no REPLICA IDENTITY; N+1; public `Cache-Control:7200` | Repository layer; `rbcAdapter` (`ClinicEvent` ↔ `RBCEvent`); react-query per user/range; realtime on live tables + REPLICA IDENTITY FULL + publication fix; dedupe; batched participants; remove stale caching |
| **3** | Slot Selection & Event Modal UX | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | 883-line `EventModal` monolith with patient/invitee search, colors, multi-reminders, delete | Split into modular steps (Zod + RHF): Details → Timing (pre-filled from RBC slot) → Invitees & Reminders; `onSelectSlot` quick-add; `onSelectEvent` detail drawer; draft persistence |
| **4** | Custom RBC Rendering & DnD | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Custom month cells + dots today; no week/day/agenda; no drag | Custom RBC `components.event` (procedure badge, patient name, dentist color dot, `EVENT_COLORS`); agenda rows = WhatsApp-style with status chips; `withDragAndDrop` drag/resize + optimistic updates + chair/cubicle overlap check (desktop) |
| **5** | Notifications & Push Pipeline | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Bell + `notifications` table; unauthenticated `send-to-user`; no web-push; 3 reminder stores; dead `CalendarNotificationCounter` | One reminder schedule; pg_net trigger on `events`/`event_invitees` → `/api/push/webhook` (calendar payload); SW calendar cards (aggregated per event); `notificationclick` → `/calendario?view=day&date=&eventId=`; secure send routes; bell+push parity |
| **6** | PWA & Offline | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `sw.js` precache excludes `/calendario`; react-query no persister; Capacitor installed/service gone | Precache `/calendario` + RBC CSS; `react-query-persist-client` IndexedDB read cache + "Última sincronización"; offline create/reschedule queue (mirror chat `offlineQueue`) |
| **7** | Theming & i18n (es-HN) | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `--fd-*` tokens chat-scoped; calendar hardcodes `teal-*`; mixed locales | `app/styles/rbc-theme.css` mapping `.rbc-*` to `--fd-*` (dark mode); typed es/en i18n (`CalendarTranslationKey`); `date-fns/locale/es` localizer + Monday `startOfWeek`; central es-HN `America/Tegucigalpa` formatter |
| **8** | Accessibility & Keyboard Nav | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Loading/error states; no focus trap, `aria-live`, grid keyboard nav, reduced-motion | `useFocusTrap` on modal/drawer; `aria-live` for save/reschedule ("Cita cambiada a las 10:00"); RBC toolbar + event keyboard pass; skip-link; icon labels; reduced-motion; contrast bumps |
| **9** | Performance & Dynamic Bundling | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `EventModal` in route bundle; no `next/dynamic`; N+1; react-window unused | `next/dynamic` RBC (`ssr:false`) + `CalendarSkeleton`; lazy modal/drawer chunks; `@next/bundle-analyzer` report; virtualize agenda; batched participants; First Load target before/after |
| **10** | Final QA, Migration & Roll-out | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | No QA matrix/rollback/changelog; unversioned SQL; stale docs | Execute **C01–C36** (RBC DnD, timezone, role gating, offline queue, web push); migration ledger; rollback plan; changelog; refresh `CALENDAR_SYSTEM_DOCUMENTATION.md`; live axe/Lighthouse + NVDA/VoiceOver |

Aggregate: **Baseline functional; overhaul planned (~0%). Est. ≈ 24–26 person-days (RBC).**

---

| # | Phase | Status | Progress | Current state (evidence) | Remaining gaps (phase scope) |
|---|-------|--------|----------|--------------------------|------------------------------|
| **0 – Foundation, Data Model & Security** | ✅ | `████████████████████ 100%` | Live `events`/`tasks`/`reminders`/`event_invitees` (SERIAL, string dates, `src/lib/types-calendar.ts`) vs orphaned UUID `src/services/calendar*` + RPCs + `app/api/calendar/*`; RLS partial/experimental; `app/api/events/route.ts::getUserAndToken` trusts `x-user-id` (Bearer ignored); `middleware.ts` `/api/(.*)` public + TEMPORARY allow-list; `/api/notifications/send-to-user` unauthenticated; `SimpleTimezoneFix` −6 h shim + `+6h` data-fix scripts; unversioned SQL | **Canonical model:** keep live `events` family as the data core (UI + data + RBC adapter target); port invitee/reminder/realtime onto it; DELETE UUID services/types/routes/RPCs. **Security:** identity from Clerk session server-side everywhere (never the header); middleware gating for `/calendario` (admin\|doctor\|assistant); secure `send-to-user`; RLS ownership + invitee predicates on every live table. **Timezone:** explicit clinic-local policy + RBC localizer under `America/Tegucigalpa`; remove −6h/+6h shims. **Versioning:** date-prefixed migrations + ledger; **feature flag** `NEXT_PUBLIC_USE_NEW_CALENDARIO` + page-loader (fallback = current Dashboard). | **✅ Delivered & live-tested (commits `d4af0c2` + fix `5155588`, 2026-09-08):** UUID layer deleted (services `src/services/calendar*.ts` + `inviteeNotificationService.ts`, types, `app/api/calendar/**`, `components/ui/CalendarNotificationCounter.tsx`, DB tables + `get_user_events`/`get_user_tasks` RPCs); live CRUD routes hardened to Clerk-session auth via `src/lib/calendarAuth.ts` (`authorizeCalendar`/`getCalendarSession`/`roleFromSessionClaims`) + service-role client; invitee routes gated owner/member (23505→409); `send-to-user` now `auth().userId`; `middleware.ts` role-gates `/calendario` (allow-list removed); patients `[id]/events` + `patientService` repointed to canonical `events`; timezone policy `src/calendario/timezone.ts` (`America/Tegucigalpa`, `clinicDateKey`) wired into `/upcoming`, `fix_existing_event_timezones.sql` deleted; feature flag `NEXT_PUBLIC_USE_NEW_CALENDARIO` + dynamic loader (fallback = Dashboard). **Migrations applied + verified live** (`LEDGER.md`): anon locked out of all five canonical tables (`42501`, probe-verified), legacy tables dropped, RLS recursion (`42P17`) found & fixed. **Remaining:** flip flag → `true` once the RBC shell ships (Phase 1) |
| **1 – RBC Layout & Navigation Engine** | ✅ | `████████████████████ 100%` | Custom month-only `CalendarGrid` (42 cells, `en-US`), `DayDetail`, `TaskPanel`, `ReminderPanel`; framer-motion; full-screen spinner; no week/day/agenda | Install `react-big-calendar` + `date-fns` (+ dnd peers `react-dnd`, `react-dnd-html5-backend` once Phase 4 lands); `dateFnsLocalizer` (`es` locale, Monday `startOfWeek`); shell: `Views.MONTH/WEEK/WORK_WEEK/DAY/AGENDA`; toolbar (Today/Back/Next/View) bound to URL `?view=&date=`; responsive `< lg` layout; `next/dynamic(…, {ssr:false})` + `CalendarSkeleton`. | **✅ Delivered (2026-09-08):** `react-big-calendar@1.20.0` + `@types/react-big-calendar` installed (React 18 — no 19 peer concern; `date-fns@4` already present, `es` via `date-fns/locale`); `dateFnsLocalizer` (es, Monday start) + Spanish `messages`; `src/calendario/rbcAdapter.ts` (`clinicEventToRbc` start/end on clinic-local Date, `resource` = `ClinicEvent`); `src/calendario/RbcCalendar.tsx` (heavy chunk) shows `MONTH/WEEK/WORK_WEEK/DAY/AGENDA`, `selectable`, popup overflow, event colored via `eventPropGetter`; `src/calendario/CalendarShell.tsx` = flagged path (RBC + reused `DayDetail`/`TaskPanel`/`ReminderPanel`/`EventModal`, CRUD via existing API) with **URL sync `?view=&date=`** (`history.replaceState`, no `useSearchParams`/Suspense) + `CalendarSkeleton` via `next/dynamic ssr:false`; `components/calendar-new/CalendarShell.tsx` placeholder deleted; loader repointed to `@/calendario/CalendarShell`; **flag `NEXT_PUBLIC_USE_NEW_CALENDARIO=true`**; `next build` green — `/calendario` route 2.07 kB, RBC in separate 92 kB lazy chunk + own CSS; gate clean (tsc + scoped ESLint). **Remaining (Phase 2+):** react-query + realtime, slot→modal prefill + modal split (Phase 3), custom pills/agenda rows + DnD (Phase 4). |
| **2 – Data Layer, RBC Bridge & Realtime** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `Dashboard` raw `fetch`/`Promise.all` + refetch-every-action; react-query provided (`contexts/QueryProvider`) unused; `calendarRealtimeService` watches orphaned UUID tables (`calendar_invitees` subscribed, not published; no REPLICA IDENTITY); dashboard N+1 participants; middleware `Cache-Control: public, max-age=7200` | Single repository (mirror `src/chat/repository.ts` + service split); **`src/calendario/adapters/rbcAdapter.ts`** (`ClinicEvent` → `RBCEvent {id,title,start,end,resource}` + inverse); react-query `useCalendarEvents(range)` per user w/ optimistic updates + invalidate-on-action; realtime `postgres_changes` on **live** tables (+ `event_invitees` to publication, REPLICA IDENTITY FULL) → cache invalidation; dedupe + tombstone guard; batched `/api/events/participants?ids=`; drop public cache header on user-scoped APIs. |
| **3 – Slot Selection & Event Modal UX** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `EventModal.tsx` (883 lines): patient search, invitee search (`/api/users`), `EVENT_COLORS` swatch, multi-reminder, delete; `TaskPanel` inline add/toggle/delete; no Zod/RHF | RBC callbacks: `selectable={true}`, `onSelectSlot={({start,end}) => openCreateModal(start,end)}`, `onSelectEvent={({resource}) => openDetailDrawer(resource)}`; refactor into modular steps (**Zod + RHF**): *Details* (patient `/pacientes` search, procedure `PROCEDURES`, dentist `DENTISTS`) → *Timing* (pre-filled from RBC slot, same field set that persists today) → *Invitees & Reminders* (assistants, multi-reminders); quick-add prefill from slot; edit-in-drawer; draft persistence (`calendar-draft:{date}`); delete-confirm. **Custom options preserved end-to-end.** |
| **4 – Custom RBC Rendering & DnD** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Month dots, per-day lists, string status/priority/type, `EVENT_COLORS` | Custom RBC `components`: event pill (procedure badge, patient name, **dentist color dot**, `EVENT_COLORS`), `agenda.event` WhatsApp-style rows with status chips (Confirmed/In Progress/Completed/Cancelled), `toolbar` (ours, i18n), `header` (Monday-first es); `withDragAndDrop`: `onEventDrop`/`onEventResize` → optimistic react-query mutation + server save + **chair/cubicle overlap check**; desktop DnD only (mobile via drawer edit — platform constraint, documented). |
| **5 – Notifications & Push Pipeline** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Bell + `notifications` table + `useNotificationListener` (→ `/calendario`); `inviteeNotificationService`/`calendarReminderService` → unauthenticated `send-to-user`; calendar never touches chat web-push; `CalendarNotificationCounter` dead UI | **Single reminder schedule** (retire the 3 stores); pg_net trigger on live `events`/`event_invitees` INSERT → `/api/push/webhook` (**calendar payload type**, secret-gated, hits same VAPID/`push_subscriptions`/`public/sw.js` pipeline as chat); SW renders per-event tray cards (aggregated like chat per-thread, `tag:'calendar-<eventId>'`, `renotify`); `notificationclick` → `/calendario?view=day&date=YYYY-MM-DD&eventId=X`; secure `send-to-user` (service-role/signed); bell + push read parity; role-aware recipients (`created_by`, invitees via `event_invitees`, task `assigned_to`). |
| **6 – PWA & Offline** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `public/sw.js` chat-centric (CACHE_NAME v10); `scripts/build-sw-precache.mjs` precaches chat + shell — **`/calendario` excluded**; react-query no persister; Capacitor deps installed/service gone | Add `/calendario` + `/app/styles/rbc-theme.css` + RBC CSS to the precache manifest; **`react-query-persist-client`** IndexedDB read cache + "Última sincronización" banner; **offline create + reschedule queue** (mirror chat `offlineQueue`/`useOfflineQueue`: amber pill, flush in order on reconnect); CACHE_NAME bump discipline; Capacitor deferred (PWA-first). |
| **7 – Theming & i18n (es-HN)** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `--fd-*` tokens chat-scoped; calendar hardcodes `teal-*`/`gray-*` + `dark:`; locale mixing `en-US`/`es-HN`/`es-ES` | **`app/styles/rbc-theme.css`**: map `.rbc-calendar/.rbc-header/.rbc-time-content/.rbc-event/.rbc-today` to `--fd-*` tokens, full dark-mode; typed i18n layer (`src/calendario/i18n/…`, `CalendarTranslationKey`, es-first server default, reusing chat's `DocumentLang` for `<html lang>`); **`date-fns/locale/es`** localizer + Monday `startOfWeek(date,{weekStartsOn:1})`; central es-HN `America/Tegucigalpa` formatter (Android WebView-safe `safeLocaleDate` fallback); weekday/month labels es. |
| **8 – Accessibility & Keyboard Nav** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | Loading + error + "No autorizado" states; no `useFocusTrap`; no `aria-live` toasts; no keyboard nav; no reduced-motion handling | **`useFocusTrap`** on `EventModal`/detail drawer/menus; **`aria-live="polite"`** for save/send/reschedule ("Cita cambiada a las 10:00 AM") + toast/reminder announcements; ARIA labels on all icon-only buttons; RBC keyboard pass (toolbar buttons, event focus/Enter, `role="grid"` semantics where RBC exposes them); skip-link → `#calendario-content`; focus restore; `prefers-reduced-motion` guards on framer-motion + RBC transitions; AA contrast bumps on muted grays; `role="main"` landmark. |
| **9 – Performance & Dynamic Bundling** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | `/calendario` static-imports suite; `EventModal` 883 lines in route bundle; no `next/dynamic`, no `optimizePackageImports`; react-window unused; dashboard N+1; public `max-age=7200` | `next/dynamic` RBC: `const BigCalendar = dynamic(() => import('react-big-calendar').then(m => m.Calendar), { ssr:false, loading: () => <CalendarSkeleton/> })`; lazy `ssr:false` chunks for `EventModal`/drawer/invitee search/reminder editor; `@next/bundle-analyzer` report (RBC + date-fns locale gzip impact recorded); react-window agenda virtualization on long days; batched participant/patient queries (no N+1); First Load JS before/after; remove stale public caching. |
| **10 – Final QA, Migration & Roll-out** | ◻ | `░░░░░░░░░░░░░░░░░░░░ 0%` | No matrix/rollback/changelog; unversioned SQL; stale 37 kB `CALENDAR_SYSTEM_DOCUMENTATION.md`; auth + timezone holes open | Execute **QA matrix C01–C36** (covers RBC DnD drag/resize, URL view sync, timezone 18:30-no-shift, role gating + forged `x-user-id`, offline create/reschedule queue, web push closed-app, reduce-motion/aria-live) across DC/DF/MC/CB/iOS/MW; timezone regression suite; versioned migration ledger; **rollback plan** (Tier 0 flag revert / Tier 1 migration reversibility / Tier 2 disable push); **changelog**; refresh docs to reality; live axe/Lighthouse + NVDA/VoiceOver pass; gate = `tsc` + ESLint. |

---

### Phase 10 — QA test matrix (RBC-adapted, draft — planned 2026-09-xx)

Live env + `NEXT_PUBLIC_USE_NEW_CALENDARIO=true`. Platform key: DC = desktop Chrome ·
DF = Firefox · DS = Safari(mac) · DE = Edge · MC = mobile Chrome/Android ·
CB = Chromebook (PWA) · iOS = Safari/Home-Screen PWA · MW = WebView.

| ID | Area | Test case | Platform | Expected result |
|----|------|-----------|----------|-----------------|
| C01 | Auth | Login → `/calendario` for `admin`/`doctor`/`assistant`; denied for others (server-level, not client hook) | DC, MC | Role gating enforced server-side |
| C02 | Auth | Forged/absent `x-user-id` rejected — identity from Clerk session | DC | 401 on mismatch |
| C03 | Auth | Cold-boot notification tap → `/calendario?view=day&date=&eventId=` (no sign-in bounce) | CB, MC | Opens event/day; no `/sign-in` redirect |
| C04 | Layout | RBC month view renders, today highlight, adjacent-month dim, view switcher | DC | Grid + toolbar correct |
| C05 | Layout | RBC week view: 7-day hour grid, prev/today/next, current-day highlight, overlapping events stack | DC, MC | Time-block alignment |
| C06 | Layout | RBC day view: timeline, sorted events, status/priority chips visible | DC | Order + chips correct |
| C07 | Layout | RBC agenda view: WhatsApp-style rows (patient, procedure badge, dentist dot, status chip) | DC | Custom `agenda.event` renders |
| C08 | Layout | URL sync: `?view=&date=` drives calendar; back/forward + refresh preserve view/date (SSR-safe `useSearchParams` guard) | DC | State restorable |
| C09 | Layout | Responsive: `< lg` grid usable; touch targets ≥ 44 px; day panel stacks | MC, CB | No horizontal scroll |
| C10 | DnD | **Drag** event to another slot → optimistic update, server save, realtime peers consistent | DC | Moved once, everywhere |
| C11 | DnD | **Resize** event end → optimistic update; duration recomputes (start preserved) | DC | Correct new end |
| C12 | DnD | Chair/cubicle overlap check: colliding same-dentist booking flagged/blocked with message | DC | Clear conflict UX |
| C13 | Data | Realtime: create in tab A → tab B instantly (react-query invalidated), deduped | DC ×2 | Live insert/update/delete |
| C14 | Data | Realtime delete: cancelled event disappears everywhere (REPLICA IDENTITY FULL) | DC ×2 | No resurrection |
| C15 | Data | Realtime invitee: adding an invitee triggers notification + event in invitee's session | DC ×2 | Bell + (granted) tray |
| C16 | Data | react-query: month/week navigation from cache, no full refetch; invalidation on action only | DC | No loading flash |
| C17 | Create | `onSelectSlot` blank slot → `EventModal` pre-filled (date + start/end) | DC, MC | Modal opens prefilled |
| C18 | Create | `onSelectEvent` → detail drawer (not modal) with edit + delete | DC | Drawer opens `resource` |
| C19 | Create | Zod/RHF inline validation (empty title, end < start, bad time) | DC | Messages under fields |
| C20 | Create | Multi-step Details → Timing → Invitees & Reminders; draft restored on reopen | DC | Steps persist |
| C21 | Create | Custom defaults preserved: procedure `PROCEDURES`, dentist `DENTISTS`, `EVENT_COLORS` swatch | DC, MC | All present & applied |
| C22 | Tasks | Add/toggle/delete task; overdue/upcoming groups correct | DC, MC | Priority sort + date grouping |
| C23 | Timezone | Create event 18:30 Honduras → displays 18:30 (RBC localizer, no UTC off-by-one); reload persists | DC, MC | No ±6 h shift |
| C24 | Timezone | Android WebView ICU fallback renders `es-HN` format (no RangeError) | MW | Sensible format |
| C25 | Patient | Event with `patient_id` → `/pacientes/[id]`; without → patient search modal | DC, MC | Correct destination |
| C26 | Push | Reminder fires tray (app closed) via web-push (calendar payload) | CB, MC | Visible; payload-correct |
| C27 | Push | Invitee notifications aggregate per event (like chat per-thread) + `renotify` | MC, CB | One card per event |
| C28 | Push | Body tap deep-links `/calendario?view=day&date=&eventId=` and selects event (no React #185) | CB, MC | Event/day opens |
| C29 | Notifications | Bell + push parity: mark-read in one clears the other | DC | Counts consistent |
| C30 | Offline | Airplane mode: `/calendario` shell + RBC CSS boot from SW precache with last-known data + banner | DC, CB | No white-screen; banner |
| C31 | Offline | Create/reschedule while offline → amber pill + queued; flush in order on reconnect | DC, CB | Lands once, ordered |
| C32 | i18n | es/en flips labels, months, weekdays, RBC toolbar, dates; week starts Monday | DC | No `en-US` leaks |
| C33 | Theming | Dark mode on month/week/day/agenda + modal: `--fd-*` tokens only (no hardcoded teal) | DC, MC | Consistent tokens |
| C34 | A11y | Keyboard-only: Tab through modal, Esc close, focus trap + restore; RBC toolbar/events focusable | DC | No dead-ends |
| C35 | A11y | NVDA + VoiceOver: `aria-live` announces new event/save/reschedule; skip link; `prefers-reduced-motion` disables RBC/framer transitions | DC (Win), iOS | Screen reader confirms; no motion |
| C36 | Rollout | Flag off → current `Dashboard` renders; legacy `/api/calendar/*` 404s; no dead imports; docs + migration ledger current; gate `tsc`+ESLint green | DC | Clean fallback + green build |

**Regression pair (two-user smoke, 10 min):** A invites B → C01, C03, C08, C13–C15, C23,
C26–C28 (A cold-boots, B schedules with patient+invitee+reminder; verify aggregation,
deep-link, offline queue).

---

### Phase 10 — rollback plan (draft)

**Tier 0 — instant (feature flag).** `NEXT_PUBLIC_USE_NEW_CALENDARIO=false` redeploy →
current `Dashboard` (baseline) renders; data impact none (overhaul writes the same live
tables). Verify a full login → month → create flow before declaring rollback complete.

**Tier 1 — migration reversibility.** Only canonical-model migrations in scope (once
versioned `202XXXX_…`). RLS/auth hardening reverted by restoring prior policies (saved
in the migration files). RBC itself is a front-end dep — pin the `react-big-calendar` /
`date-fns` versions so a bad upgrade can be reverted by redeploy alone.

**Tier 2 — disable notifications (isolated).** Disable the calendar push trigger /
`send-to-user` path; optionally purge calendar push IDs; SW stays (harmless idle).

---

### Changelog (to be drafted at Phase 10 — initial public release)

Placeholder — newest-first at rollout, mirroring the chat changelog, including:
**RBC view engine** (month/week/work-week/day/agenda, URL sync, drag/resize),
security hardening (server auth + RLS), single reminder schedule + push route-through,
react-query realtime on live tables, es-HN i18n + `--fd-*` RBC theme, a11y pass,
`next/dynamic` RBC bundle, offline precache + queue, timezone fix, docs refresh.

---

### Priority (biggest remaining wins, execution order)

1. **Phase 0 – Foundation & Security** — live auth/RLS holes + two-model ambiguity are
   exploitable today and block everything else; unblocks timezone correctness.
2. **Phase 2 – Data & RBC Bridge + Realtime** — react-query + `rbcAdapter` + realtime on
   live tables kills refetch churn, N+1, and enables phase 1/4 interactivity.
3. **Phase 5 – Notifications & Push** — reuse the chat web-push pipeline so closed-app
   scheduling/reminders work (the current 3-store reminder system is unreliable).
4. **Phase 1 – RBC view engine** — Month/Week/Day/Agenda + URL sync (biggest visible win,
   low effort thanks to RBC).
5. **Phase 3/4 – Modal UX + custom rendering/DnD** — slot-driven create/edit, dental cards,
   drag/resize with overlap check.
6. **Phase 7/8 – Theming/i18n/A11y** — es-first parity, tokens, keyboard/screen-reader.
7. **Phase 9 – Performance** — `next/dynamic` RBC + bundle report.
8. **Phase 6 – PWA/Offline** — depends on react-query caching (Phase 2).
9. **Phase 10 – QA/Rollout** — executed last, as with chat.

### Deliberate decisions / divergences (draft)

- **View engine = RBC, not a bespoke grid.** This is the headline divergence from the
  original bespoke plan; all dental-domain logic stays custom and rides in
  `resource`/`components.*`. Phases 1 + 4 shrink accordingly. Any gap RBC can't express
  (e.g. custom cell affordances) is handled via `components.*` overrides, not forks.
- **Canonical model = the live `events` family.** Extension over revival — the UUID
  layer is deleted (realtime + invitee + reminder logic ports over).
- **Custom options preserved:** `PROCEDURES`, `DENTISTS`, `EVENT_COLORS`, patient +
  invitee search, multi-reminders, status/priority chips, delete flow, es-HN formatting —
  all survive the RBC swap unchanged (they live in the domain/data layers RBC renders).
- **Timezone = clinic-local, explicit** (`America/Tegucigalpa`), single formatter, no
  per-device ±6 h math; RBC localizer configured to the same clinic zone.
- **Desktop DnD only.** HTML5 backend has no touch support — mobile uses the drawer
  (tap → edit times). Documented platform behavior, not a bug.
- **Push via the existing chat web-push pipeline**, not a parallel one.
- **PWA-first; Capacitor deferred.** Installed deps stay dormant; mobile story = PWA.
- **No Storybook** (same decision as chat — accepted).
- **React 19 peer-dep pin:** if RBC emits React 19 peer warnings, add an
  `overrides`/`resolution` pin and validate DnD on the deployed build (C10–C12).

---

## Analysis — Building a modern calendario (RBC)

Goal: keep the live Supabase scheduling data and **all calendar custom options**, modernize
the view layer with RBC, close security holes, and reach chat-grade parity (push, i18n,
theming, a11y, perf). Auth stays Clerk.

### 1. Current calendario — strengths & gaps

| Aspect | Works well | Missing / improvable |
|--------|------------|----------------------|
| **Auth** | Clerk `useUser` gate present | Role gating bypassed; `x-user-id` header trust; `/api/(.*)` public |
| **Data layer** | `events`/`tasks`/`reminders` CRUD routes | Two models; no repository; refetch-everything |
| **UI** | Month grid + day panel + tasks/reminders + rich modal (custom options) | Month-only; no week/day/agenda; no drag; monolith modal |
| **Realtime** | Service exists (orphaned tables) | Not on live data; no REPLICA IDENTITY; publication drift |
| **Notifications** | Bell + `notifications` table; deep-link listener | Unauthenticated `send-to-user`; no web-push; 3 reminder stores |
| **PWA / Offline** | App has a SW | `/calendario` not precached; no offline cache/queue |
| **Performance** | Route works | Monolith + future RBC must be lazy; N+1 participants |
| **A11y** | Loading/error/unauthorized states | No focus trap, `aria-live`, keyboard nav, reduced-motion |
| **i18n / Theme** | Dark mode via ThemeContext | No i18n layer; mixed locales; tokens chat-scoped |
| **Extensibility** | `components/calendar-new` self-contained | Duplicate Toast; dead components; services target dead tables |

### 2. What RBC + the target give us

| Capability | Relevance | Notes |
|------------|-----------|-------|
| **RBC views + math** | Month/Week/Day/Agenda, overlaps, multi-day, view-switch | Off-the-shelf; localizer = `date-fns` |
| **RBC selection + DnD** | `onSelectSlot`/`onSelectEvent`, drag/resize | Addon + `react-dnd` peers (desktop) |
| **Custom `components.*`** | Dental event pills, agenda rows, es toolbar | `resource` carries the full `ClinicEvent` |
| **Chat-grade infra** | react-query, web-push, `--fd-*`, i18n, a11y, bundle | Port from the chat suite (reuse proven code) |

### 3. Effort estimation (relative)

| Phase | Rough effort (person-days) | Risk |
|-------|---------------------------|------|
| 0 – Foundation, Data Model & Security | 4 | High (auth/RLS + schema consolidation) |
| 1 – RBC Layout & Navigation Engine | 2 | Medium (RBC integration + React 19 peers) |
| 2 – Data Layer, RBC Bridge & Realtime | 3 | Medium (publication/REPLICA IDENTITY) |
| 3 – Slot Selection & Event Modal UX | 3 | Medium (modal split) |
| 4 – Custom RBC Rendering & DnD | 3 | Medium (DnD + overlap) |
| 5 – Notifications & Push Pipeline | 3 | Medium (webhook + SW calendar path) |
| 6 – PWA & Offline | 2 | Low |
| 7 – Theming & i18n (es-HN) | 2 | Low (RBC CSS overlay) |
| 8 – Accessibility & Keyboard Nav | 2 | Low |
| 9 – Performance & Dynamic Bundling | 2 | Low |
| 10 – Final QA, Migration & Roll-out | 3 | Low-Medium |
| **Total** | **≈ 24–26 person-days** (≈ 5 weeks for 1 dev) | |

> Note: the bespoke-grid alternative was ≈ 32 person-days; RBC trades ~6–8 days for a
> dependency + CSS-overlay commitment. Effort is spent on the dental domain and the
> chat-parity layers (data, realtime, push, i18n, a11y), not on calendar engine work.

### 4. Feature/Function comparison (current vs target)

| Feature | Current Calendario (C) | Target (RBC) | Notes |
|---------|------------------------|--------------|-------|
| **Views** | Month only | Month / Week / Work-Week / Day / Agenda | URL-synced toolbar |
| **Scheduling** | Modal create/edit | Slot-driven quick-add + multi-step Zod/RHF + drawer | Prefill from `start/end` |
| **Drag & drop** | None | Drag + resize (desktop) w/ overlap check | Optimistic via react-query |
| **Realtime** | None on live data | Live tables + REPLICA IDENTITY FULL | Invitee publication fixed |
| **Reminders** | 3 stores, unreliable | 1 schedule, server-fired + web-push | Consolidation |
| **Invitees / RSVP** | API exists | Realtime invite + status in drawer | Port from live API |
| **Patient linkage** | `patient_id`/`patient_name` | Event ↔ `/pacientes` + `/patient-form` | Deep links |
| **Custom options** | Rich modal (procedures/dentists/colors) | Preserved via `components.*` + `resource` | Data layer unchanged |
| **Notifications** | Bell + browser only | Bell + web-push + SW calendar cards | Closed-app delivery |
| **Offline** | None for calendar | SW precache + persist + offline queue | Chat pattern port |
| **i18n / Theme** | Mixed locales; hardcoded colors | Typed es/en; `--fd-*` RBC theme | Es-first, Monday start |
| **A11y** | Loading/error states | Focus traps, aria-live, keyboard pass | Chat Phase 8 parity |
| **Security** | `x-user-id` header trust | Clerk-session identity + RLS | Close the hole |
| **Perf / bundle** | Monolith in route | Lazy RBC + modals; virtualized agenda | Chat Phase 9 parity |

---

## Work State

**Completed**
- **Baseline (pre-plan, on disk):** functional `/calendario` — custom month
  `CalendarGrid` + `DayDetail` + `TaskPanel` + `ReminderPanel` + `EventModal`
  (`components/calendar-new/`); event/task/reminder CRUD routes; `event_invitees`;
  dashboard "Próximos Eventos" with Clerk-API avatars (`66eb4ac`/`f2714b6`); bell
  notifications + deep-link listener; src/ refactor (`90982ce`), async params
  (`5420017`), anon-key client (`3ce012c`).
- **Audit (2026-09-07/08):** full inventory (two models, auth/RLS holes, timezone shims,
  realtime drift, 3 reminder stores, dead code, unversioned SQL).
- **Plan adaptation (this session, 2026-09-08):** plan re-based onto
  **`react-big-calendar` + `date-fns`** as the view engine — Phases 1/4 reduced,
  Phase 3 slot/drawer UX, Phase 9 lazy RBC, `rbcAdapter` bridge — while preserving all
  dental custom options and the chat-parity phases (0/2/5/6/7/8/10).

**Active**
- Nothing — the RBC-adapted plan is drafted; Phase 0 work begins on approval.

**Blocked**
- Phase 0 needs the **canonical model** decision (recommended: live `events` family) and
  **timezone storage policy** (recommended: clinic-local + explicit `timezone` marker,
  RBC localizer aligned).
- **RBC/React 19 peer check** pending during Phase 1 install (pin/overrides if needed).
- Live QA (C01–C36) needs deployed env + real auth credentials (same constraint as the
  chat plan; in-session checks cover API/SW/server paths).

### Next Move
1. Approve the RBC adaptation → Phase 0: canonical model + auth/RLS hardening + timezone
   policy + versioned migrations + `NEXT_PUBLIC_USE_NEW_CALENDARIO` page-loader.
2. Then Phase 2 (`rbcAdapter` + react-query + realtime on live tables) and Phase 5
   (reminder consolidation + push route-through).
3. Phase 1 (RBC shell) can start in parallel once dependencies + React 19 peers are
   validated and the localizer is aligned to `America/Tegucigalpa`.
4. Keep the gate: `npx tsc --noEmit` + scoped ESLint below.

### Verification Gate
```bash
npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=4096" npx eslint src/calendario components/calendar-new app/\(auth\)/calendario app/api/events app/api/tasks app/api/reminders --cache --format stylish
```

### Relevant Files (baseline + RBC additions)
- `app/(auth)/calendario/page.tsx` — page + Clerk gate (`ToastProvider` + `Dashboard`) →
  future flag-gated RBC loader.
- `components/calendar-new/` — `Dashboard.tsx`, `CalendarGrid.tsx` (to be superseded by
  RBC `Calendar`), `DayDetail.tsx` (→ RBC DAY), `EventModal.tsx` (to be split, Phase 3),
  `TaskPanel.tsx`, `ReminderPanel.tsx`, `UpcomingEvents.tsx` (orphaned), `Toast.tsx`.
- **RBC additions (planned):** `package.json` → `react-big-calendar`, `date-fns`,
  `react-dnd`, `react-dnd-html5-backend`; `src/calendario/adapters/rbcAdapter.ts`
  (`ClinicEvent` ↔ `RBCEvent`); `src/calendario/components/BigCalendar.tsx` (shell +
  localizer + toolbar); `src/calendario/i18n/…` (typed es/en); `app/styles/rbc-theme.css`
  (`.rbc-*` → `--fd-*`); `src/calendario/hooks/useCalendarEvents.ts` (react-query).
- `app/api/events/route.ts` + `app/api/events/upcoming/route.ts` +
  `app/api/events/[id]/{invitees,participants,reminders}/route.ts` ·
  `app/api/tasks/route.ts` · `app/api/reminders/route.ts` — live CRUD (auth to harden).
- `src/lib/types-calendar.ts` — live model + **custom options** (`PROCEDURES`, `DENTISTS`,
  `EVENT_COLORS`), `date`/`start_time` strings (timezone policy in Phase 0).
- `database/migrations/create_new_calendar_tables.sql` +
  `extend_new_calendar_with_invitees.sql` — live tables.
- `src/services/calendar{Service,TaskService,ReminderService,InviteesService,RealtimeService}.ts`
  + `src/services/inviteeNotificationService.ts` — **orphaned UUID layer** to port/delete
  (+ RPCs `supabase/functions/get_user_*events*.sql`, `app/api/calendar/*`).
- `src/types/calendar.ts` / `calendarTasks.ts` / `calendarInvitees.ts` — UUID types to retire.
- `contexts/BellNotificationContext.tsx`, `app/api/notifications/send-to-user/route.ts`,
  `hooks/useNotificationListener.ts`, `components/ui/CalendarNotificationCounter.tsx` —
  notification surface (push route-through in Phase 5).
- `public/sw.js`, `scripts/build-sw-precache.mjs`, `src/lib/push/pushService.ts`,
  `app/api/push/*` — chat web-push pipeline to extend for calendar.
- `middleware.ts` — role map + TEMPORARY bypass + public `/api/(.*)` (Phase 0).
- `CALENDAR_SYSTEM_DOCUMENTATION.md` — stale UUID doc to refresh at Phase 10.
- `diamond-calendar-app/` — compiled-only Vite experiment (DentaCal), zero references —
  candidate for deletion.

---

*Mirrors `CHAT_OVERHAUL_PLAN.md` structure and conventions (conventional commits,
feature flag, verified-gate, versioned migrations). RBC adaptation 2026-09-08 — dental
custom options preserved.*