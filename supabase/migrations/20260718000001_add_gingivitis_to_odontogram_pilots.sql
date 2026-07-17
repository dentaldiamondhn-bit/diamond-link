-- Add gingivitis (periodontal conditions) column to odontogram_pilots table
-- Stores an array of selected gingivitis/periodontitis conditions with optional details

ALTER TABLE odontogram_pilots 
ADD COLUMN IF NOT EXISTS gingivitis JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN odontogram_pilots.gingivitis IS 'Array of selected periodontal conditions: { tipo: "gingivitis_generalizada" | "gingivitis_localizada" | "gingivitis_embarazo" | "periodontitis", detalle?: string }';
