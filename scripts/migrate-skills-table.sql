-- Add agency_type and metadata columns to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS agency_type TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skills_agency_type ON skills(agency_type);
CREATE INDEX IF NOT EXISTS idx_skills_metadata ON skills USING GIN(metadata);
