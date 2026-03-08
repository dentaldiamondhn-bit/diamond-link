-- Fix CHECK constraint: Allow MAINTENANCE value
-- The RLS is working but CHECK constraint is blocking maintenance

-- Check what values are actually in the constraint
SELECT conname, convalidated, condeferrable 
FROM pg_constraint 
WHERE conrelid = 'tickets'::regclass 
AND contype = 'c';

-- Drop the problematic CHECK constraint
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS valid_ticket_type;

-- Recreate CHECK constraint with all valid values including MAINTENANCE
ALTER TABLE tickets ADD CONSTRAINT valid_ticket_type 
  CHECK (type IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE'));

-- Verify the constraint was updated
SELECT conname, convalidated, condeferrable 
FROM pg_constraint 
WHERE conrelid = 'tickets'::regclass 
AND contype = 'c';
