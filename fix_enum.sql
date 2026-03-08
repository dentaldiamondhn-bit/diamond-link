-- Final Working Fix: Add MAINTENANCE to enum
-- Simple approach that should work

-- Add MAINTENANCE to the existing enum
ALTER TYPE ticket_type ADD VALUE 'MAINTENANCE';

-- Verify it worked
SELECT unnest(enum_range(NULL::ticket_type)) as final_enum_values;
