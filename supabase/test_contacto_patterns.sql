-- Test script to understand contacto patterns
-- Common contact methods for dental clinics

-- Let's see if there are any obvious patterns by searching for common terms
SELECT 
    contacto,
    COUNT(*) as count
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
    AND (
        LOWER(contacto) LIKE '%facebook%' OR
        LOWER(contacto) LIKE '%instagram%' OR
        LOWER(contacto) LIKE '%whatsapp%' OR
        LOWER(contacto) LIKE '%teléfono%' OR
        LOWER(contacto) LIKE '%telefono%' OR
        LOWER(contacto) LIKE '%llamada%' OR
        LOWER(contacto) LIKE '%recomendación%' OR
        LOWER(contacto) LIKE '%recomendacion%' OR
        LOWER(contacto) LIKE '%amigo%' OR
        LOWER(contacto) LIKE '%familiar%' OR
        LOWER(contacto) LIKE '%google%' OR
        LOWER(contacto) LIKE '%internet%' OR
        LOWER(contacto) LIKE '%página%' OR
        LOWER(contacto) LIKE '%pagina%' OR
        LOWER(contacto) LIKE '%web%' OR
        LOWER(contacto) LIKE '%referido%' OR
        LOWER(contacto) LIKE '%doctor%' OR
        LOWER(contacto) LIKE '%medico%' OR
        LOWER(contacto) LIKE '%médico%'
    )
GROUP BY contacto
ORDER BY count DESC;

-- Let's also see if there are any phone number patterns
SELECT 
    contacto,
    COUNT(*) as count
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
    AND (
        contacto REGEXP '[0-9]{3}[-][0-9]{3}[-][0-9]{4}' OR
        contacto REGEXP '[0-9]{10}' OR
        contacto REGEXP '[0-9]{2}[-][0-9]{4}[-][0-9]{4}'
    )
GROUP BY contacto
ORDER BY count DESC;
