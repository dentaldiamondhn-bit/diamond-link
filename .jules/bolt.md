## 2025-05-15 - [Batch Bypass Status Checks]
**Learning:** Found an N+1 query problem in `app/(auth)/pacientes/page.tsx` where each patient in a list triggered two database calls (one global, one specific). This significantly slowed down the patient list loading as the number of patients grew. Additionally, the original sorting logic was picking the oldest record instead of the latest.
**Action:** Use Supabase `.in()` operator to batch queries for list views. Always verify that sorting logic (`sort((a,b) => b-a)`) correctly maps to the intended element selection (index 0 for newest).

## 2025-05-16 - [Dashboard Patient Modal N+1 Optimization]
**Learning:** The "My Patients" modal on the dashboard was fetching treatment counts and payment totals for each patient individually. For a doctor with many patients, this resulted in dozens of sequential database calls, causing significant latency.
**Action:** Create dedicated batch summary methods in services (like `getBatchTreatmentSummaries`) that use `.in()` and in-memory aggregation to provide all necessary list data in a single round-trip.
