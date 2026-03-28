-- Migration to fix doctor_id type for Clerk user IDs
-- Change doctor_id from UUID to TEXT to accommodate Clerk user ID format

-- Drop existing policies that reference doctor_id
DROP POLICY IF EXISTS "Doctors can view their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Doctors can insert their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Doctors can update their patients' orthodontic history" ON historia_clinica_ortodoncia;
DROP POLICY IF EXISTS "Doctors can delete their patients' orthodontic history" ON historia_clinica_ortodoncia;

-- Alter doctor_id column to TEXT type
ALTER TABLE historia_clinica_ortodoncia 
ALTER COLUMN doctor_id TYPE TEXT USING doctor_id::TEXT;

-- Recreate RLS policies with updated column type
-- Policy to allow doctors to see their own patients' orthodontic history
CREATE POLICY "Doctors can view their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR SELECT
    USING (
        auth.uid()::TEXT = doctor_id
    );

-- Policy to allow doctors to insert their own patients' orthodontic history
CREATE POLICY "Doctors can insert their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR INSERT
    WITH CHECK (
        auth.uid()::TEXT = doctor_id
    );

-- Policy to allow doctors to update their own patients' orthodontic history
CREATE POLICY "Doctors can update their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR UPDATE
    USING (
        auth.uid()::TEXT = doctor_id
    )
    WITH CHECK (
        auth.uid()::TEXT = doctor_id
    );

-- Policy to allow doctors to delete their own patients' orthodontic history
CREATE POLICY "Doctors can delete their patients' orthodontic history"
    ON historia_clinica_ortodoncia
    FOR DELETE
    USING (
        auth.uid()::TEXT = doctor_id
    );

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'historia_clinica_ortodoncia' AND column_name = 'doctor_id';
