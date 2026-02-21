-- Create a completely permissive policy for testing
CREATE POLICY "Allow all operations for all users"
    ON historia_clinica_ortodoncia
    FOR ALL
    USING (true)
    WITH CHECK (true);
