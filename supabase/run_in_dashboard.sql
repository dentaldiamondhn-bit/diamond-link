-- SQL Script to run in Supabase Dashboard
-- Go to Supabase Dashboard > SQL Editor > run this script

-- Add new dental evaluation fields to patients table
-- This script adds the missing columns for the new dental evaluation fields

-- First, check if columns exist and add them if they don't
DO $$
BEGIN
    -- Add reaccion_adversa_anestesico field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='patients' AND column_name='reaccion_adversa_anestesico'
    ) THEN
        ALTER TABLE patients 
        ADD COLUMN reaccion_adversa_anestesico VARCHAR(20) 
        CHECK (reaccion_adversa_anestesico IN ('no', 'si', 'no_aplicada'));
    END IF;

    -- Add tipo_reaccion field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='patients' AND column_name='tipo_reaccion'
    ) THEN
        ALTER TABLE patients ADD COLUMN tipo_reaccion TEXT;
    END IF;

    -- Add experiencia_traumatica field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='patients' AND column_name='experiencia_traumatica'
    ) THEN
        ALTER TABLE patients 
        ADD COLUMN experiencia_traumatica VARCHAR(20) 
        CHECK (experiencia_traumatica IN ('no', 'si', 'es_1ra_consulta'));
    END IF;

    -- Add que_sucedio field
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='patients' AND column_name='que_sucedio'
    ) THEN
        ALTER TABLE patients ADD COLUMN que_sucedio TEXT;
    END IF;
END $$;

-- Add comments to document the new fields
COMMENT ON COLUMN patients.reaccion_adversa_anestesico IS 'Reacción adversa al anestésico: no, si, no_aplicada';
COMMENT ON COLUMN patients.tipo_reaccion IS 'Tipo de reacción adversa al anestésico (solo si reaccion_adversa_anestesico = si)';
COMMENT ON COLUMN patients.experiencia_traumatica IS 'Experiencia odontológica traumática: no, si, es_1ra_consulta';
COMMENT ON COLUMN patients.que_sucedio IS 'Descripción de experiencia traumática (solo si experiencia_traumatica = si)';

-- Set default values for existing records
UPDATE patients 
SET reaccion_adversa_anestesico = 'no_aplicada' 
WHERE reaccion_adversa_anestesico IS NULL;

UPDATE patients 
SET experiencia_traumatica = 'es_1ra_consulta' 
WHERE experiencia_traumatica IS NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name='patients' 
AND column_name IN ('reaccion_adversa_anestesico', 'tipo_reaccion', 'experiencia_traumatica', 'que_sucedio')
ORDER BY column_name;
