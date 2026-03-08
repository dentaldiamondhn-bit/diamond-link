-- Manual Migration: Add maintenance fields to tickets table
-- Run this in Supabase SQL Editor if migration hasn't been applied

-- Add maintenance window fields to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS maintenance_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS maintenance_end TIMESTAMPTZ;

-- Add comment for maintenance fields
COMMENT ON COLUMN tickets.maintenance_start IS 'Start time for maintenance window (Honduras Time)';
COMMENT ON COLUMN tickets.maintenance_end IS 'End time for maintenance window (Honduras Time)';

-- Create index for maintenance window queries
CREATE INDEX IF NOT EXISTS idx_tickets_maintenance_window ON tickets(maintenance_start, maintenance_end) WHERE maintenance_start IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND column_name IN ('maintenance_start', 'maintenance_end')
ORDER BY column_name;
