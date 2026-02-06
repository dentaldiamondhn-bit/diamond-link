-- Add missing DELETE policy for payments table
DROP POLICY IF EXISTS "Users can delete payments for their completed treatments" ON payments;
CREATE POLICY "Users can delete payments for their completed treatments" ON payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM tratamientos_completados tc
            WHERE tc.id = payments.tratamiento_completado_id
        )
    );
