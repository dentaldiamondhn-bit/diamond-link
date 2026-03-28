-- Create tables for estudio periodontal management
-- Migration: create_estudios_periodontales_tables.sql

-- Main estudios periodontales table
CREATE TABLE IF NOT EXISTS estudios_periodontales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    fecha_estudio DATE NOT NULL DEFAULT CURRENT_DATE,
    indice_placa DECIMAL(5,2),
    indice_sangrado DECIMAL(5,2),
    nivel_insercion_clinica TEXT,
    furcaciones VARCHAR(20) DEFAULT 'no-evaluado',
    observaciones_generales TEXT,
    plan_tratamiento JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_furcaciones CHECK (furcaciones IN ('no-evaluado', 'grado1', 'grado2', 'grado3')),
    CONSTRAINT chk_indices CHECK (indice_placa >= 0 AND indice_placa <= 100),
    CONSTRAINT chk_indices_sangrado CHECK (indice_sangrado >= 0 AND indice_sangrado <= 100)
);

-- Tooth measurements table
CREATE TABLE IF NOT EXISTS mediciones_periodontales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudio_id UUID NOT NULL REFERENCES estudios_periodontales(id) ON DELETE CASCADE,
    numero_diente VARCHAR(2) NOT NULL,
    
    -- Vestibular measurements
    vestibular_mesial DECIMAL(4,1),
    vestibular_medio DECIMAL(4,1),
    vestibular_distal DECIMAL(4,1),
    
    -- Palatino/Lingual measurements
    palatino_mesial DECIMAL(4,1),
    palatino_medio DECIMAL(4,1),
    palatino_distal DECIMAL(4,1),
    
    -- Other assessments
    movilidad INTEGER DEFAULT 0,
    sangrado BOOLEAN DEFAULT FALSE,
    placa BOOLEAN DEFAULT FALSE,
    observaciones_diente TEXT,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_numero_diente CHECK (
        numero_diente IN ('18', '17', '16', '15', '14', '13', '12', '11',
                         '21', '22', '23', '24', '25', '26', '27', '28',
                         '38', '37', '36', '35', '34', '33', '32', '31',
                         '41', '42', '43', '44', '45', '46', '47', '48')
    ),
    CONSTRAINT chk_movilidad CHECK (movilidad IN (0, 1, 2, 3)),
    CONSTRAINT chk_mediciones CHECK (
        vestibular_mesial >= 0 AND vestibular_mesial <= 20 AND
        vestibular_medio >= 0 AND vestibular_medio <= 20 AND
        vestibular_distal >= 0 AND vestibular_distal <= 20 AND
        palatino_mesial >= 0 AND palatino_mesial <= 20 AND
        palatino_medio >= 0 AND palatino_medio <= 20 AND
        palatino_distal >= 0 AND palatino_distal <= 20
    ),
    
    -- Unique constraint for tooth per study
    UNIQUE(estudio_id, numero_diente)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estudios_periodontales_paciente_fecha ON estudios_periodontales(paciente_id, fecha_estudio DESC);
CREATE INDEX IF NOT EXISTS idx_estudios_periodontales_doctor_fecha ON estudios_periodontales(doctor_id, fecha_estudio DESC);
CREATE INDEX IF NOT EXISTS idx_estudios_periodontales_fecha ON estudios_periodontales(fecha_estudio DESC);
CREATE INDEX IF NOT EXISTS idx_mediciones_periodontales_estudio ON mediciones_periodontales(estudio_id);
CREATE INDEX IF NOT EXISTS idx_mediciones_periodontales_diente ON mediciones_periodontales(numero_diente);

-- Disable RLS (API routes handle authorization)
ALTER TABLE estudios_periodontales DISABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones_periodontales DISABLE ROW LEVEL SECURITY;

-- Trigger to update actualizado_en timestamp
CREATE OR REPLACE FUNCTION update_actualizado_en_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_estudios_periodontales_actualizado_en
    BEFORE UPDATE ON estudios_periodontales
    FOR EACH ROW
    EXECUTE FUNCTION update_actualizado_en_column();

CREATE TRIGGER update_mediciones_periodontales_actualizado_en
    BEFORE UPDATE ON mediciones_periodontales
    FOR EACH ROW
    EXECUTE FUNCTION update_actualizado_en_column();

-- Comments for documentation
COMMENT ON TABLE estudios_periodontales IS 'Main table for storing periodontal study records';
COMMENT ON TABLE mediciones_periodontales IS 'Table for storing individual tooth measurements for each periodontal study';
COMMENT ON COLUMN estudios_periodontales.plan_tratamiento IS 'JSON object containing treatment plan options (profilaxis, raspaje, cirugia, mantenimiento, otro)';
COMMENT ON COLUMN mediciones_periodontales.numero_diente IS 'Tooth number following FDI notation (18-11, 21-28, 38-31, 41-48)';
