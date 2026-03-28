-- Add ticket_number column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(20);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);

-- Update existing tickets with sequential numbers
UPDATE tickets 
SET ticket_number = 'REQ-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 5, '0')
WHERE ticket_number IS NULL;
