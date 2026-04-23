-- Create odontogram_pilots table for quadrant-based pilot odontograms
-- This table stores pilot odontogram data with per-quadrant tooth states

-- Drop existing trigger and functions if they exist (idempotent migration)
DROP TRIGGER IF EXISTS update_odontogram_pilots_updated_at ON odontogram_pilots;
DROP FUNCTION IF EXISTS update_odontogram_pilot_updated_at();
DROP FUNCTION IF EXISTS get_next_odontogram_pilot_version(UUID);

CREATE TABLE IF NOT EXISTS odontogram_pilots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  datos_odontograma JSONB NOT NULL DEFAULT '{}',
  notas TEXT,
  creado_por TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paciente_id, version)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_odontogram_pilots_paciente_id ON odontogram_pilots(paciente_id);
CREATE INDEX IF NOT EXISTS idx_odontogram_pilots_activo ON odontogram_pilots(activo);
CREATE INDEX IF NOT EXISTS idx_odontogram_pilots_version ON odontogram_pilots(version);

-- Enable Row Level Security (DISABLED for now - matching original odontograms behavior)
-- ALTER TABLE odontogram_pilots ENABLE ROW LEVEL SECURITY;

-- Function to get next version number for a patient
CREATE OR REPLACE FUNCTION get_next_odontogram_pilot_version(paciente_id_param UUID) RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
  FROM odontogram_pilots
  WHERE paciente_id = paciente_id_param;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update fecha_actualizacion
CREATE OR REPLACE FUNCTION update_odontogram_pilot_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_odontogram_pilots_updated_at
BEFORE UPDATE ON odontogram_pilots
FOR EACH ROW
EXECUTE FUNCTION update_odontogram_pilot_updated_at();

-- RLS Policies (commented out - re-enable when RLS is properly configured)
-- CREATE POLICY "Allow authenticated read access" ON odontogram_pilots
--   FOR SELECT USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated insert access" ON odontogram_pilots
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated update access" ON odontogram_pilots
--   FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated delete access" ON odontogram_pilots
--   FOR DELETE USING (auth.role() = 'authenticated');

-- Comment on table
COMMENT ON TABLE odontogram_pilots IS 'Stores pilot odontogram data with per-quadrant tooth states (mesial, distal, buccal, lingual).';
