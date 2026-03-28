-- Drop all existing policies on historia_clinica_ortodoncia
DROP POLICY IF EXISTS "Doctors can view their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Doctors can insert their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Doctors can update their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Doctors can delete their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Allow authenticated users to view orthodontic history" ON historia_clinica_ortodoncia;

-- Create simple policy that allows any authenticated user to do everything
CREATE POLICY "Enable all operations for authenticated users"
    ON historia_clinica_ortodoncia
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
