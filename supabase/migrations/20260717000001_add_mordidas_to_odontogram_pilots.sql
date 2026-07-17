-- Add mordidas (bite types) column to odontogram_pilots table
-- Stores an array of selected bite malocclusion types

ALTER TABLE odontogram_pilots 
ADD COLUMN IF NOT EXISTS mordidas JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN odontogram_pilots.mordidas IS 'Array of selected bite malocclusion types: mordida_abierta_anterior, mordida_abierta_posterior, mordida_cruzada_anterior, mordida_cruzada_posterior, mordida_bis_a_bis';
