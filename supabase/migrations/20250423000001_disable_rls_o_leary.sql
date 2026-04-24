-- Disable RLS on o_leary table to match odontogram_pilots behavior
-- This migration fixes the RLS issue that's preventing O'Leary operations

-- Disable Row Level Security
ALTER TABLE o_leary DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies (if any exist)
DROP POLICY IF EXISTS "Users can view their own O'Leary odontograms" ON o_leary;
DROP POLICY IF EXISTS "Users can create their own O'Leary odontograms" ON o_leary;
DROP POLICY IF EXISTS "Users can update their own O'Leary odontograms" ON o_leary;
DROP POLICY IF EXISTS "Users can delete their own O'Leary odontograms" ON o_leary;

-- Grant broad permissions (matching odontogram_pilots)
GRANT ALL ON o_leary TO authenticated;
GRANT ALL ON o_leary TO service_role;
