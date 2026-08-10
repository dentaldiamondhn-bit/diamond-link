-- Disable RLS on presupuestos to match odontogram_pilots behavior
-- This migration fixes the RLS issue that prevents quote operations (GET/POST/PUT)
-- from the app's API routes, which use the anon key (the app authenticates with Clerk, not Supabase Auth)

-- Disable Row Level Security
ALTER TABLE presupuestos DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies (if any exist)
DROP POLICY IF EXISTS "Users can view quotes for their patients" ON presupuestos;
DROP POLICY IF EXISTS "Users can create quotes" ON presupuestos;
DROP POLICY IF EXISTS "Users can update quotes" ON presupuestos;
DROP POLICY IF EXISTS "Users can delete quotes" ON presupuestos;

-- Grant broad permissions (matching odontogram_pilots)
GRANT ALL ON presupuestos TO anon;
GRANT ALL ON presupuestos TO authenticated;
GRANT ALL ON presupuestos TO service_role;
