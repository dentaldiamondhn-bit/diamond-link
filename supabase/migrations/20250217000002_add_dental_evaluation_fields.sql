-- Add new dental evaluation fields to patients table
-- This migration adds the new fields requested for dental evaluation

-- Add reaccion_adversa_anestesico field
ALTER TABLE patients ADD COLUMN reaccion_adversa_anestesico VARCHAR(20);

-- Add experiencia_odontologica_traumatica field  
ALTER TABLE patients ADD COLUMN experiencia_odontologica_traumatica VARCHAR(20);

-- Add observaciones_generales field
ALTER TABLE patients ADD COLUMN observaciones_generales TEXT;

-- Update existing records to set default values for new fields
UPDATE patients 
SET reaccion_adversa_anestesico = '', 
    experiencia_odontologica_traumatica = '', 
    observaciones_generales = ''
WHERE reaccion_adversa_anestesico IS NULL 
   OR experiencia_odontologica_traumatica IS NULL 
   OR observaciones_generales IS NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN patients.reaccion_adversa_anestesico IS 'Reacción adversa al anestésico del paciente';
COMMENT ON COLUMN pacientes.experiencia_odontologica_traumatica IS 'Ha tenido experiencia odontológica traumática';
COMMENT ON COLUMN pacientes.observaciones_generales IS 'Observaciones generales del paciente';

-- Note: The 'confirm_info' field was removed from the form as it's not stored in the database
