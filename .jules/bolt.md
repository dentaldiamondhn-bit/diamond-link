## 2025-05-15 - [Batch Bypass Status Checks]
**Learning:** Found an N+1 query problem in `app/(auth)/pacientes/page.tsx` where each patient in a list triggered two database calls (one global, one specific). This significantly slowed down the patient list loading as the number of patients grew. Additionally, the original sorting logic was picking the oldest record instead of the latest.
**Action:** Use Supabase `.in()` operator to batch queries for list views. Always verify that sorting logic (`sort((a,b) => b-a)`) correctly maps to the intended element selection (index 0 for newest).

## 2026-06-28 - [O(1) Joins vs O(N) Loops]
**Learning:** Confirmed that joining relational data in a single query (e.g., `.select('*, related_table(*)')`) is significantly faster and more stable than manual O(N) fetching loops in React components or services. However, careful attention must be paid to service method return types and ensuring all UI-required fields are included in the join to avoid TypeScript errors or runtime crashes.
**Action:** Always prioritize server-side joins or batching (`.in()`) for list views. Verify that service method signatures accurately reflect joined data to maintain type safety.
