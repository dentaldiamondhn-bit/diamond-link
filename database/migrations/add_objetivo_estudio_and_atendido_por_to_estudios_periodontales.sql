-- Add objetivo del estudio (study objective) and atendido por (attending
-- clinician) columns to estudios periodontales
-- Migration: add_objetivo_estudio_and_atendido_por_to_estudios_periodontales.sql

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS objetivo_estudio TEXT;

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS atendido_por TEXT;

COMMENT ON COLUMN estudios_periodontales.objetivo_estudio IS 'Free-text study objective (objetivo del estudio) entered when creating the periodontal study';
COMMENT ON COLUMN estudios_periodontales.atendido_por IS 'Attending clinician name (odontologo) recorded with the study; free text so overrides persist even without a doctors-table match';
