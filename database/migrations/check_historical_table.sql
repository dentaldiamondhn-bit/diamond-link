-- Check if historical_mode_settings table exists
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'historical_mode_settings' 
AND table_schema = 'public';

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS historical_mode_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL,
    bypass_historical_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_historical_mode_settings_patient_id 
ON historical_mode_settings(patient_id);

-- Grant permissions
GRANT ALL ON historical_mode_settings TO authenticated;
GRANT ALL ON historical_mode_settings TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'historical_mode_settings table created/verified successfully';
END $$;
