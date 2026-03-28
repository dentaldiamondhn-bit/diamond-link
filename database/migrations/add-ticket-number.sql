-- Add ticket_number column to tickets table
ALTER TABLE tickets ADD COLUMN ticket_number VARCHAR(20);

-- Create an index on ticket_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON tickets(ticket_number);

-- Create a sequence for generating ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

-- Update existing tickets with sequential numbers
UPDATE tickets 
SET ticket_number = 'REQ-' || LPAD(nextval('ticket_number_seq')::text, 5, '0')
WHERE ticket_number IS NULL;

-- Reset sequence to the max existing ticket number
SELECT setval('ticket_number_seq', 
  COALESCE(
    (SELECT CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER) + 1 
     FROM tickets 
     WHERE ticket_number LIKE 'REQ-%' 
     ORDER BY CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER) DESC 
     LIMIT 1), 1)
);
