-- Add per-patient version numbering to periodontal studies.
-- Migration: add_version_to_estudios_periodontales.sql
--
-- Mirrors odontogram-pilot: every saved study carries a version number
-- scoped to its patient (1 = oldest, auto-incremented on insert), so the
-- saved-studies list can label and track history. Existing studies are
-- backfilled in chronological order per patient.

ALTER TABLE estudios_periodontales
    ADD COLUMN IF NOT EXISTS version INTEGER;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY paciente_id
        ORDER BY fecha_estudio ASC, creado_en ASC, id ASC
    ) AS rn
    FROM estudios_periodontales
)
UPDATE estudios_periodontales e
SET version = ranked.rn
FROM ranked
WHERE e.id = ranked.id
  AND e.version IS NULL;

ALTER TABLE estudios_periodontales
    ADD CONSTRAINT uniq_estudios_periodontales_paciente_version
    UNIQUE (paciente_id, version);

COMMENT ON COLUMN estudios_periodontales.version IS 'Per-patient study version (1 = oldest, auto-incremented on insert, like odontogram-pilot)';
