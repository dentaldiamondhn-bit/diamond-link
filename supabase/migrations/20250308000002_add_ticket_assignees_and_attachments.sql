-- Create ticket assignees table for multiple user assignments
CREATE TABLE ticket_assignees (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ticket attachments table for patient information
CREATE TABLE ticket_attachments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(paciente_id) ON DELETE SET NULL,
    attachment_type VARCHAR(50) NOT NULL, -- 'consent', 'odontogram', 'treatment', 'event', 'task', 'document'
    attachment_id TEXT NOT NULL, -- Reference to the actual record ID
    attachment_title TEXT NOT NULL,
    attachment_description TEXT,
    file_url TEXT, -- If it's a file
    metadata JSONB, -- Additional attachment data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ticket_assignees_ticket_id ON ticket_assignees(ticket_id);
CREATE INDEX idx_ticket_assignees_user_id ON ticket_assignees(user_id);
CREATE INDEX idx_ticket_assignees_assigned_at ON ticket_assignees(assigned_at);

CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_patient_id ON ticket_attachments(patient_id);
CREATE INDEX idx_ticket_attachments_type ON ticket_attachments(attachment_type);
CREATE INDEX idx_ticket_attachments_attachment_id ON ticket_attachments(attachment_id);

-- Enable RLS on new tables
ALTER TABLE ticket_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket assignees
CREATE POLICY "Users can view assignees for tickets they can access" ON ticket_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_assignees.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can create assignees for tickets they can access" ON ticket_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_assignees.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can update assignees for tickets they can access" ON ticket_assignees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_assignees.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can delete assignees for tickets they can access" ON ticket_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_assignees.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

-- RLS Policies for ticket attachments
CREATE POLICY "Users can view attachments for tickets they can access" ON ticket_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_attachments.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can create attachments for tickets they can access" ON ticket_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_attachments.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can update attachments for tickets they can access" ON ticket_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_attachments.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

CREATE POLICY "Users can delete attachments for tickets they can access" ON ticket_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_attachments.ticket_id AND (
        tickets.creator_id = auth.uid()::text OR 
        tickets.assignee_id = auth.uid()::text OR
        (SELECT role FROM users WHERE id = auth.uid()::text) IN ('ADMIN', 'TECH_SUPPORT')
      )
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ticket_assignees_updated_at BEFORE UPDATE ON ticket_assignees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_attachments_updated_at BEFORE UPDATE ON ticket_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
