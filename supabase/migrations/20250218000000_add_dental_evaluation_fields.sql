-- Add new dental evaluation fields to patients table
-- This migration adds the two new fields for Evaluación Odontológica section

-- Add reaccion_adversa_anestesico field
ALTER TABLE patients 
ADD COLUMN reaccion_adversa_anestesico VARCHAR(20) CHECK (reaccion_adversa_anestesico IN ('no', 'si', 'no_aplicada'));

-- Add tipo_reaccion field (conditional text field)
ALTER TABLE patients 
ADD COLUMN tipo_reaccion TEXT;

-- Add experiencia_traumatica field  
ALTER TABLE patients 
ADD COLUMN experiencia_traumatica VARCHAR(20) CHECK (experiencia_traumatica IN ('no', 'si', 'es_1ra_consulta'));

-- Add que_sucedio field (conditional text field)
ALTER TABLE patients 
ADD COLUMN que_sucedio TEXT;

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
