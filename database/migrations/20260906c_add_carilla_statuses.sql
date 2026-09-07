-- Add Carilla subtype statuses to the odontogram status reference.
--
-- New statuses for the odontogram-pilot "Seleccionar Estado" dropdown:
--   · Carilla de Resina      (carilla_resina)
--   · Carilla Defectuosa     (carilla_defectuosa)
--   · Carilla de Disilicato  (carilla_disilicato)
--
-- The dropdown and tooth rendering are frontend-driven (status keys are stored
-- as strings in the odontogram_pilots.datos_odontograma JSONB). This migration
-- keeps the canonical `dental_statuses` reference lookup in sync and documents
-- the full allowed status set on the datos_odontograma column, matching the
-- existing pattern from 20260803000000_add_wear_statuses_to_odontogram_pilots.sql.
--
-- Run in the Supabase SQL Editor: Database -> SQL -> New query -> Run.

-- Reference lookup table (not enforced by foreign key, matching existing pattern)
CREATE TABLE IF NOT EXISTS dental_statuses (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dental_statuses (key, label, color, category) VALUES
  ('carilla_resina', 'Carilla de Resina', '#4DD0E1', 'restoration'),
  ('carilla_defectuosa', 'Carilla Defectuosa', '#E57373', 'restoration'),
  ('carilla_disilicato', 'Carilla de Disilicato', '#B0BEC5', 'restoration')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  color = EXCLUDED.color,
  category = EXCLUDED.category;

-- Document the full allowed status set on the datos_odontograma column
COMMENT ON COLUMN odontogram_pilots.datos_odontograma IS
  'Odontogram JSONB. Tooth status keys per section/cuadrante include: sano, cariado, obturado, resina, amalgama, temporal, sellante, corona, protesis, implante, endodoncia, txpulpar, raiz, ausente, erupcion, extraccionind, apilado, movilidad, fistula, fracturado, odontopatia, carilla, caries-restauracion, erosion, abfraccion, atricion, abrasion, carilla_resina, carilla_defectuosa, carilla_disilicato.';