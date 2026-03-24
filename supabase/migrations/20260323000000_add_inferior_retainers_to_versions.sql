-- Add inferior retainer fields to the versions table to match the main table
-- This fixes the 500 error when saving new orthodontic versions with inferior retainers

ALTER TABLE historia_clinica_ortodoncia_versions 
ADD COLUMN IF NOT EXISTS retenedor_inferior_tipo TEXT CHECK (retenedor_inferior_tipo IN ('fijo', 'removible', 'hawley', 'invisible', 'sin_retenedor'));

ALTER TABLE historia_clinica_ortodoncia_versions 
ADD COLUMN IF NOT EXISTS retenedor_inferior_uso TEXT CHECK (retenedor_inferior_uso IN ('tiempo_completo', 'noche', 'ocasional', 'no_usa'));
