-- Simple test to verify new dental evaluation fields work
-- This will update an existing record to test just the new fields

-- First, find an existing patient to update
SELECT nombre_completo FROM patients LIMIT 1;

-- Then update that record with new field values
UPDATE patients 
SET 
  reaccion_adversa_anestesico = 'no',
  tipo_reaccion = NULL,
  experiencia_traumatica = 'no',
  que_sucedio = NULL
WHERE nombre_completo = (SELECT nombre_completo FROM patients LIMIT 1);

-- Verify the update worked
SELECT 
  nombre_completo,
  reaccion_adversa_anestesico,
  tipo_reaccion,
  experiencia_traumatica,
  que_sucedio
FROM patients 
WHERE nombre_completo = (SELECT nombre_completo FROM patients LIMIT 1);
