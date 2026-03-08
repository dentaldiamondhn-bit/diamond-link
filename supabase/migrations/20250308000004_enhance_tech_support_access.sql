-- Enhanced Tech Support Access Policies
-- Ensure TECH_SUPPORT has unrestricted access to all tickets

-- Drop existing policies to recreate with explicit tech support access
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can view tickets assigned to them or created by them" ON tickets;
    DROP POLICY IF EXISTS "Users can update tickets they created or are assigned to" ON tickets;
    DROP POLICY IF EXISTS "Users can view activities for tickets they can access" ON ticket_activities;
    DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
END $$;

-- Recreate policies with explicit tech support access first
CREATE POLICY "Tech Support can view all tickets" ON tickets
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'TECH_SUPPORT'
  );

CREATE POLICY "Tech Support can update all tickets" ON tickets
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'TECH_SUPPORT'
  );

CREATE POLICY "Tech Support can view all activities" ON ticket_activities
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) = 'TECH_SUPPORT'
  );

-- Then recreate regular user policies
CREATE POLICY "Users can view tickets assigned to them or created by them" ON tickets
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT') OR
    auth.uid()::text = creator_id OR 
    auth.uid()::text = assignee_id
  );

CREATE POLICY "Users can create tickets" ON tickets
  FOR INSERT WITH CHECK (auth.uid()::text = creator_id);

CREATE POLICY "Users can update tickets they created or are assigned to" ON tickets
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT') OR
    auth.uid()::text = creator_id OR 
    auth.uid()::text = assignee_id
  );

CREATE POLICY "Users can view activities for tickets they can access" ON ticket_activities
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT') OR
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_activities.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text
      )
    )
  );

-- Grant explicit permissions to authenticated users
GRANT ALL ON tickets TO authenticated;
GRANT ALL ON ticket_activities TO authenticated;
GRANT ALL ON ticket_assignees TO authenticated;
GRANT ALL ON ticket_attachments TO authenticated;
