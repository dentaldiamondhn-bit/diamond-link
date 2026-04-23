-- Add new dental status: Fistula
-- Note: The ESTADOS list is primarily frontend. Status values are stored as strings in JSONB columns.
-- This script ensures no database constraints block the new 'fistula' status.

-- Optional: Create a lookup table for reference (not enforced by foreign key)
-- Uncomment if you want to maintain a canonical list of statuses in the DB
/*
CREATE TABLE IF NOT EXISTS dental_statuses (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dental_statuses (key, label, color, category) VALUES
  ('fistula', 'Fístula', '#7E57C2', 'pathology')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  color = EXCLUDED.color;
*/

-- No schema changes required - statuses are free text stored in JSONB
