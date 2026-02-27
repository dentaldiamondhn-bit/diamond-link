-- Add reminder_minutes column to calendar_tasks table
ALTER TABLE calendar_tasks 
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 0;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_reminder_minutes ON calendar_tasks(reminder_minutes);
