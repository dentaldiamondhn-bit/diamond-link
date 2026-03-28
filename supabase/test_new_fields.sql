-- Test script to debug new dental evaluation fields
-- Run this in Supabase SQL Editor to test if fields accept values

-- First, let's check the actual table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name='patients' 
ORDER BY column_name;

-- Test inserting a record with ALL required fields to avoid NOT NULL constraints
INSERT INTO patients (
  nombre_completo, 
  tipo_identificacion, 
  numero_identidad,
  fecha_nacimiento,
  sexo,
  tipo_sangre,
  telefono,
  email,
  doctor,
  fecha_inicio,
  seguro,
  reaccion_adversa_anestesico,
  tipo_reaccion,
  experiencia_traumatica,
  que_sucedio
) VALUES (
  'Test Patient',
  'HN',
  '12345678',
  '1987-04-04',
  'masculino',
  'O+',
  '9771-5979',
  'test@example.com',
  'Dra. Sully Calix',
  '2026-01-08',
  'IHSS',
  'no',  -- This should work
  NULL,     -- This should be NULL when reaccion is 'no'
  'no',   -- This should work
  NULL      -- This should be NULL when experiencia is 'no'
);

-- Test if the insert works
SELECT 
  nombre_completo,
  reaccion_adversa_anestesico,
  tipo_reaccion,
  experiencia_traumatica,
  que_sucedio
FROM patients 
WHERE nombre_completo = 'Test Patient';

-- If this works, the issue is in the application logic
-- If this fails, the issue is in the database constraints
