-- Remove orthodontics fields from patients table
-- This script removes only fields related to "Desea Ortodoncia?" section

-- First, drop the trigger that depends on the table
DROP TRIGGER IF EXISTS update_patient_names_trigger ON public.patients;

-- Remove only orthodontics-related columns that should be removed
ALTER TABLE public.patients 
DROP COLUMN IF EXISTS necesita_ortodoncia,
DROP COLUMN IF EXISTS detalles_ortodoncia,
DROP COLUMN IF EXISTS relacion_molar,
DROP COLUMN IF EXISTS relacion_canina,
DROP COLUMN IF EXISTS tipo_mordida,
DROP COLUMN IF EXISTS apiñamiento,
DROP COLUMN IF EXISTS espacios,
DROP COLUMN IF EXISTS lineamedia,
DROP COLUMN IF EXISTS tipo_aparatologia,
DROP COLUMN IF EXISTS otro_aparatologia;

-- Remove related constraints
ALTER TABLE public.patients 
DROP CONSTRAINT IF EXISTS patients_espacios_check,
DROP CONSTRAINT IF EXISTS patients_lineamedia_check,
DROP CONSTRAINT IF EXISTS patients_relacion_molar_check,
DROP CONSTRAINT IF EXISTS patients_relacion_canina_check,
DROP CONSTRAINT IF EXISTS patients_tipo_mordida_check,
DROP CONSTRAINT IF EXISTS patients_apiñamiento_check,
DROP CONSTRAINT IF EXISTS patients_tipo_aparatologia_check,
DROP CONSTRAINT IF EXISTS patients_necesita_ortodoncia_check;

-- Recreate the trigger without orthodontics dependencies
CREATE OR REPLACE FUNCTION update_beneficiary_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Since paciente_beneficiario field doesn't exist, just return NEW
  -- This trigger is kept for compatibility but doesn't modify any fields
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_names_trigger
AFTER UPDATE OF nombre_completo ON public.patients
FOR EACH ROW
EXECUTE FUNCTION update_beneficiary_names();

-- Update indexes to remove orthodontics-related ones if they exist
-- Note: idx_patients_ortodoncia may not exist, removing DROP to avoid syntax errors

-- Create new optimized indexes for the remaining fields
CREATE INDEX IF NOT EXISTS idx_patients_basic_info ON public.patients USING btree (nombre_completo, numero_identidad) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_contact_info ON public.patients USING btree (telefono, email) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_dates ON public.patients USING btree (fecha_inicio, fecha_nacimiento) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_paciente_id_lookup ON public.patients USING btree (paciente_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_embarazo ON public.patients USING btree (embarazo) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_embarazo_activo ON public.patients USING btree (embarazo_activo) TABLESPACE pg_default
WHERE
  (embarazo_activo = true);

CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients USING btree (nombre_completo) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_patients_identity ON public.patients USING btree (numero_identidad) TABLESPACE pg_default;

COMMENT ON TABLE public.patients IS 'Patient information table - orthodontics fields removed for simplified patient management (only basic orthodontics usage fields remain)';
