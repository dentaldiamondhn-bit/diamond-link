-- Debug script to check current data in historia_clinica_ortodoncia table
-- This will help us understand what's being saved and what's not

SELECT 
    id,
    paciente_id,
    nombre_completo,
    duracion_tratamiento,
    retenedor_tipo,
    retenedor_uso,
    retenedor_inferior_tipo,
    retenedor_inferior_uso,
    created_at,
    updated_at
FROM historia_clinica_ortodoncia 
WHERE paciente_id = 'f80bfe4d-08e1-4b19-8f32-8cb071eaac81'  -- Using the patient ID from the example
ORDER BY created_at DESC;

-- Also check if there are any records with non-null inferior retainer values
SELECT 
    COUNT(*) as total_records,
    COUNT(retenedor_inferior_tipo) as records_with_inferior_tipo,
    COUNT(retenedor_inferior_uso) as records_with_inferior_uso,
    COUNT(duracion_tratamiento) as records_with_duracion
FROM historia_clinica_ortodoncia;

-- Check the most recent records to see if any have inferior retainer data
SELECT 
    nombre_completo,
    duracion_tratamiento,
    retenedor_tipo,
    retenedor_uso,
    retenedor_inferior_tipo,
    retenedor_inferior_uso,
    created_at
FROM historia_clinica_ortodoncia 
ORDER BY created_at DESC 
LIMIT 5;
