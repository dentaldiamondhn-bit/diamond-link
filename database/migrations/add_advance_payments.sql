-- Pago Adelantado sin tratamiento.
--
-- Allow recording a "Pago Adelantado" for a patient who has no completed
-- treatment yet (e.g. patient A accompanies patient B, only the clinic record
-- is opened, and B pays in advance for A's future treatment).
--
-- Treated payments stay the same; the advance is stored as a payments row with:
--   - tratamiento_completado_id = NULL
--   - paciente_id = the patient the money is credited to
-- A patient_credits row (estado = 'disponible', origen_pago_id = payment id)
-- is created app-side so the credit is usable against a later treatment.
--
-- The existing triggers already handle NULL treatments safely:
--   - update_payment_status()    UPDATEs tratamientos_completados WHERE id = NULL (no-op)
--   - handle_overpayment_credit() returns early when the treatment is not found
--   - handle_payment_delete_credit() still cleans the linked credit on delete

ALTER TABLE payments
    ALTER COLUMN tratamiento_completado_id DROP NOT NULL;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS paciente_id UUID REFERENCES patients(paciente_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_payments_paciente_id ON payments(paciente_id);

-- Re-create the RLS policies so treatment-less payments are allowed as long as
-- they carry a paciente_id (tied to an existing patient).
DROP POLICY IF EXISTS "Users can view payments for their completed treatments" ON payments;
CREATE POLICY "Users can view payments for their completed treatments" ON payments
    FOR SELECT USING (
        (tratamiento_completado_id IS NULL AND paciente_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM tratamientos_completados tc WHERE tc.id = payments.tratamiento_completado_id)
    );

DROP POLICY IF EXISTS "Users can insert payments for their completed treatments" ON payments;
CREATE POLICY "Users can insert payments for their completed treatments" ON payments
    FOR INSERT WITH CHECK (
        (tratamiento_completado_id IS NULL AND paciente_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM tratamientos_completados tc WHERE tc.id = tratamiento_completado_id)
    );

DROP POLICY IF EXISTS "Users can update payments for their completed treatments" ON payments;
CREATE POLICY "Users can update payments for their completed treatments" ON payments
    FOR UPDATE USING (
        (tratamiento_completado_id IS NULL AND paciente_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM tratamientos_completados tc WHERE tc.id = payments.tratamiento_completado_id)
    );

DROP POLICY IF EXISTS "Users can delete payments for their completed treatments" ON payments;
CREATE POLICY "Users can delete payments for their completed treatments" ON payments
    FOR DELETE USING (
        (tratamiento_completado_id IS NULL AND paciente_id IS NOT NULL)
        OR EXISTS (SELECT 1 FROM tratamientos_completados tc WHERE tc.id = payments.tratamiento_completado_id)
    );