-- Detailed mapping plan for contacto data migration
-- Shows exactly how each current value will be converted

-- Create a temporary mapping table to show the conversion plan
WITH contacto_mapping AS (
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
)

-- 1. Show mapping summary (fixed version without CTE)
SELECT 
    CASE
        -- Social media patterns (improved)
        WHEN LOWER(contacto) LIKE '%facebook%' OR LOWER(contacto) LIKE '%fb%' THEN 'Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' THEN 'Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' THEN 'WhatsApp'
        
        -- Recommendation patterns (improved)
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Recomendación de amigo/familiar'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Recomendación de doctor/médico'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR LOWER(contacto) LIKE '%recomendado%' THEN 'Referido de otro paciente'
        
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
        WHEN LOWER(contacto) LIKE '%facebook%' OR LOWER(contacto) LIKE '%fb%' THEN 'Pattern match - Facebook'
        WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' THEN 'Pattern match - Instagram'
        WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' THEN 'Pattern match - WhatsApp'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Pattern match - Friend/Family'
        WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Pattern match - Doctor'
        WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR LOWER(contacto) LIKE '%recomendado%' THEN 'Pattern match - Patient Referral'
        WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' THEN 'Pattern match - Phone Call'
        WHEN LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' THEN 'Pattern match - Google'
        WHEN LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' THEN 'Pattern match - Website'
        WHEN LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' THEN 'Pattern match - Advertising'
        WHEN contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro') THEN 'Exact match - Dropdown option'
        ELSE 'No pattern match - Will be Otro'
    END as mapping_type,
    COUNT(*) as patient_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients WHERE contacto IS NOT NULL AND contacto != ''), 2) as percentage
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''
GROUP BY new_dropdown_value, mapping_type
ORDER BY patient_count DESC;

-- 2. Show all unique current values and their mappings (fixed version)
WITH contacto_data AS (
    SELECT 
        contacto as current_value,
        CASE
            -- Social media patterns (comprehensive)
            WHEN LOWER(contacto) LIKE '%facebook%' OR LOWER(contacto) LIKE '%fb%' OR LOWER(contacto) LIKE '%face%' OR LOWER(contacto) LIKE '%fbook%' THEN 'Facebook'
            WHEN LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' OR LOWER(contacto) LIKE '%instag%' OR LOWER(contacto) LIKE '%gram%' THEN 'Instagram'
            WHEN LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' OR LOWER(contacto) LIKE '%wap%' THEN 'WhatsApp'
            WHEN LOWER(contacto) LIKE '%twitter%' OR LOWER(contacto) LIKE '%tweet%' OR LOWER(contacto) LIKE '%x%' THEN 'Twitter'
            WHEN LOWER(contacto) LIKE '%tiktok%' OR LOWER(contacto) LIKE '%tik%' THEN 'TikTok'
            WHEN LOWER(contacto) LIKE '%linkedin%' OR LOWER(contacto) LIKE '%in%' THEN 'LinkedIn'
            WHEN LOWER(contacto) LIKE '%youtube%' OR LOWER(contacto) LIKE '%yt%' OR LOWER(contacto) LIKE '%tube%' THEN 'YouTube'
            
            -- Recommendation patterns (comprehensive)
            WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%amigo%' OR LOWER(contacto) LIKE '%familiar%' OR LOWER(contacto) LIKE '%familia%') THEN 'Recomendación de amigo/familiar'
            WHEN LOWER(contacto) LIKE '%recomend%' AND (LOWER(contacto) LIKE '%doctor%' OR LOWER(contacto) LIKE '%medico%' OR LOWER(contacto) LIKE '%médico%') THEN 'Recomendación de doctor/médico'
            WHEN LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR LOWER(contacto) LIKE '%recomendado%' THEN 'Referido de otro paciente'
            
            -- Phone/communication patterns
            WHEN LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' OR LOWER(contacto) LIKE '%llame%' OR LOWER(contacto) LIKE '%llamo%' OR LOWER(contacto) LIKE '%phone%' OR LOWER(contacto) LIKE '%call%' THEN 'Llamada telefónica'
            
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
)

SELECT DISTINCT
    current_value,
    new_dropdown_value,
    mapping_type,
    COUNT(*) OVER (PARTITION BY current_value) as frequency
FROM contacto_data
ORDER BY frequency DESC, current_value;

-- 3. Show values that will become 'Otro' (need manual review)
SELECT 
    contacto as current_value,
    COUNT(*) as patient_count,
    'Will be categorized as Otro - requires manual review' as note
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
        LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' OR
        contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro')
    )
GROUP BY contacto
ORDER BY patient_count DESC;

-- 4. Show migration impact summary (fixed version)
SELECT 
    'Total patients with contacto data' as metric,
    COUNT(*) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''

UNION ALL

SELECT 
    'Unique current values' as metric,
    COUNT(DISTINCT contacto) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''

UNION ALL

SELECT 
    'Values that match patterns' as metric,
    COUNT(CASE 
        WHEN LOWER(contacto) LIKE '%facebook%' OR
             LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' OR
             LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' OR
             LOWER(contacto) LIKE '%recomend%' OR
             LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR
             LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' OR
             LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' OR
             LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR
             LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' OR
             contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro')
        THEN 1 END) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != ''

UNION ALL

SELECT 
    'Values that become Otro' as metric,
    COUNT(CASE 
        WHEN NOT (
            LOWER(contacto) LIKE '%facebook%' OR
            LOWER(contacto) LIKE '%instagram%' OR LOWER(contacto) LIKE '%insta%' OR
            LOWER(contacto) LIKE '%whatsapp%' OR LOWER(contacto) LIKE '%whats%' OR
            LOWER(contacto) LIKE '%recomend%' OR
            LOWER(contacto) LIKE '%referido%' OR LOWER(contacto) LIKE '%referencia%' OR
            LOWER(contacto) LIKE '%teléfono%' OR LOWER(contacto) LIKE '%telefono%' OR LOWER(contacto) LIKE '%llamada%' OR LOWER(contacto) LIKE '%llamo%' OR
            LOWER(contacto) LIKE '%google%' OR LOWER(contacto) LIKE '%busqueda%' OR LOWER(contacto) LIKE '%búsqueda%' OR
            LOWER(contacto) LIKE '%página%' OR LOWER(contacto) LIKE '%pagina%' OR LOWER(contacto) LIKE '%web%' OR LOWER(contacto) LIKE '%sitio%' OR
            LOWER(contacto) LIKE '%publicidad%' OR LOWER(contacto) LIKE '%folleto%' OR LOWER(contacto) LIKE '%cartel%' OR LOWER(contacto) LIKE '%anuncio%' OR
            contacto IN ('Recomendación de amigo/familiar', 'Recomendación de doctor/médico', 'Facebook', 'Instagram', 'WhatsApp', 'Llamada telefónica', 'Google/Búsqueda web', 'Página web', 'Referido de otro paciente', 'Publicidad/Folleto', 'Otro')
        )
        THEN 1 
        ELSE NULL 
    END) as value
FROM patients 
WHERE contacto IS NOT NULL AND contacto != '';
