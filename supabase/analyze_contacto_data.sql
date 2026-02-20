-- Analyze existing contacto data to create dropdown options
-- This script will help us understand the current data patterns

-- First, let's see all unique values in the contacto column
SELECT DISTINCT 
    contacto,
    COUNT(*) as count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE contacto IS NOT NULL AND contacto != '') as percentage
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
GROUP BY contacto
ORDER BY count DESC, contacto;

-- Let's also see the total number of records with contacto data
SELECT 
    COUNT(*) as total_patients,
    COUNT(CASE WHEN contacto IS NOT NULL AND contacto != '' THEN 1 END) as patients_with_contacto,
    COUNT(CASE WHEN contacto IS NULL OR contacto = '' THEN 1 END) as patients_without_contacto,
    ROUND(COUNT(CASE WHEN contacto IS NOT NULL AND contacto != '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentage_with_contacto
FROM patients;

-- Let's see some sample data to understand patterns
SELECT contacto 
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
ORDER BY RANDOM()
LIMIT 20;

-- Let's also see the length distribution to understand data complexity
SELECT 
    MIN(LENGTH(contacto)) as min_length,
    MAX(LENGTH(contacto)) as max_length,
    ROUND(AVG(LENGTH(contacto)), 2) as avg_length
FROM patients 
WHERE contacto IS NOT NULL AND contacto != '';
