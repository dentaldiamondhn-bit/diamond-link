-- Add gingival margin (GM) and attachment level (AL) columns to periodontal
-- measurements.
-- Migration: add_periodontal_gm_al_columns.sql
--
-- The chart accepts a signed gingival margin (-99..99, per the reference app)
-- and derives the attachment level from PD and GM, so both values need to
-- survive a save/load round trip. The existing chk_mediciones constraint
-- pins probing depth to 0..20, which would reject the values the chart now
-- allows, so it is replaced with one that covers both columns.

ALTER TABLE mediciones_periodontales
    ADD COLUMN IF NOT EXISTS vestibular_gm_mesial DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS vestibular_gm_medio DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS vestibular_gm_distal DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS palatino_gm_mesial DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS palatino_gm_medio DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS palatino_gm_distal DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS vestibular_al_mesial DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS vestibular_al_medio DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS vestibular_al_distal DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS palatino_al_mesial DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS palatino_al_medio DECIMAL(4,1),
    ADD COLUMN IF NOT EXISTS palatino_al_distal DECIMAL(4,1);

ALTER TABLE mediciones_periodontales
    DROP CONSTRAINT IF EXISTS chk_mediciones;

ALTER TABLE mediciones_periodontales
    ADD CONSTRAINT chk_mediciones CHECK (
        vestibular_mesial >= -99 AND vestibular_mesial <= 99 AND
        vestibular_medio >= -99 AND vestibular_medio <= 99 AND
        vestibular_distal >= -99 AND vestibular_distal <= 99 AND
        palatino_mesial >= -99 AND palatino_mesial <= 99 AND
        palatino_medio >= -99 AND palatino_medio <= 99 AND
        palatino_distal >= -99 AND palatino_distal <= 99 AND
        vestibular_gm_mesial >= -99 AND vestibular_gm_mesial <= 99 AND
        vestibular_gm_medio >= -99 AND vestibular_gm_medio <= 99 AND
        vestibular_gm_distal >= -99 AND vestibular_gm_distal <= 99 AND
        palatino_gm_mesial >= -99 AND palatino_gm_mesial <= 99 AND
        palatino_gm_medio >= -99 AND palatino_gm_medio <= 99 AND
        palatino_gm_distal >= -99 AND palatino_gm_distal <= 99 AND
        vestibular_al_mesial >= -99 AND vestibular_al_mesial <= 99 AND
        vestibular_al_medio >= -99 AND vestibular_al_medio <= 99 AND
        vestibular_al_distal >= -99 AND vestibular_al_distal <= 99 AND
        palatino_al_mesial >= -99 AND palatino_al_mesial <= 99 AND
        palatino_al_medio >= -99 AND palatino_al_medio <= 99 AND
        palatino_al_distal >= -99 AND palatino_al_distal <= 99
    );

COMMENT ON COLUMN mediciones_periodontales.vestibular_gm_mesial IS 'Gingival margin, vestibular mesial, in mm (negative = recession)';
COMMENT ON COLUMN mediciones_periodontales.palatino_gm_mesial IS 'Gingival margin, palatino/lingual mesial, in mm (negative = recession)';
COMMENT ON COLUMN mediciones_periodontales.vestibular_al_mesial IS 'Attachment level, vestibular mesial, in mm (derived from PD and GM)';
COMMENT ON COLUMN mediciones_periodontales.palatino_al_mesial IS 'Attachment level, palatino/lingual mesial, in mm (derived from PD and GM)';
