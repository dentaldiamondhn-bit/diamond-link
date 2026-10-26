# Dental Diamond Link - Current App Context

Generated: 2026-06-19 21:19:59 -06:00
Working tree commit: `fa28ed4 Fix AI chat history consistency`

## 1. Project Summary

Dental Diamond Link is a dental clinic management web application built with:

- Next.js 15 App Router
- TypeScript
- React 18
- Tailwind CSS
- Clerk authentication
- Supabase PostgreSQL
- Capacitor-related mobile/notification integrations
- Groq, Ollama, and self-hosted Odysseus AI chat integrations

The app manages patients, appointments, treatments, budgets, consents, periodontal studies, completed treatments, reports, tickets, admin users, tech-support tooling, and AI-assisted workflows.

## 2. Core Technology and Commands

`package.json` uses `type: module` and Node 20.

Main scripts:

```bash
npm run dev
npm run build
npm run export
npm run start
npm run lint
npm run lint:check
```

Key dependencies include:

- `next`, `react`, `react-dom`
- `@clerk/nextjs`, `@clerk/ui`, `@clerk/backend`
- `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`
- `groq-sdk`
- `zod`
- `framer-motion`
- `lucide-react`
- `socket.io`, `socket.io-client`
- Capacitor packages
- `puppeteer`, `xterm`, `jspdf`, `recharts`

## 3. Runtime Entry Points

Root layout: `app/layout.tsx`

Important root-level behavior:

- Wraps the app in `<ClerkProvider>`.
- Loads Inter font.
- Applies global CSS.
- Renders:
  - `BannerAlert`
  - page children
  - `GlobalChatBubble`
  - Vercel Analytics components
- Injects a loading overlay and theme-preservation script.

Middleware: `middleware.ts`

Middleware responsibilities:

- Clerk auth enforcement for protected routes.
- Route matcher includes app pages, API routes, auth routes, and `/`.
- Public routes include:
  - `/`
  - `/sign-in(.*)`
  - `/api/(.*)`
  - `/tech-support/(.*)`
  - `/capacitor-demo`
- Applies Cloudflare/security headers.
- Caches most API responses with `public, max-age=7200, s-maxage=7200`.
- Excludes `/api/groq-chat`, `/api/odysseus-chat`, and `/api/ollama-chat` from that cache so real-time chat/history calls are not stale.
- Contains temporary access fallbacks and debug logging around role metadata and tech-support access.

## 4. Authentication and Roles

Authentication is handled through Clerk.

Roles used throughout the app:

- `admin`
- `doctor`
- `staff`
- `tech_support`

Role helpers:

- `hooks/useRoleBasedAccess.ts`
- `hooks/useUserRole.ts`
- `lib/rbac.ts`

Important role behavior:

- `tech_support` has broad access to tech-support routes and global AI assistant coding/system features.
- `admin`, `doctor`, and `staff` generally see clinic-facing AI prompts and clinic workflows.
- Middleware has explicit fallbacks for the known tech-support user ID `user_3A1mYfR054eV3tqtellpfMKZ7f6`.

Admin user management:

- `app/api/admin/users/route.ts`
- Uses `createClerkClient` with `CLERK_SECRET_KEY`.
- Supports listing users and actions like update role, ban, unban, lock, unlock, reset password, delete, and impersonation status.

## 5. Main App Areas

Authenticated pages live under `app/(auth)/`.

Major product areas:

- `app/(auth)/dashboard/page.tsx`
  - Clinic dashboard with role-specific stats.
  - Uses patient, completed treatment, and calendar services.
  - Shows upcoming events, patient stats, treatments, revenue, and notifications.

- `app/(auth)/pacientes/page.tsx`
  - Patient directory.
  - Supports search, pagination, mobile layout, historical mode, WhatsApp links, record categories, and patient type helpers.

- `app/(auth)/calendario/page.tsx`
  - Calendar page.
  - Uses `components/calendar/Calendar`.

- `app/(auth)/tratamientos/page.tsx`
  - Treatment planning area.

- `app/(auth)/tratamientos-completados/page.tsx`
  - Completed treatment records.

- `app/(auth)/presupuestos/page.tsx`
  - Budgets/quotes.

- `app/(auth)/consentimientos/page.tsx`
  - Consent documents.

- `app/(auth)/historia-clinica-ortodoncia/page.tsx`
  - Orthodontic clinical history.

- `app/(auth)/estudio-periodontal/page.tsx`
  - Periodontal studies.

- `app/(auth)/reports/page.tsx`
  - Reporting area.

- `app/(auth)/tickets/page.tsx`
  - Ticket/support workflow.

- `app/(auth)/xray-viewer/page.tsx`
  - X-ray viewer.

- `app/(auth)/patient-form/page.tsx`
  - Patient intake/form workflow.

- `app/(auth)/account/page.tsx`
  - Account/settings area.

Tech-support pages live under `app/(auth)/tech-support/`:

- `dashboard`
- `users`
- `tickets`
- `terminal`
- `system-logs`
- `analytics`
- `system-settings`
- `access-portal`
- `ai-chat`
- `claude-code`
- `code-runner`
- `codespaces`
- `github-codespaces`
- `odontogram-migration`

## 6. Services and Shared Logic

The `services/` directory contains most business logic.

Representative services:

- `services/patientService.ts`
- `services/calendarService.ts`
- `services/treatmentService.ts`
- `services/completedTreatmentService.ts`
- `services/paymentService.ts`
- `services/presupuestoService.ts`
- `services/consentimientoService.ts`
- `services/orthodonticHistoryService.ts`
- `services/odontogramService.ts`
- `services/dentalStudyService.ts`
- `services/ticketService.ts`
- `services/reportsService.ts`
- `services/notificationService.ts`
- `services/pushNotificationService.ts`
- `services/mobileNotificationService.ts`
- `services/mobileAnalyticsService.ts`
- `services/apiMonitorService.ts`
- `services/conversation.service.ts`
- `services/chatService.ts`

Context providers live under `contexts/`:

- `ThemeContext`
- `NotificationContext`
- `HistoricalModeContext`
- `TutorialContext`
- `TreatmentModalContext`
- `BellNotificationContext`

Utilities live under `lib/` and `utils/`:

- `lib/supabase.ts`
- `lib/supabaseAdmin.ts`
- `lib/supabase-types.ts`
- `lib/rbac.ts`
- `lib/utils.ts`
- `lib/serviceWorker.ts`

## 7. Supabase Data Access

Supabase clients:

- `lib/supabase.ts`
  - Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Used by many client-facing services.

- `lib/supabaseAdmin.ts`
  - Uses service role key for admin/server operations.

Important database tables currently visible in code and migrations:

- `patients`
- `appointments` or calendar event tables
- `treatments`
- `completed_treatments`
- `budgets` / `presupuestos`
- `consents` / `consentimientos`
- `periodontal_studies` / `estudios_periodontales`
- `tickets`
- `ticket_activities`
- `skills`
- `workflows`
- `workflow_executions`
- `webhooks`
- `notifications`
- `conversations`
- `messages`
- `historical_mode_settings`
- `app_configuration`
- `user_preferences`

AI chat schema used by the current AI implementation:

```sql
conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  model TEXT NOT NULL DEFAULT 'local-llama',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`conversation.service.ts` currently:

- Creates conversations.
- Lists conversations for a user.
- Loads nested messages.
- Adds messages.
- Updates conversation titles/model.
- Deletes conversations.
- Gets messages for a conversation.

Important note: `conversation.service.ts` uses the anon Supabase client. If RLS is strict, verify policies allow server/API usage with Clerk `user_id` values.

## 8. AI Chat and Assistant Context

Current AI-related files:

- `components/GlobalChatBubble.tsx`
- `app/(auth)/tech-support/ai-chat/page.tsx`
- `app/(auth)/tech-support/claude-code/page.tsx`
- `app/api/groq-chat/route.ts`
- `app/api/ollama-chat/route.ts`
- `app/api/odysseus-chat/route.ts`
- `app/api/odysseus-tools/route.ts`
- `app/api/odysseus-auth/validate/route.ts`
- `services/conversation.service.ts`
- `sql/create_conversations_proper.sql`
- `app/api/setup-conversations-table/route.ts`

Global chat bubble:

- Rendered globally from `app/layout.tsx`.
- Uses Clerk user ID from `useUserRole`.
- Fetches latest chat history from `GET /api/groq-chat?userId=<clerk-user-id>`.
- Uses `cache: 'no-store'` on the client fetch.
- Sends messages to `POST /api/groq-chat`.
- Supports agent mode and skill selection for clinic roles.
- Displays user and assistant avatars with timestamps.

Groq chat route:

- `GET /api/groq-chat?userId=...`
  - Returns latest conversation ID and messages.
  - Marked `dynamic = 'force-dynamic'`.
  - Returns `Cache-Control: no-store`.

- `POST /api/groq-chat`
  - Accepts `message`, `context`, `model`, `userRole`, `userId`, `conversationId`, `agentMode`.
  - Builds role-based system prompts.
  - Adds clinic skills/workflows context when available.
  - Finds or creates the latest conversation.
  - Saves user and assistant messages through `conversationService`.
  - Calls Groq with the current model.

Odysseus chat route:

- `GET /api/odysseus-chat`
  - Health/configuration check against `ODYSSEUS_BASE_URL`.
  - Already marked dynamic.

- `POST /api/odysseus-chat`
  - Accepts `message`, `context`, `odysseusConfig`, `userId`, `conversationId`.
  - Finds or creates the latest conversation.
  - Saves user and assistant messages.
  - Calls Odysseus endpoints in this order:
    - configured custom chat endpoint
    - `<baseUrl>/api/chat`
    - `<baseUrl>/api/v1/chat/completions`
    - `<baseUrl>/v1/chat/completions`

AI chat pages:

- `app/(auth)/tech-support/ai-chat/page.tsx`
  - Multi-model UI for Groq Llama and Odysseus.
  - Uses `conversationService` for conversation lists and persistence.
  - Backend API routes handle DB persistence.

- `app/(auth)/tech-support/claude-code/page.tsx`
  - Claude-code style multi-model interface.
  - Supports Groq and Odysseus.
  - Supports agent mode, tool policy controls, skill selection, and agent run history.

Current AI consistency state:

- Database columns use snake_case (`created_at`, `user_id`, `conversation_id`).
- UI models may expose camelCase (`createdAt`, `userId`, `conversationId`).
- Mapping should happen at service/page boundaries.
- Client pages should not duplicate-save messages if API routes already persist them.
- Global chat history should be fetched fresh every time the bubble opens.

## 9. Skills, Workflows, and Automation

Visible API routes:

- `app/api/skills/route.ts`
- `app/api/skills/[id]/route.ts`
- `app/api/skills/seed/route.ts`
- `app/api/setup-skills-table/route.ts`
- `app/api/test-skills-table/route.ts`

- `app/api/workflows/route.ts`
- `app/api/workflows/[id]/route.ts`
- `app/api/workflows/execute/route.ts`
- `app/api/setup-workflows-table/route.ts`

These support AI agent context and workflow execution. `skills` and `workflows` are used by the Groq route to add clinic automation context.

## 10. Documentation and Tooling Routes

Visible documentation routes:

- `app/api/documentation/templates/route.ts`
- `app/api/documentation/generate/route.ts`

Other developer/tool routes:

- `app/api/terminal/execute/route.ts`
- `app/api/open-project-folder/route.ts`
- `app/api/github/codespaces/route.ts`
- `app/api/github/codespaces/[id]/start/route.ts`
- `app/api/github/codespaces/[id]/stop/route.ts`
- `app/api/execute-sql/route.ts`
- `app/api/migrate-database/route.ts`
- `app/api/setup-database/route.ts`
- `app/api/setup-conversations-table/route.ts`
- `app/api/setup-workflows-table/route.ts`
- `app/api/setup-webhooks-table/route.ts`

## 11. Environment Variables

Common required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
GROQ_API_KEY
ODYSSEUS_BASE_URL
```

Odysseus runtime config may also be supplied from the client via `odysseusConfig`:

```ts
{
  baseUrl: string;
  username?: string;
  password?: string;
  chatEndpoint?: string;
  workspace?: string;
}
```

Do not commit secrets. Use `.env.local` or platform secrets.

## 12. Current Known Caveats

- `middleware.ts` has temporary access fallbacks and debug logs. It works but should be cleaned up later.
- `middleware.ts` currently has existing ESLint warnings for `any` casts around Clerk metadata.
- Supabase RLS should be verified for Clerk `user_id` text values if the anon client is used in server/API contexts.
- AI chat conversation history relies on no-store behavior for `/api/groq-chat`; middleware must continue excluding it from public caching.
- Some older generated/setup SQL files differ. Prefer current active schema used by `services/conversation.service.ts` and `app/api/setup-conversations-table/route.ts`.

## 13. Validation Commands Used Recently

```bash
npx eslint app/api/groq-chat/route.ts app/api/odysseus-chat/route.ts components/GlobalChatBubble.tsx services/conversation.service.ts middleware.ts --ext .ts,.tsx
git diff --check
curl -sS -D - 'http://localhost:3001/api/groq-chat?userId=<clerk-user-id>'
curl -sS 'http://localhost:3001/api/groq-chat?userId=<clerk-user-id>'
```

Expected current behavior:

- `/api/groq-chat` history response includes `cache-control: no-store`.
- History response returns `{ conversationId, messages }`.
- `GlobalChatBubble` reloads latest history every time it opens.
- AI chat pages and Claude-code page use backend persistence without duplicate client-side message saves.
