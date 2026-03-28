-- Simplified pattern matching - catch more variations
-- This uses broader patterns to catch more values

SELECT 
    contacto as current_value,
    COUNT(*) as patient_count,
    CASE
        -- Simple social media patterns (broader)
        WHEN LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' THEN 'Facebook'
        WHEN LOWER(contacto) LIKE '%insta%' OR LOWER(contacto) LIKE '%gram%' THEN 'Instagram'
        WHEN LOWER(contacto) LIKE '%what%' OR LOWER(contacto) LIKE '%wap%' THEN 'WhatsApp'
        WHEN LOWER(contacto) LIKE '%tweet%' OR LOWER(contacto) LIKE '%x%' THEN 'Twitter'
        WHEN LOWER(contacto) LIKE '%tik%' THEN 'TikTok'
        WHEN LOWER(contacto) LIKE '%in%' OR LOWER(contacto) LIKE '%linked%' THEN 'LinkedIn'
        WHEN LOWER(contacto) LIKE '%yt%' OR LOWER(contacto) LIKE '%tube%' THEN 'YouTube'
        
        -- Simple recommendation patterns (broader)
        WHEN LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%' THEN 'Recomendación de amigo/familiar'
        WHEN LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%' THEN 'Recomendación de doctor/médico'
        WHEN LOWER(contacto) LIKE '%refer%' OR LOWER(contacto) LIKE '%recomend%' OR LOWER(contacto) LIKE '%paciente%' OR LOWER(contacto) LIKE '%cliente%' THEN 'Referido de otro paciente'
        
        -- Simple phone patterns (broader)
        WHEN LOWER(contacto) LIKE '%tel%' OR LOWER(contacto) LIKE '%llam%' OR LOWER(contacto) LIKE '%phone%' OR LOWER(contacto) LIKE '%call%' THEN 'Llamada telefónica'
        
        -- Simple web patterns (broader)
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busq%' OR LOWER(contacto) LIKE '%search%' OR LOWER(contacto) LIKE '%online%' THEN 'Google/Búsqueda web'
        WHEN LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' THEN 'Página web'
        
        -- Simple advertising patterns (broader)
        WHEN LOWER(contacto) LIKE '%publi%' OR LOWER(contacto) LIKE '%folle%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anun%' OR LOWER(contacto) LIKE '%promo%' THEN 'Publicidad/Folleto'
        
        -- Simple general patterns (broader)
        WHEN LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%camina%' OR LOWER(contacto) LIKE '%walk%' THEN 'Otro - Peaton/Caminando'
        WHEN LOWER(contacto) LIKE '%clinic%' OR LOWER(contacto) LIKE '%dental%' OR LOWER(contacto) LIKE '%dentist%' THEN 'Otro - Clínica/Dentista'
        
        -- NA/No answer patterns
        WHEN LOWER(contacto) LIKE '%na%' OR LOWER(contacto) LIKE '%n/a%' OR LOWER(contacto) LIKE '%none%' OR LOWER(contacto) LIKE '%no%' OR LOWER(contacto) = 'na' OR LOWER(contacto) = 'n/a' THEN 'Otro - Sin respuesta'
        
        -- Exact matches
        WHEN contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro') THEN contacto
        
        -- Everything else goes to 'Otro'
        ELSE 'Otro'
    END as new_dropdown_value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
GROUP BY contacto, new_dropdown_value
ORDER BY patient_count DESC;

-- Show the impact of simplified patterns
SELECT 
    'Total patients with contacto data' as metric,
    COUNT(*) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''

UNION ALL

SELECT 
    'Values that match simplified patterns' as metric,
    COUNT(CASE 
        WHEN (
            LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' OR
            LOWER(contacto) LIKE '%insta%' OR LOWER(contacto) LIKE '%gram%' OR
            LOWER(contacto) LIKE '%what%' OR LOWER(contacto) LIKE '%wap%' OR
            LOWER(contacto) LIKE '%tweet%' OR LOWER(contacto) LIKE '%x%' OR
            LOWER(contacto) LIKE '%tik%' OR
            LOWER(contacto) LIKE '%in%' OR LOWER(contacto) LIKE '%linked%' OR
            LOWER(contacto) LIKE '%yt%' OR LOWER(contacto) LIKE '%tube%' OR
            LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%' OR
            LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%' OR
            LOWER(contacto) LIKE '%refer%' OR LOWER(contacto) LIKE '%recomend%' OR LOWER(contacto) LIKE '%paciente%' OR LOWER(contacto) LIKE '%cliente%' OR
            LOWER(contacto) LIKE '%tel%' OR LOWER(contacto) LIKE '%llam%' OR LOWER(contacto) LIKE '%phone%' OR LOWER(contacto) LIKE '%call%' OR
            LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busq%' OR LOWER(contacto) LIKE '%search%' OR LOWER(contacto) LIKE '%online%' OR
            LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR
            LOWER(contacto) LIKE '%publi%' OR LOWER(contacto) LIKE '%folle%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anun%' OR LOWER(contacto) LIKE '%promo%' OR
            LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%camina%' OR LOWER(contacto) LIKE '%walk%' OR
            LOWER(contacto) LIKE '%clinic%' OR LOWER(contacto) LIKE '%dental%' OR LOWER(contacto) LIKE '%dentist%' OR
            LOWER(contacto) LIKE '%na%' OR LOWER(contacto) LIKE '%n/a%' OR LOWER(contacto) LIKE '%none%' OR LOWER(contacto) LIKE '%no%' OR
            contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro')
        )
        THEN 1 END) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''

UNION ALL

SELECT 
    'Values that still become Otro' as metric,
    COUNT(CASE 
        WHEN NOT (
            LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' OR
            LOWER(contacto) LIKE '%insta%' OR LOWER(contacto) LIKE '%gram%' OR
            LOWER(contacto) LIKE '%what%' OR LOWER(contacto) LIKE '%wap%' OR
            LOWER(contacto) LIKE '%tweet%' OR LOWER(contacto) LIKE '%x%' OR
            LOWER(contacto) LIKE '%tik%' OR
            LOWER(contacto) LIKE '%in%' OR LOWER(contacto) LIKE '%linked%' OR
            LOWER(contacto) LIKE '%yt%' OR LOWER(contacto) LIKE '%tube%' OR
            LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%' OR
            LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%' OR
            LOWER(contacto) LIKE '%refer%' OR LOWER(contacto) LIKE '%recomend%' OR LOWER(contacto) LIKE '%paciente%' OR LOWER(contacto) LIKE '%cliente%' OR
            LOWER(contacto) LIKE '%tel%' OR LOWER(contacto) LIKE '%llam%' OR LOWER(contacto) LIKE '%phone%' OR LOWER(contacto) LIKE '%call%' OR
            LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busq%' OR LOWER(contacto) LIKE '%search%' OR LOWER(contacto) LIKE '%online%' OR
            LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR
            LOWER(contacto) LIKE '%publi%' OR LOWER(contacto) LIKE '%folle%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anun%' OR LOWER(contacto) LIKE '%promo%' OR
            LOWER(contacto) LIKE '%peaton%' OR LOWER(contacto) LIKE '%camina%' OR LOWER(contacto) LIKE '%walk%' OR
            LOWER(contacto) LIKE '%clinic%' OR LOWER(contacto) LIKE '%dental%' OR LOWER(contacto) LIKE '%dentist%' OR
            LOWER(contacto) LIKE '%na%' OR LOWER(contacto) LIKE '%n/a%' OR LOWER(contacto) LIKE '%none%' OR LOWER(contacto) LIKE '%no%' OR
            contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro')
        )
        THEN 1 END) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != '';
