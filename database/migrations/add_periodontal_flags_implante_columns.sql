-- Add per-site bleeding/plaque flags and implant status to periodontal
-- measurements.
-- Migration: add_periodontal_flags_implante_columns.sql
--
-- The chart records BOP and plaque per site (3 vestibular + 3
-- palatino/lingual sites per tooth), but the tooth-level sangrado/placa
-- booleans collapse them into a single flag, losing per-site precision on
-- the save/load round trip. Implant status was never persisted at all.
-- Mirrors the vestibular_gm_*/palatino_*_al_* per-site column pattern.

ALTER TABLE mediciones_periodontales
    ADD COLUMN IF NOT EXISTS sangrado_vestibular_mesial BOOLEAN,
    ADD COLUMN IF NOT EXISTS sangrado_vestibular_medio BOOLEAN,
    ADD COLUMN IF NOT EXISTS sangrado_vestibular_distal BOOLEAN,
    ADD COLUMN IF NOT EXISTS sangrado_palatino_mesial BOOLEAN,
    ADD COLUMN IF NOT EXISTS sangrado_palatino_medio BOOLEAN,
    ADD COLUMN IF NOT EXISTS sangrado_palatino_distal BOOLEAN,
    ADD COLUMN IF NOT EXISTS placa_vestibular_mesial BOOLEAN,
    ADD COLUMN IF NOT EXISTS placa_vestibular_medio BOOLEAN,
    ADD COLUMN IF NOT EXISTS placa_vestibular_distal BOOLEAN,
    ADD COLUMN IF NOT EXISTS placa_palatino_mesial BOOLEAN,
    ADD COLUMN IF NOT EXISTS placa_palatino_medio BOOLEAN,
    ADD COLUMN IF NOT EXISTS placa_palatino_distal BOOLEAN,
    ADD COLUMN IF NOT EXISTS implante SMALLINT;

ALTER TABLE mediciones_periodontales
    ADD CONSTRAINT chk_implante CHECK (implante IS NULL OR implante BETWEEN 0 AND 3);

COMMENT ON COLUMN mediciones_periodontales.sangrado_vestibular_mesial IS 'Bleeding on probing (BOP), vestibular mesial site';
COMMENT ON COLUMN mediciones_periodontales.sangrado_palatino_distal IS 'Bleeding on probing (BOP), palatino/lingual distal site';
COMMENT ON COLUMN mediciones_periodontales.placa_vestibular_mesial IS 'Plaque index, vestibular mesial site';
COMMENT ON COLUMN mediciones_periodontales.placa_palatino_distal IS 'Plaque index, palatino/lingual distal site';
COMMENT ON COLUMN mediciones_periodontales.implante IS 'Implant status per tooth (0 = none, 1..3 = state cycled in the chart)';
