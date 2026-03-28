-- Debug: Find exactly which values are becoming "Otro" and why
-- This will help us understand the pattern matching issue

SELECT 
    contacto as current_value,
    COUNT(*) as patient_count,
    CASE
        -- Social media patterns
        WHEN LOWER(contacto) LIKE '%facebook%' OR LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' OR LOWER(contacto) LIKE '%fbook%' THEN 'Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' OR LOWER(contacto) LIKE '%instag%' OR LOWER(contacto) LIKE '%gram%' THEN 'Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' OR LOWER(contacto) LIKE '%wap%' THEN 'WhatsApp'
        WHEN LOWER(contacto) LIKE '%twitter%' OR LOWER(contacto) LIKE '%tweet%' OR LOWER(contacto) LIKE '%x%' THEN 'Twitter'
        WHEN LOWER(contacto) LIKE '%tiktok%' OR LOWER(contacto) LIKE '%tik%' THEN 'TikTok'
        WHEN LOWER(contacto) LIKE '%linkedin%' OR LOWER(contacto) LIKE '%in%' THEN 'LinkedIn'
        WHEN LOWER(contacto) LIKE '%youtube%' OR LOWER(contacto) LIKE '%yt%' OR LOWER(contacto) LIKE '%tube%' THEN 'YouTube'
        
        -- Recommendation patterns
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Recomendación de amigo/familiar'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Recomendación de doctor/médico'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR LOWER(contacto) LIKE '%recomendado%' THEN 'Referido de otro paciente'
        
        -- Phone/communication patterns
        WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' OR LOWER(contacto) LIKE '%llame%' OR LOWER(contacto) LIKE '%phone%' OR LOWER(contacto) LIKE '%call%' THEN 'Llamada telefónica'
        
        -- Web/internet patterns
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' OR LOWER(contacto) LIKE '%search%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR LOWER(contacto) LIKE '%online%' THEN 'Google/Búsqueda web'
        WHEN LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR LOWER(contacto) LIKE '%online%' THEN 'Página web'
        
        -- Advertising patterns
        WHEN LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' OR LOWER(contacto) LIKE '%advertising%' OR LOWER(contacto) LIKE '%promo%' THEN 'Publicidad/Folleto'
        
        -- General patterns
        WHEN LOWER(contacto) LIKE '%paciente%' OR LOWER(contacto) LIKE '%cliente%' OR LOWER(contacto) LIKE '%cliente%' THEN 'Referido de otro paciente'
        WHEN LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%camina%' OR LOWER(contacto) LIKE '%caminar%' OR LOWER(contacto) LIKE '%walk%' THEN 'Otro - Peaton/Caminando'
        WHEN LOWER(contacto) LIKE '%clinica%' OR LOWER(contacto) LIKE '%clínica%' OR LOWER(contacto) LIKE '%dentista%' OR LOWER(contacto) LIKE '%dental%' THEN 'Otro - Clínica/Dentista'
        
        -- Exact matches for our dropdown options
        WHEN contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro') THEN contacto
        
        -- Everything else goes to 'Otro'
        ELSE 'OTRO - NO MATCH'
    END as mapping_result
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
GROUP BY contacto
ORDER BY patient_count DESC, contacto;

-- Show summary of why values become "Otro"
SELECT 
    CASE 
        WHEN LOWER(contacto) LIKE '%na%' OR LOWER(contacto) LIKE '%n/a%' OR LOWER(contacto) LIKE '%none%' THEN 'NA/No Answer'
        WHEN LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' THEN 'Facebook variation'
        WHEN LOWER(contacto) LIKE '%refer%' OR LOWER(contacto) LIKE '%recomend%' THEN 'Recommendation variation'
        WHEN LENGTH(contacto) <= 3 THEN 'Very short (3 chars or less)'
        WHEN LENGTH(contacto) >= 20 THEN 'Very long (20+ chars)'
        WHEN contacto ~ '^[0-9]+$' THEN 'Numbers only'
        WHEN contacto ~ '^[a-zA-Z]+$' THEN 'Letters only'
        ELSE 'Other'
    END as category,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE contacto IS NOT NULL AND contacto != ''), 2) as percentage
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
    AND NOT (
        LOWER(contacto) LIKE '%facebook%' OR LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' OR LOWER(contacto) LIKE '%fbook%' OR
        LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' OR LOWER(contacto) LIKE '%instag%' OR LOWER(contacto) LIKE '%gram%' OR
        LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' OR LOWER(contacto) LIKE '%wap%' OR
        LOWER(contacto) LIKE '%twitter%' OR LOWER(contacto) LIKE '%tweet%' OR LOWER(contacto) LIKE '%x%' OR
        LOWER(contacto) LIKE '%tiktok%' OR LOWER(contacto) LIKE '%tik%' OR
        LOWER(contacto) LIKE '%linkedin%' OR LOWER(contacto) LIKE '%in%' OR
        LOWER(contacto) LIKE '%youtube%' OR LOWER(contacto) LIKE '%yt%' OR LOWER(contacto) LIKE '%tube%' OR
        LOWER(contacto) LIKE '%recomend%' OR
        LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR LOWER(contacto) LIKE '%recomendado%' OR
        LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' OR LOWER(contacto) LIKE '%llame%' OR LOWER(contacto) LIKE '%phone%' OR LOWER(contacto) LIKE '%call%' OR
        LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' OR LOWER(contacto) LIKE '%search%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR LOWER(contacto) LIKE '%online%' OR
        LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' OR LOWER(contacto) LIKE '%advertising%' OR LOWER(contacto) LIKE '%promo%' OR
        LOWER(contacto) LIKE '%paciente%' OR LOWER(contacto) LIKE '%cliente%' OR LOWER(contacto) LIKE '%cliente%' OR
        LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%camina%' OR LOWER(contacto) LIKE '%caminar%' OR LOWER(contacto) LIKE '%walk%' OR
        LOWER(contacto) LIKE '%clinica%' OR LOWER(contacto) LIKE '%clínica%' OR LOWER(contacto) LIKE '%dentista%' OR LOWER(contacto) LIKE '%dental%' OR
        contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro')
    )
GROUP BY category
ORDER BY count DESC;
