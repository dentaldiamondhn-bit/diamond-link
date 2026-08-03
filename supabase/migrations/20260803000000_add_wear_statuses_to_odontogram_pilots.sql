-- Add new dental wear statuses to odontogram_pilots
-- Statuses: Erosión, Abfracción, Atrición, Abrasión
-- Note: The ESTADOS list is primarily frontend. Status values are stored as strings in JSONB columns.
-- This migration maintains a canonical list of statuses in the DB for reference.

-- Reference lookup table (not enforced by foreign key, matching existing pattern)
CREATE TABLE IF NOT EXISTS dental_statuses (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dental_statuses (key, label, color, category) VALUES
  ('erosion', 'Erosión', '#FF8A65', 'wear'),
  ('abfraccion', 'Abfracción', '#BA68C8', 'wear'),
  ('atricion', 'Atrición', '#FFD54F', 'wear'),
  ('abrasion', 'Abrasión', '#4FC3F7', 'wear')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  color = EXCLUDED.color,
  category = EXCLUDED.category;

-- Document the full allowed status set on the datos_odontograma column
COMMENT ON COLUMN odontogram_pilots.datos_odontograma IS
  'Odontogram JSONB. Tooth status keys per section/cuadrante include: sano, cariado, obturado, resina, amalgama, temporal, sellante, corona, protesis, implante, endodoncia, txpulpar, raiz, ausente, erupcion, extraccionind, apilado, movilidad, fistula, fracturado, odontopatia, carilla, caries-restauracion, erosion, abfraccion, atricion, abrasion.';
