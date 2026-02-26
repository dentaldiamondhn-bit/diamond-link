-- Disable odontograms timezone triggers to fix immediate issues
DROP TRIGGER IF EXISTS handle_odontograms_timezone ON odontograms;
DROP FUNCTION IF EXISTS handle_odontograms_timezone_conversion();

-- Also disable the general timezone conversion if it's causing issues
-- This will allow odontograms to work without timezone conflicts
DROP TRIGGER IF EXISTS handle_calendar_events_timezone ON calendar_events;
DROP TRIGGER IF EXISTS handle_patients_timezone ON patients;
DROP TRIGGER IF EXISTS handle_tratamientos_timezone ON tratamientos;
DROP TRIGGER IF EXISTS handle_presupuestos_timezone ON presupuestos;
DROP FUNCTION IF EXISTS handle_timezone_conversion();
DROP FUNCTION IF EXISTS convert_to_utc_for_storage();
DROP FUNCTION IF EXISTS convert_to_local_time();
