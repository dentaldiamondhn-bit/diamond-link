-- Create independent odontogram test table
-- This table has no foreign key relationships to existing tables

CREATE TABLE odontogram_test (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name VARCHAR(100) NOT NULL,
    teeth_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_odontogram_test_created_at ON odontogram_test(created_at);
CREATE INDEX idx_odontogram_test_name ON odontogram_test(test_name);

-- Add RLS (Row Level Security) - disabled for testing
ALTER TABLE odontogram_test ENABLE ROW LEVEL SECURITY;

-- Allow all operations for testing (you can restrict this later)
CREATE POLICY "Enable all operations for testing" ON odontogram_test
    FOR ALL USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_odontogram_test_updated_at 
    BEFORE UPDATE ON odontogram_test 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
