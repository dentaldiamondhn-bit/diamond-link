# ANCHOR — COMMIT + FRESH SESSION HANDOFF (diamond-link-original)

State verified this session: **tsc --noEmit exit 0**; migration ran clean in
your Supabase SQL Editor; the CardDAV surface (company/job_title/address/dob
→ ORG/TITLE/ADR/BDAY) is proven intact in `components/contacts/vcard.ts`.

## Already committed (2 clean, kind-honest commits)

- `git log --oneline -3` shows:
  - `feat(contactos): drop solo columnas clínicas` — migration
    `supabase/migrations/20260925_drop_contacts_clinical_columns.sql` (drops
    ONLY gender, insurance_provider, policy_number, blood_type; CardDAV cols
    untouched) + the 6 TS leaves stripped (db.ts, syncEngine.ts, vcard meta,
    ContactEditorModal, ContactDetailSheet, MedicalHistoryModal).
  - `feat(carddav): per-contact [uid] PUT/DELETE route` — the per-uid leg the
    DAV OPTIONS advertises (GET/PUT/DELETE).

## Still to build next (fresh session — all anchors measured)

### STEP-3 — Column picker ("Columnas") → columnaVisibility persisted to
### `user_preferences` ON SUPABASE (reuse the EXACT existing service path —
### NO new migration):
- COLUMNS array to build the 5 checkboxes: `components/contacts/ContactTable.tsx:29-34`
  (name, phone, email, labels, updated; phone/email/labels/updated are
  `hiddenMobile`).
- thead loop to make conditional (skip `SortableHeader` when hidden):
  `ContactTable.tsx:195-204` → `{COLUMNS.map((col) => <SortableHeader .../>)}`.
- the 4 hand-rolled tds to hide (only when hidden):
  `ContactTable.tsx:262-300` (phone td, email td, labels td, updated td —
  each `className="...hidden sm:table-cell"`).
- toolbar mount point where the caret sits: `app/(auth)/contactos/page.tsx`
  right-of-search header cluster, next to the Importar/Exportar buttons
  (line ~373-390 region).
- persistence stop: `src/services/userPreferencesService.ts` verbatim —
  `page_preferences[page]` merge via `updatePagePreferences(userId, 'contactos',
  { columnVisibility })` → `user_preferences` upsert onConflict clerk_user_id
  (fold a `columnVisibility: string[]` into that JSON). Init reads the same
  getUserPreferences. RLS/auth not needed — service already scopes by userId.

### STEP-4 — Create modal simplification (keep only nombre + teléfonos +
### etiquetas + notas):
- `components/contacts/ContactEditorModal.tsx` — the draft/form strips the
  CardDAV-optional fields company/job_title/address/dob/email from the UI
  (columns stay in DB for CardDAV). Emergency_contact keep.

## Not done (out of scope for this commit)
- ancient junk file `1` — deleted pre-commit, verified not in `git ls-files`.
- No force-push, no amend, no rebase; repo local-ahead, push when you say.
