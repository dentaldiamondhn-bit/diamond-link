-- Add more permissive RLS policy for viewing orthodontic history
-- This allows any authenticated user to view orthodontic history records
-- while maintaining strict policies for insert/update/delete

-- Policy to allow any authenticated user to view orthodontic history
CREATE POLICY "Allow authenticated users to view orthodontic history"
    ON historia_clinica_ortodoncia
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
    );

-- Enable RLS on the table
ALTER TABLE historia_clinica_ortodoncia ENABLE ROW LEVEL SECURITY;
