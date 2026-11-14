-- Add objetivo del estudio (study objective) to estudios periodontales
-- Migration: add_objetivo_estudio_to_estudios_periodontales.sql

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS objetivo_estudio TEXT;

COMMENT ON COLUMN estudios_periodontales.objetivo_estudio IS 'Free-text study objective (objetivo del estudio) entered when creating the periodontal study';
