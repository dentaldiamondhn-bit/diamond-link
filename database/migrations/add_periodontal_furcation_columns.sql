-- Add per-site furcation grades to periodontal measurements.
-- Migration: add_periodontal_furcation_columns.sql
--
-- The furcation selector stores one grade (0..3) per applicable site, like
-- the reference app: b (vestibular) on molars of both arches, mp/dp (the two
-- palatal roots) on upper molars and first premolars, l (lingual) on lower
-- molars. The header-level estudios_periodontales.furcaciones column only
-- carried a single study-wide grade, which cannot represent per-tooth
-- findings, so the grades live on mediciones_periodontales.

ALTER TABLE mediciones_periodontales
    ADD COLUMN IF NOT EXISTS furcacion_b SMALLINT,
    ADD COLUMN IF NOT EXISTS furcacion_mp SMALLINT,
    ADD COLUMN IF NOT EXISTS furcacion_dp SMALLINT,
    ADD COLUMN IF NOT EXISTS furcacion_l SMALLINT;

ALTER TABLE mediciones_periodontales
    DROP CONSTRAINT IF EXISTS chk_furcacion_diente;

ALTER TABLE mediciones_periodontales
    ADD CONSTRAINT chk_furcacion_diente CHECK (
        (furcacion_b IS NULL OR furcacion_b BETWEEN 0 AND 3) AND
        (furcacion_mp IS NULL OR furcacion_mp BETWEEN 0 AND 3) AND
        (furcacion_dp IS NULL OR furcacion_dp BETWEEN 0 AND 3) AND
        (furcacion_l IS NULL OR furcacion_l BETWEEN 0 AND 3)
    );

COMMENT ON COLUMN mediciones_periodontales.furcacion_b IS 'Furcation grade, vestibular site (0 = none, 1..3 = degree)';
COMMENT ON COLUMN mediciones_periodontales.furcacion_mp IS 'Furcation grade, mesiopalatino root (upper molars/premolars)';
COMMENT ON COLUMN mediciones_periodontales.furcacion_dp IS 'Furcation grade, distopalatino root (upper molars/premolars)';
COMMENT ON COLUMN mediciones_periodontales.furcacion_l IS 'Furcation grade, lingual site (lower molars)';
