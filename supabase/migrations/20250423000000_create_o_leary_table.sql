-- Create O'Leary odontogram table
CREATE TABLE IF NOT EXISTS o_leary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creado_por TEXT,
  notas TEXT,
  datos_odontograma JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT unique_paciente_version UNIQUE (paciente_id, version)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_o_leary_paciente_id ON o_leary(paciente_id);
CREATE INDEX IF NOT EXISTS idx_o_leary_paciente_activo ON o_leary(paciente_id, activo);
CREATE INDEX IF NOT EXISTS idx_o_leary_fecha_creacion ON o_leary(fecha_creacion);

-- Disable RLS to match odontogram_pilots behavior
ALTER TABLE o_leary DISABLE ROW LEVEL SECURITY;

-- Grant broad permissions (matching odontogram_pilots)
GRANT ALL ON o_leary TO authenticated;
GRANT ALL ON o_leary TO service_role;

-- Function to get next version number for O'Leary odontograms
CREATE OR REPLACE FUNCTION get_next_o_leary_version(paciente_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM o_leary
  WHERE paciente_id = paciente_uuid;
  
  RETURN max_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update fecha_actualizacion
CREATE OR REPLACE FUNCTION update_o_leary_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_o_leary_timestamp
  BEFORE UPDATE ON o_leary
  FOR EACH ROW
  EXECUTE FUNCTION update_o_leary_timestamp();
