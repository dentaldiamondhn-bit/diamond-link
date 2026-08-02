-- Enable Realtime for WhatsApp global template tables
-- Run this in your Supabase SQL Editor

-- Enable realtime for whatsapp_templates table
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_templates;

-- Enable realtime for whatsapp_templates_history table
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_templates_history;

-- Check if tables are in the publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
