# Diamond Link — Project Status

> Generated: 2026-07-18

## Overview

Diamond Link is a dental clinic management system built with Next.js 15, Supabase, Clerk Auth, and Tailwind CSS. The main app is at `/home/dentaldiamondhn/diamond-link-original`.

A separate calendar-focused app was extracted to `/home/dentaldiamondhn/diamond-calendar`.

---

## What Works

### Authentication & Users
- Clerk-based auth with sign-in page (custom branded)
- Middleware protecting all routes except sign-in and API
- Role-based access control (admin, doctor, staff, tech_support) — client-side hook + server-side middleware
- User administration pages (admin/users) with role management
- Clerk webhooks for user sync
- OdysseyAuth system for external auth validation
- User preferences (theme, language, etc.)

### Push Notifications
- `PushAutoSubscribe` component dynamically imports push service on mount — works on desktop and mobile PWA
- `initialize()` uses `navigator.serviceWorker.register('/sw.js')` (hangs on mobile without SW registration)
- `saveSubscription` includes `credentials: 'include'` so Clerk cookie is sent on mobile/PWA
- Service worker (`public/sw.js`) handles push events and shows Notification API notifications
- VAPID keys configured in `.env.local`; guarded at server-side to prevent crashes on missing keys
- API routes:
  - `/api/push/send` — send push to specific subscription
  - `/api/push/send-to-user` — send push to all subscriptions for a user

### Bell Notifications (in-app)
- `BellNotificationContext` provides notifications state
- `NotificationDropdown` shows unread count and dropdown list
- `useNotificationListener` shows browser Notification API popups for incoming bells
- `NotificationListenerWrapper` wraps provider to prevent double-renders

### Calendar
- Full month-view calendar with event/task CRUD
- Events: create, edit, delete with patient selection, invitees, reminders
- Tasks: create, edit, delete with patient linking
- Calendar real-time updates via Supabase Realtime
- Calendar reminder service checks for upcoming events and creates reminder notifications
- Calendar invitee system for sharing events with other users
- Timezone-aware Supabase storage — dates sent with timezone offset (`-06:00` for Honduras)
- SimpleTimezoneFix utility for Honduras (UTC-6) timezone conversions
- Database migrations for calendar tables and functions

### Database
- Supabase with full schema (patients, treatments, odontograms, payments, calendar, etc.)
- RLS policies on all tables
- Numerous migration files in `database/migrations/`
- Timezone handling via `global_timezone_fix.sql` (sets session timezone behavior)

---

## Known Issues

### 1. Calendar Event Times (Fixed in latest commit)
**Status:** Fixed  
**Root cause:** `start_date`/`due_date` sent to Supabase as local-time strings without timezone. PostgREST interprets bare strings as UTC, so 10 AM local (Honduras UTC-6) was stored as 10 AM UTC = 4 AM local — 6 hours off.  
**Fix applied:** `SimpleTimezoneFix.toTimezoneAwareISO()` appends `-06:00` before sending dates.  
**Migration:** `database/migrations/fix_existing_event_timezones.sql` shifts existing data forward 6 hours.  
**Affected files:** `EventModal.tsx` (event creation), `TaskModal.tsx` (task creation), `simpleTimezoneFix.ts` (new helpers)

### 2. Push Notifications on iOS
**Status:** Known limitation  
**Details:** iOS Safari does not support the Web Push API. The `PushAutoSubscribe` component will fail silently (caught). Capacitor-native notifications would need a native plugin.

### 3. Service Worker Scope
**Status:** As-designed  
**Details:** SW registered at `/sw.js` — scoped to root. Works for push on Android Chrome and desktop. No iOS support.

### 4. Desktop Notification API Permission
**Status:** First-load UX  
**Details:** On first visit, the browser prompts for notification permission. If denied, push subscription is skipped silently.

### 5. TypeScript Type Skipping
**Status:** Build config choice  
**Details:** Build skips type validation (`next build` compiles without `tsc --noEmit`). Some type imports in calendar types reference non-existent files — turned off type checking in build.

---

## Architecture

```
diamond-link-original/
├── app/
│   ├── (auth)/           # Protected pages (dashboard, calendar, patients, etc.)
│   │   └── calendario/   # Calendar page
│   ├── api/              # API routes
│   │   ├── calendar/     # Calendar events/tasks API
│   │   ├── push/         # Push notification API
│   │   └── ...
│   ├── sign-in/          # Clerk sign-in page
│   ├── layout.tsx        # Root layout with ClerkProvider
│   ├── page.tsx          # Root redirect → /sign-in
│   └── globals.css
├── components/
│   ├── calendar/         # Calendar components (core)
│   └── notifications/    # Push subscription UI
├── contexts/             # React contexts (bell, theme, tutorial, etc.)
├── hooks/                # Custom hooks (auth, roles, notifications)
├── lib/                  # Utilities (supabase, rbac, serviceWorker)
├── services/             # Business logic (calendar, push, notifications)
├── types/                # TypeScript interfaces
├── public/               # Static assets, manifest, SW
└── database/migrations/  # SQL migrations

diamond-calendar/  ← Extracted calendar app (same auth, shared DB)
├── app/(auth)/calendario/
├── components/calendar/
├── services/
└── ...
```

## Calendar App (diamond-calendar)

The calendar app was extracted from diamond-link-original on 2026-07-18. It:
- Shares the same Supabase database and Clerk project
- Has a slimmed-down auth layout (no sidebars, no diamond-link-specific components)
- Has a simplified middleware (pure Clerk auth, no route permissions)
- Redirects root → /calendario
- Was verified to build successfully

### Files Copied (62 total)
- Calendar components, services, types
- Auth: middleware, sign-in page, layouts
- Shared infra: supabase client lib, contexts, hooks
- Root config: package.json, tsconfig, next.config, tailwind, postcss
- Public: Logo, manifest, SW
- DB migrations for calendar tables

### Files Adapted for Calendar App
- `app/layout.tsx` — removed diamond-link-specific components (BannerAlert, GlobalChatBubble, VercelAnalytics)
- `app/(auth)/layout.tsx` — simplified to just providers + header with UserButton
- `middleware.ts` — stripped to pure Clerk auth, no route permission logic
- `app/page.tsx` — redirects to /calendario
- `app/(auth)/dashboard/page.tsx` — redirects to /calendario
