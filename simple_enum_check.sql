-- Simple Enum Check: Just see what's actually in the enum
-- Remove the failing test lines

-- Check enum values with exact case
SELECT e.enumlabel as enum_value, e.enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typname = 'ticket_type'
AND n.nspname = 'public'
ORDER BY e.enumsortorder;
