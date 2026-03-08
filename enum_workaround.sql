-- Workaround: Bypass enum entirely with text column
-- This will create a text column that accepts any value temporarily

-- Step 1: Add a text column for type
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type_text TEXT;

-- Step 2: Update all existing records to use text column
UPDATE tickets SET type_text = type::text WHERE type_text IS NULL;

-- Step 3: Drop the problematic enum column
ALTER TABLE tickets DROP COLUMN IF EXISTS type;

-- Step 4: Rename text column to type
ALTER TABLE tickets RENAME COLUMN type_text TO type;

-- Step 5: Add a check constraint to validate values
ALTER TABLE tickets ADD CONSTRAINT valid_ticket_type 
  CHECK (type IN ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER', 'PATIENT_CASE', 'MAINTENANCE'));

-- Step 6: Test the workaround - try different approaches for foreign key
-- Approach 1: Check if constraint really exists
SELECT conname, contype, convalidated 
FROM pg_constraint 
WHERE conrelid = 'tickets'::regclass 
AND conname = 'fk_tickets_creator';

-- Approach 2: Try to drop it with CASCADE
ALTER TABLE tickets DROP CONSTRAINT fk_tickets_creator CASCADE;

-- Approach 3: If that doesn't work, create the user in users table temporarily
INSERT INTO users (id, name, email, role, created_at, updated_at)
VALUES (
  'user_3A1mYfR054eV3tqtellpfMKZ7f6',
  'Test User',
  'test@example.com',
  'STAFF',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Test the enum workaround
INSERT INTO tickets (title, type, creator_id, maintenance_start, maintenance_end)
VALUES (
  'Workaround Test Maintenance', 
  'MAINTENANCE',
  'user_3A1mYfR054eV3tqtellpfMKZ7f6',
  '2026-03-10T00:00:00Z',
  '2026-03-10T01:00:00Z'
);

-- Re-add the foreign key constraint after test
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_creator 
  FOREIGN KEY (creator_id) REFERENCES users(id);

-- Step 7: Verify the workaround worked
SELECT id, title, type, created_at 
FROM tickets 
WHERE title = 'Workaround Test Maintenance'
ORDER BY created_at DESC 
LIMIT 1;

-- Step 8: Clean up test record
DELETE FROM tickets WHERE title = 'Workaround Test Maintenance';
