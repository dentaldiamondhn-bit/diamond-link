-- PostgREST Cache Refresh: Force schema cache invalidation
-- This will force PostgREST to recognize the updated enum

-- Method 1: Create a dummy table and drop it to trigger cache refresh
CREATE TABLE IF NOT EXISTS cache_refresh_trigger (
  id TEXT PRIMARY KEY DEFAULT 'refresh-trigger',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop it immediately to trigger schema change
DROP TABLE IF EXISTS cache_refresh_trigger;

-- Method 2: Update table statistics to invalidate cache
ANALYZE tickets;

-- Method 3: Force PostgREST to reload schema
-- This requires contacting Supabase support, but we can try

-- Method 4: Create a test record that uses the enum to force recognition
INSERT INTO tickets (title, type, creator_id, maintenance_start, maintenance_end)
VALUES (
  'Cache Refresh Test', 
  'maintenance'::ticket_type,
  'user_3A1mYfR054eV3tqtellpfMKZ7f6',
  NOW(),
  NOW() + INTERVAL '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- Verify the enum is accessible
SELECT unnest(enum_range(NULL::ticket_type)) as verify_enum;

-- Clean up test record
DELETE FROM tickets WHERE title = 'Cache Refresh Test';
