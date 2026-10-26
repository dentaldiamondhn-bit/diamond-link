# Multi-Tenancy Plan - Dental Diamond Link

Objective: evolve the app into a multi-tenant SaaS where each clinic (tenant) gets isolated
data, WITHOUT breaking the current single-clinic app.

## Key architectural constraint

- Auth: Clerk (external). DB: Supabase, accessed with the **shared anon key** (per commit
  `3ce012c`), with authorization enforced in the app layer, not by Supabase RLS.
- Consequence: tenant isolation CANNOT be enforced by Supabase RLS (the anon key is the same
  for every user). Isolation must be enforced in the **app layer** by scoping every query with
  `clinica_id`.
- Chosen mapping: **Clerk Organization = clinic (tenant)**. Clerk already provides per-org
  roles and org switching (`auth().orgId` server-side, `useOrganization` client-side).

## Chosen model

- One app, one shared schema, `clinica_id` column on every tenant-scoped table (additive).
- Tenant routing by subdomain (e.g., `clinic1.example.com`).
- App-layer scoping via a `withClinica()` query helper.

## Phase 0 - Sandbox (zero risk)

- [ ] Create a git worktree / feature branch from `master` (code clone) for all work.
- [ ] Create a separate Supabase project (or staging DB) to run migrations safely.
- [ ] Verify the current app builds and runs in the sandbox: `npm run build`, `npm run dev`.

## Phase 1 - Additive schema (safe, uses DEFAULTs only)

- [ ] Migration: create `clinicas` table
      (`id uuid pk default gen_random_uuid()`, `nombre text not null`, `slug text unique not
      null`, `clerk_org_id text unique`, `created_at timestamptz default now()`).
- [ ] Seed `clinicas` with the current clinic (one row).
- [ ] Add `clinica_id uuid references clinicas(id)` to every tenant-scoped table with
      `DEFAULT '<current clinic id>' NOT NULL` so existing rows and current behavior are
      unchanged. Tenant tables:
      - patients
      - appointments (or equivalent)
      - tratamientos
      - tratamientos_completados
      - payments
      - consentimientos
      - historia_clinica_ortodoncia
      - historia_clinica_ortodoncia_versions
      - presupuestos
      - tickets (+ ticket attachments)
      - insumos, marcas, distribuidores, movimientos_inventario (inventory)
      - notifications
      - timeline_notes, timeline_note_comments
      - chat tables (chat_participants, messages, etc.)
- [ ] Add indexes on `clinica_id` for the above tables.
- [ ] After verifying, optionally drop the column DEFAULTs (data already backfilled).

## Phase 2 - Tenant resolution

- [ ] `middleware.ts`: read the subdomain, look up `clinicas.slug`, reject unknown tenants
      (or fall back to the default clinic).
- [ ] `getClinicaId()` server helper: `auth().orgId` -> `clinicas.clerk_org_id` -> `clinica_id`,
      memoized per request. Fall back to the default clinic id when no org is present.
- [ ] `withClinica(query, clinicaId)` query helper that appends `.eq('clinica_id', clinicaId)`
      so services change minimally.
- [ ] Storage: namespace upload paths by clinica_id (e.g., `clinica/<id>/...`) or reference
      tenant rows only.

## Phase 3 - Scope the services

- [ ] Scope patients (create/read/update/delete).
- [ ] Scope appointments/calendar.
- [ ] Scope tratamientos and tratamientos_completados.
- [ ] Scope payments.
- [ ] Scope consentimientos (and signature uploads).
- [ ] Scope historia_clinica_ortodoncia (+ versions).
- [ ] Scope tickets.
- [ ] Scope inventory (insumos, marcas, distribuidores).
- [ ] Scope notifications and timeline notes.
- [ ] Scope chat.
- [ ] Audit every `.from('...')` call for missing tenant scoping.

## Phase 4 - Cutover

- [ ] Enable enforcement; org -> clinic switcher UI (Clerk org switching).
- [ ] Admin UI to create clinics and assign staff.
- [ ] Verify the current single-clinic app behaves identically (its rows carry the default
      `clinica_id`).

## Phase 5 - Optional hardening (later)

- [ ] DB-level isolation requires Supabase Auth or per-user JWTs (the shared anon key cannot
      express per-tenant identity). Only pursue if legal/audit requirements demand it.
- [ ] Consider tenant-scoped storage bucket policies or per-tenant buckets.

## Risks / notes

- The current app enforces auth at the app layer; tenant scoping follows the same pattern.
- Do not copy tables in the production schema; use a separate Supabase project for testing
  ("clone tables" = clone the DB, not duplicate the schema).
- Keep every migration additive so rollback is trivial.
