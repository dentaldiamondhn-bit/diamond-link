-- Fix RLS policies for odontogram_pilots table
-- This migration drops existing policies and recreates them with proper syntax

-- First, ensure table exists
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated update access" ON odontogram_pilots;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON odontogram_pilots;

-- Create new policies with proper names
CREATE POLICY "Allow authenticated read access" ON odontogram_pilots
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert access" ON odontogram_pilots
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update access" ON odontogram_pilots
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete access" ON odontogram_pilots
FOR DELETE USING (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE odontogram_pilots ENABLE ROW LEVEL SECURITY;
