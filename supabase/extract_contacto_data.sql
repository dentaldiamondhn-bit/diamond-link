-- Complete extraction of contacto data for migration planning
-- This script will show all current data and suggest mappings

-- 1. Get all unique contacto values with counts
SELECT 
    contacto,
    COUNT(*) as patient_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE contacto IS NOT NULL AND contacto != ''), 2) as percentage,
    MIN(LENGTH(contacto)) as min_length,
    MAX(LENGTH(contacto)) as max_length,
    ROUND(AVG(LENGTH(contacto)), 1) as avg_length
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
GROUP BY contacto
ORDER BY patient_count DESC, contacto;

-- 2. Show sample of all contacto data (first 50 records)
SELECT 
    paciente_id,
    contacto,
    LENGTH(contacto) as length,
    CASE 
        WHEN LOWER(contacto) LIKE '%facebook%' THEN 'Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' THEN 'Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' THEN 'WhatsApp'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Recomendación de amigo/familiar'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Recomendación de doctor/médico'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' THEN 'Referido de otro paciente'
        WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' THEN 'Llamada telefónica'
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' THEN 'Google/Búsqueda web'
        WHEN LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' THEN 'Página web'
        WHEN LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' THEN 'Publicidad/Folleto'
        ELSE 'Otro - Requiere revisión manual'
    END as suggested_mapping
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
ORDER BY paciente_id
LIMIT 50;

-- 3. Categorize all existing data by type
SELECT 
    CASE 
        WHEN LOWER(contacto) LIKE '%facebook%' THEN 'Social Media - Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' THEN 'Social Media - Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' THEN 'Social Media - WhatsApp'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Recommendation - Friend/Family'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Recommendation - Doctor'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' THEN 'Recommendation - Patient Referral'
        WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' THEN 'Phone Call'
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' THEN 'Web Search - Google'
        WHEN LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' THEN 'Web - Website'
        WHEN LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' THEN 'Advertising'
        ELSE 'Uncategorized'
    END as category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE contacto IS NOT NULL AND contacto != ''), 2) as percentage
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
GROUP BY category
ORDER BY count DESC;

-- 4. Show values that need manual review (don't match any pattern)
SELECT 
    contacto,
    COUNT(*) as count
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
    AND NOT (
        LOWER(contacto) LIKE '%facebook%' OR
        LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' OR
        LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' OR
        LOWER(contacto) LIKE '%recomend%' OR
        LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR
        LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' OR
        LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' OR
        LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR
        LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%'
    )
GROUP BY contacto
ORDER BY count DESC;

-- 5. Summary statistics
SELECT 
    COUNT(*) as total_patients,
    COUNT(CASE WHEN contacto IS NOT NULL AND contacto != '' THEN 1 END) as patients_with_contacto,
    COUNT(CASE WHEN contacto IS NULL OR contacto = '' THEN 1 END) as patients_without_contacto,
    ROUND(COUNT(CASE WHEN contacto IS NOT NULL AND contacto != '' THEN 1 END) * 100.0 / COUNT(*), 2) as percentage_with_contacto,
    COUNT(DISTINCT contacto) as unique_contacto_values
FROM patients;

-- 6. Show detailed mapping plan (fixed version)
SELECT 
    paciente_id,
    contacto as current_value,
    CASE
        -- Social media patterns
        WHEN LOWER(contacto) LIKE '%facebook%' THEN 'Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' THEN 'Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' THEN 'WhatsApp'
        
        -- Recommendation patterns
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Recomendación de amigo/familiar'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Recomendación de doctor/médico'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' THEN 'Referido de otro paciente'
        
        -- Phone/communication patterns
        WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' THEN 'Llamada telefónica'
        
        -- Web/internet patterns
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' THEN 'Google/Búsqueda web'
        WHEN LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' THEN 'Página web'
        
        -- Advertising patterns
        WHEN LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' THEN 'Publicidad/Folleto'
        
        -- Exact matches for our dropdown options
        WHEN contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro') THEN contacto
        
        -- Everything else goes to 'Otro'
        ELSE 'Otro'
    END as new_dropdown_value,
    CASE
        WHEN LOWER(contacto) LIKE '%facebook%' THEN 'Exact match - Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' THEN 'Pattern match - Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' THEN 'Pattern match - WhatsApp'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Pattern match - Friend/Family'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Pattern match - Doctor'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' THEN 'Pattern match - Patient Referral'
        WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' THEN 'Pattern match - Phone Call'
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' THEN 'Pattern match - Google'
        WHEN LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' THEN 'Pattern match - Website'
        WHEN LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' THEN 'Pattern match - Advertising'
        WHEN contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro') THEN 'Exact match - Dropdown option'
        ELSE 'No pattern match - Will be Otro'
    END as mapping_type
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
ORDER BY paciente_id
LIMIT 50;
