-- Enable Realtime for calendar tables
-- Run this in your Supabase SQL Editor

-- Enable realtime for calendar_events table
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

-- Enable realtime for calendar_tasks table  
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_tasks;

-- Enable realtime for calendar_reminders table
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_reminders;

-- Check if tables are in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
