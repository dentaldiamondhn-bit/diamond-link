-- Add general_health_data and microbiology_data columns to estudios_periodontales
-- Migration: add_general_health_and_microbiology_to_estudios_periodontales.sql
--
-- These columns store the General Health Form and Microbiology Form data
-- as JSONB, enabling save/load round trips for the respective modals.

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS general_health_data JSONB;

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS microbiology_data JSONB;

COMMENT ON COLUMN estudios_periodontales.general_health_data IS 'General health questionnaire data (Allgemeingesundheit form) as JSON';
COMMENT ON COLUMN estudios_periodontales.microbiology_data IS 'Microbiology form data (bacteria exponents) as JSON';