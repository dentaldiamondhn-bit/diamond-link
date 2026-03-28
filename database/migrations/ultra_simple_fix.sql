-- Ultra-simple timezone fix
-- Just create the most basic function possible

CREATE OR REPLACE FUNCTION convert_to_utc_for_storage(local_timestamp TIMESTAMP)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    RETURN NOW() AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT convert_to_utc_for_storage(NOW()) as test;
