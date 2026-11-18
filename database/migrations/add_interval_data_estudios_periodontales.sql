-- Add interval_data column to estudios_periodontales
-- Migration: add_interval_data_estudios_periodontales.sql
--
-- Stores the maintenance interval modal data ("Intervalo de Mantenimiento")
-- as JSONB, mirroring the reference site's per-study interval_data shape:
--   { recommended: number, suggested: number, smoking: boolean, diabetes: boolean }

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS interval_data JSONB;

COMMENT ON COLUMN estudios_periodontales.interval_data IS 'Maintenance interval data (selected/recommended/suggested months, smoking, diabetes) as JSON';
