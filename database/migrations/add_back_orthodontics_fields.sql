-- Add back orthodontics fields that should remain in patients table
-- This script adds back only the orthodontics fields that are NOT related to "Desea Ortodoncia?"

-- Add back orthodontics-related columns that should remain
ALTER TABLE public.patients 
ADD COLUMN IF NOT EXISTS ortodoncia VARCHAR(20),
ADD COLUMN IF NOT EXISTS orto_finalizado VARCHAR(20),
ADD COLUMN IF NOT EXISTS orto_motivo_no_finalizado TEXT;

-- Add related constraints (without IF NOT EXISTS as it's not supported)
ALTER TABLE public.patients 
ADD CONSTRAINT patients_ortodoncia_check CHECK (ortodoncia IN ('no', 'si')),
ADD CONSTRAINT patients_orto_finalizado_check CHECK (orto_finalizado IN ('no', 'si'));

-- Create indexes for the added fields
CREATE INDEX IF NOT EXISTS idx_patients_ortodoncia ON public.patients USING btree (ortodoncia) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_patients_orto_finalizado ON public.patients USING btree (orto_finalizado) TABLESPACE pg_default;

COMMENT ON TABLE public.patients IS 'Patient information table - orthodontics fields partially restored (only basic orthodontics usage fields)';
