-- Test SQL to verify realtime is working
-- Run this in your Supabase SQL Editor to test

-- First check if realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Test insert to trigger realtime
INSERT INTO calendar_events (
  id, 
  title, 
  description, 
  start_date, 
  end_date, 
  all_day,
  event_type,
  status,
  priority,
  created_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Realtime Event',
  'This should trigger realtime',
  NOW(),
  NOW() + INTERVAL '1 hour',
  false,
  'appointment',
  'scheduled',
  'medium',
  'test-user-id',
  NOW(),
  NOW()
);

-- Test update
UPDATE calendar_events 
SET title = 'Test Realtime Event Updated'
WHERE title = 'Test Realtime Event';

-- Test delete
DELETE FROM calendar_events 
WHERE title = 'Test Realtime Event Updated';
