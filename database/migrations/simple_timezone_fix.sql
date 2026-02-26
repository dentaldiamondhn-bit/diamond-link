-- Simple timezone fix - just run this first
-- This will fix the immediate function creation issue

-- Drop the problematic functions first
DROP FUNCTION IF EXISTS convert_to_utc_for_storage;

-- Create a simple function that works
CREATE OR REPLACE FUNCTION convert_to_utc_for_storage(local_timestamp TIMESTAMP)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN local_timestamp AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Now test the function
SELECT convert_to_utc_for_storage(NOW()) as test_utc;
