-- Debug CHECK constraint: See what values are actually allowed
-- The constraint is still rejecting 'maintenance' - let's check why

-- Check what values are actually in the constraint
SELECT conname, convalidated, condeferrable 
FROM pg_constraint 
WHERE conrelid = 'tickets'::regclass 
AND contype = 'c';

-- Check current constraint definition
SELECT pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'tickets'::regclass 
AND contype = 'c'
AND conname = 'valid_ticket_type';

-- Test each value individually to see which one works
SELECT 'SYSTEM_ISSUE'::text as test_value, 'SYSTEM_ISSUE' IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE') as works;
SELECT 'IMPLEMENTATION'::text as test_value, 'IMPLEMENTATION' IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE') as works;
SELECT 'TASK'::text as test_value, 'TASK' IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE') as works;
SELECT 'REMINDER'::text as test_value, 'REMINDER' IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE') as works;
SELECT 'PATIENT_CASE'::text as test_value, 'PATIENT_CASE' IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE') as works;
SELECT 'MAINTENANCE'::text as test_value, 'MAINTENANCE' IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE') as works;

-- Try inserting with uppercase MAINTENANCE
INSERT INTO tickets (title, type, creator_id, maintenance_start, maintenance_end)
VALUES (
  'Test Uppercase Maintenance', 
  'MAINTENANCE',
  'user_3A1mYfR054eV3tqtellpfMKZ7f6',
  '2026-03-10T00:00:00Z',
  '2026-03-10T01:00:00Z'
);
