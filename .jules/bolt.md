## 2025-05-15 - [Batch Bypass Status Checks]
**Learning:** Found an N+1 query problem in `app/(auth)/pacientes/page.tsx` where each patient in a list triggered two database calls (one global, one specific). This significantly slowed down the patient list loading as the number of patients grew. Additionally, the original sorting logic was picking the oldest record instead of the latest.
**Action:** Use Supabase `.in()` operator to batch queries for list views. Always verify that sorting logic (`sort((a,b) => b-a)`) correctly maps to the intended element selection (index 0 for newest).

## 2026-06-25 - [Batch Dashboard Data Fetching]
**Learning:** The dashboard was suffering from O(N+E) query complexity, where N is the number of patients in a modal and E is the number of upcoming events. Each patient and event triggered multiple sequential database calls and API requests.
**Action:** Implement batch fetching in services using Supabase `.in()` operator. For event participants, fetch the users list once and use a Map for O(1) lookups instead of fetching users repeatedly in a loop.
