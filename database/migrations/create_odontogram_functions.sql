-- Create function to get next odontogram version for a patient
CREATE OR REPLACE FUNCTION get_next_odontogram_version(paciente_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    last_version INTEGER;
BEGIN
    -- Get the highest version number for this patient
    SELECT COALESCE(MAX(version), 0) 
    INTO last_version
    FROM odontograms 
    WHERE paciente_id = paciente_id_param;
    
    -- Return next version
    RETURN last_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle odontogram version management
CREATE OR REPLACE FUNCTION create_odontogram_version(
    paciente_id_param UUID,
    datos_odontograma_param JSONB,
    notas_param TEXT DEFAULT NULL,
    creado_por_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_version INTEGER;
    new_odontogram_id UUID;
BEGIN
    -- Get next version number
    new_version := get_next_odontogram_version(paciente_id_param);
    
    -- Deactivate all previous versions
    UPDATE odontograms 
    SET activo = false 
    WHERE paciente_id = paciente_id_param;
    
    -- Create new odontogram
    INSERT INTO odontograms (
        paciente_id, 
        version, 
        datos_odontograma, 
        notas, 
        creado_por, 
        activo,
        fecha_creacion,
        fecha_actualizacion
    ) VALUES (
        paciente_id_param,
        new_version,
        datos_odontograma_param,
        notas_param,
        creado_por_param,
        true,
        NOW(),
        NOW()
    ) RETURNING id INTO new_odontogram_id;
    
    RETURN new_odontogram_id;
END;
$$ LANGUAGE plpgsql;
