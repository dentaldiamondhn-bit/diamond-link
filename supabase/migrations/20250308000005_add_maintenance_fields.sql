-- Add maintenance window fields to tickets table
ALTER TABLE tickets 
ADD COLUMN maintenance_start TIMESTAMPTZ,
ADD COLUMN maintenance_end TIMESTAMPTZ;

-- Add comment for maintenance fields
COMMENT ON COLUMN tickets.maintenance_start IS 'Start time for maintenance window (Honduras Time)';
COMMENT ON COLUMN tickets.maintenance_end IS 'End time for maintenance window (Honduras Time)';

-- Create index for maintenance window queries
CREATE INDEX idx_tickets_maintenance_window ON tickets(maintenance_start, maintenance_end) WHERE maintenance_start IS NOT NULL;

-- Update RLS policies to allow maintenance fields
CREATE POLICY "Users can view maintenance windows" ON tickets
  FOR SELECT USING (
    maintenance_start IS NOT NULL AND 
    (creator_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM ticket_assignees WHERE ticket_id = tickets.id AND user_id = auth.uid()) OR
     auth.jwt() ->> 'role' IN ('ADMIN', 'TECH_SUPPORT'))
  );

-- Grant necessary permissions
GRANT USAGE ON SEQUENCE tickets_id_seq TO authenticated;
GRANT ALL ON tickets TO authenticated;
