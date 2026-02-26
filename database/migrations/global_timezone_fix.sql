-- Global timezone fix for all timestamp handling
-- This ensures all dates are stored and retrieved consistently

-- 1. Create a timezone configuration table
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default timezone configuration
INSERT INTO app_config (key, value) VALUES 
    ('default_timezone', 'America/Tegucigalpa'),
    ('timezone_offset', '-06:00'),
    ('clinic_timezone', 'America/Tegucigalpa')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- 3. Create a function to handle timezone conversion
CREATE OR REPLACE FUNCTION convert_to_local_time(timestamp_with_tz TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Convert the input timestamp to the clinic timezone
    RETURN timestamp_with_tz AT TIME ZONE 'America/Tegucigalpa';
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to handle timezone conversion for storage
CREATE OR REPLACE FUNCTION convert_to_utc_for_storage(local_timestamp TIMESTAMP)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Convert local timestamp to UTC for storage
    RETURN local_timestamp AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers for automatic timezone handling
CREATE OR REPLACE FUNCTION handle_timezone_conversion()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure new records are stored in UTC
    NEW.created_at = convert_to_utc_for_storage(NOW());
    NEW.updated_at = convert_to_utc_for_storage(NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a specific function for odontograms table
CREATE OR REPLACE FUNCTION handle_odontograms_timezone_conversion()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure new records are stored in UTC using correct field names
    NEW.fecha_creacion = convert_to_utc_for_storage(NOW());
    NEW.fecha_actualizacion = convert_to_utc_for_storage(NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables (only for new records)
DROP TRIGGER IF EXISTS handle_calendar_events_timezone ON calendar_events;
CREATE TRIGGER handle_calendar_events_timezone
    BEFORE INSERT OR UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION handle_timezone_conversion();

DROP TRIGGER IF EXISTS handle_patients_timezone ON patients;
CREATE TRIGGER handle_patients_timezone
    BEFORE INSERT OR UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION handle_timezone_conversion();

DROP TRIGGER IF EXISTS handle_tratamientos_timezone ON tratamientos;
CREATE TRIGGER handle_tratamientos_timezone
    BEFORE INSERT OR UPDATE ON tratamientos
    FOR EACH ROW
    EXECUTE FUNCTION handle_timezone_conversion();

DROP TRIGGER IF EXISTS handle_presupuestos_timezone ON presupuestos;
CREATE TRIGGER handle_presupuestos_timezone
    BEFORE INSERT OR UPDATE ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION handle_timezone_conversion();

-- Use the specific odontograms trigger
DROP TRIGGER IF EXISTS handle_odontograms_timezone ON odontograms;
CREATE TRIGGER handle_odontograms_timezone
    BEFORE INSERT OR UPDATE ON odontograms
    FOR EACH ROW
    EXECUTE FUNCTION handle_odontograms_timezone_conversion();
