## 2025-05-15 - [Batch Bypass Status Checks]
**Learning:** Found an N+1 query problem in `app/(auth)/pacientes/page.tsx` where each patient in a list triggered two database calls (one global, one specific). This significantly slowed down the patient list loading as the number of patients grew. Additionally, the original sorting logic was picking the oldest record instead of the latest.
**Action:** Use Supabase `.in()` operator to batch queries for list views. Always verify that sorting logic (`sort((a,b) => b-a)`) correctly maps to the intended element selection (index 0 for newest).

## 2025-05-16 - [Eliminate N+1 Queries via Relational Joins]
**Learning:** Detected an N+1 query pattern in the consentimientos list where each record performed a redundant `getPatientById` call. Using Supabase relational joins (`.select('*, patients(...)')`) reduced this to a single query.
**Action:** Prefer relational joins over individual fetches in loops. Ensure the join includes all fields required for UI logic (e.g., `sexo`, `embarazo` for badges) to maintain feature parity after optimization.
