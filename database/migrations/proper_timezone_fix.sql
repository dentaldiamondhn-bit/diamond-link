-- Safe timezone fix for all timestamp and date fields
-- This creates helper functions without breaking existing save operations

-- 1. Create timezone conversion helper functions (READ-ONLY, no triggers)
CREATE OR REPLACE FUNCTION get_local_timestamp(timestamp_utc TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITHOUT TIME ZONE AS $$
BEGIN
    -- Convert UTC timestamp to local timezone for display
    RETURN timestamp_utc AT TIME ZONE 'America/Tegucigalpa';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_local_date(date_utc DATE)
RETURNS DATE AS $$
BEGIN
    -- Convert UTC date to local timezone for display
    -- This handles the one-day-behind issue
    RETURN (date_utc::timestamp AT TIME ZONE 'America/Tegucigalpa')::date;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_local_date_text(date_utc DATE)
RETURNS TEXT AS $$
BEGIN
    -- Return formatted local date as text
    RETURN to_char((date_utc::timestamp AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql;

-- 2. Create view functions for safe local timezone display
CREATE OR REPLACE FUNCTION get_patient_local_display(paciente_id_param UUID)
RETURNS TABLE (
    paciente_id UUID,
    nombre_completo TEXT,
    fecha_nacimiento_utc DATE,
    fecha_nacimiento_local DATE,
    fecha_nacimiento_local_text TEXT,
    edad_actual INTEGER,
    numero_identidad TEXT,
    sexo TEXT,
    doctor TEXT,
    fecha_inicio_utc DATE,
    fecha_inicio_local DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.paciente_id,
        p.nombre_completo,
        p.fecha_nacimiento as fecha_nacimiento_utc,
        get_local_date(p.fecha_nacimiento) as fecha_nacimiento_local,
        get_local_date_text(p.fecha_nacimiento) as fecha_nacimiento_local_text,
        p.edad,
        p.numero_identidad,
        p.sexo,
        p.doctor,
        p.fecha_inicio as fecha_inicio_utc,
        get_local_date(p.fecha_inicio) as fecha_inicio_local
    FROM patients p
    WHERE p.paciente_id = paciente_id_param;
END;
$$ LANGUAGE plpgsql;

-- 3. Create similar functions for other tables
-- Calendar events
CREATE OR REPLACE FUNCTION get_calendar_event_local_display(event_id_param UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    start_date_utc TIMESTAMP WITH TIME ZONE,
    start_date_local TIMESTAMP WITHOUT TIME ZONE,
    end_date_utc TIMESTAMP WITH TIME ZONE,
    end_date_local TIMESTAMP WITHOUT TIME ZONE,
    created_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.start_date as start_date_utc,
        get_local_timestamp(e.start_date) as start_date_local,
        e.end_date as end_date_utc,
        get_local_timestamp(e.end_date) as end_date_local,
        e.created_by
    FROM calendar_events e
    WHERE e.id = event_id_param;
END;
$$ LANGUAGE plpgsql;

-- Odontograms
CREATE OR REPLACE FUNCTION get_odontogram_local_display(odontogram_id_param UUID)
RETURNS TABLE (
    id UUID,
    paciente_id UUID,
    version INTEGER,
    fecha_creacion_utc TIMESTAMP WITH TIME ZONE,
    fecha_creacion_local TIMESTAMP WITHOUT TIME ZONE,
    fecha_actualizacion_utc TIMESTAMP WITH TIME ZONE,
    fecha_actualizacion_local TIMESTAMP WITHOUT TIME ZONE,
    activo BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.paciente_id,
        o.version,
        o.fecha_creacion as fecha_creacion_utc,
        get_local_timestamp(o.fecha_creacion) as fecha_creacion_local,
        o.fecha_actualizacion as fecha_actualizacion_utc,
        get_local_timestamp(o.fecha_actualizacion) as fecha_actualizacion_local,
        o.activo
    FROM odontograms o
    WHERE o.id = odontogram_id_param;
END;
$$ LANGUAGE plpgsql;

-- 4. Create utility function for age calculation in local timezone
CREATE OR REPLACE FUNCTION calculate_age_local(fecha_nacimiento DATE)
RETURNS INTEGER AS $$
DECLARE
    birth_date_local DATE;
    current_date_local DATE;
    age INTEGER;
BEGIN
    -- Convert birth date to local timezone
    birth_date_local := get_local_date(fecha_nacimiento);
    
    -- Get current date in local timezone
    current_date_local := CURRENT_DATE;
    
    -- Calculate age
    age := EXTRACT(YEAR FROM AGE(current_date_local, birth_date_local));
    
    RETURN age;
END;
$$ LANGUAGE plpgsql;

-- 5. Performance indexes (safe, won't affect save operations)
CREATE INDEX IF NOT EXISTS idx_patients_fecha_nacimiento ON patients(fecha_nacimiento);
CREATE INDEX IF NOT EXISTS idx_patients_fecha_inicio ON patients(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_odontograms_fecha_creacion ON odontograms(fecha_creacion);

-- 6. Create a configuration table for timezone settings
CREATE TABLE IF NOT EXISTS timezone_config (
    id SERIAL PRIMARY KEY,
    timezone_name TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default timezone configuration
INSERT INTO timezone_config (timezone_name, is_active) 
VALUES ('America/Tegucigalpa', true)
ON CONFLICT DO NOTHING;

-- 7. Create function to get current timezone setting
CREATE OR REPLACE FUNCTION get_current_timezone()
RETURNS TEXT AS $$
BEGIN
    RETURN timezone_name FROM timezone_config WHERE is_active = true LIMIT 1;
END;
$$ LANGUAGE plpgsql;
