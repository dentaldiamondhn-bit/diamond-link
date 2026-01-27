-- Add pregnancy status calculation fields
-- These fields will automatically calculate and track pregnancy status

ALTER TABLE patients 
ADD COLUMN embarazo_fecha_fin DATE,
ADD COLUMN embarazo_activo BOOLEAN DEFAULT FALSE;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN patients.embarazo_fecha_fin IS 'Calculated end date of pregnancy based on fecha_inicio and semanas_embarazo';
COMMENT ON COLUMN patients.embarazo_activo IS 'Whether pregnancy is still active based on current date and calculated end date';

-- Create index for better performance on pregnancy queries
CREATE INDEX idx_patients_embarazo_activo ON patients(embarazo_activo) WHERE embarazo_activo = TRUE;
