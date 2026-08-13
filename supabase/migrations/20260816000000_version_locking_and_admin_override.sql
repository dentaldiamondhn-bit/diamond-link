-- =============================================================================
-- Version Locking & Admin/Support Override for Historical Orthodontic Versions
-- Run this in the Supabase SQL Editor.
--
-- What this adds:
--   1. Locking columns on historia_clinica_ortodoncia_versions:
--        is_locked  (manual hard-lock, even for the latest version)
--        locked_at / locked_by (who/when it was locked)
--        parent_id  (which version a fork was created from)
--   2. audit_logs table: every admin/support unlock is recorded with BOTH the
--      active session user id and the authorized admin id, plus record, version,
--      reason and timestamp.
--   3. A BEFORE UPDATE/DELETE trigger that makes historical versions read-only:
--        - a version whose version_number is NOT the highest for its patient is
--          "historical" -> its clinical content cannot be changed
--        - a version flagged is_locked = true is read-only too
--        - metadata-only changes (is_current flips when creating new versions,
--          notes, creator attribution, is_locked flags) remain allowed
--        - content edits to a historical version are only allowed when a fresh
--          (< 10 minutes) audit_logs override row exists for that version id.
--
-- IMPORTANT: authorization is enforced at the app layer (Clerk reverification +
-- role check in actions/verify-admin-override.ts), the same pattern used by the
-- rest of this codebase (see 20260805000002 / 20260807000300). The trigger is a
-- safety net against accidental direct writes to historical rows.
-- =============================================================================

-- 1. Locking columns ----------------------------------------------------------
ALTER TABLE historia_clinica_ortodoncia_versions
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID;

-- 2. Audit log ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_user_id TEXT NOT NULL,
  authorized_admin_id TEXT,
  record_id UUID,
  version_number INTEGER,
  action TEXT NOT NULL DEFAULT 'admin_override_unlock',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id
  ON public.audit_logs(record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_authorized_admin
  ON public.audit_logs(authorized_admin_id, created_at DESC);

-- Permissive RLS on audit_logs (consistent with the rest of the app: anon key +
-- app-layer authorization; the audit row is inserted ONLY after Clerk
-- reverification + admin/support role verification in the server action).
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));

DROP POLICY IF EXISTS "anon_select_audit_logs" ON public.audit_logs;
CREATE POLICY "anon_select_audit_logs" ON public.audit_logs
  FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));

-- 3. Immutability trigger ----------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_ortho_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_override_exists BOOLEAN;
  v_latest_number INTEGER;
  v_content_changed BOOLEAN;
BEGIN
  v_override_exists := EXISTS (
    SELECT 1 FROM public.audit_logs a
    WHERE a.record_id = OLD.id
      AND a.created_at > NOW() - INTERVAL '10 minutes'
  );

  SELECT MAX(version_number) INTO v_latest_number
  FROM public.historia_clinica_ortodoncia_versions
  WHERE patient_id = OLD.patient_id;

  IF TG_OP = 'DELETE' THEN
    -- Only the latest version can be deleted, or a version with a fresh override.
    IF OLD.version_number >= COALESCE(v_latest_number, 0) AND NOT OLD.is_locked THEN
      RETURN OLD;
    END IF;
    IF v_override_exists THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'historical_version_readonly: Versión histórica (solo lectura)';
  END IF;

  -- Latest, unlocked versions are fully editable.
  IF OLD.version_number >= COALESCE(v_latest_number, 0) AND NOT OLD.is_locked THEN
    RETURN NEW;
  END IF;

  -- From here on the row is historical or hard-locked: metadata-only updates are
  -- still allowed (is_current flips, creator attribution, lock bookkeeping).
  v_content_changed := (
    NEW.paciente_id IS DISTINCT FROM OLD.paciente_id OR
    NEW.doctor_id IS DISTINCT FROM OLD.doctor_id OR
    NEW.motivo_consulta_ortodoncia IS DISTINCT FROM OLD.motivo_consulta_ortodoncia OR
    NEW.diagnostico_ortodoncia IS DISTINCT FROM OLD.diagnostico_ortodoncia OR
    NEW.plan_tratamiento_ortodoncia IS DISTINCT FROM OLD.plan_tratamiento_ortodoncia OR
    NEW.tipo_mordida IS DISTINCT FROM OLD.tipo_mordida OR
    NEW.tipo_aparato IS DISTINCT FROM OLD.tipo_aparato OR
    NEW.duracion_tratamiento IS DISTINCT FROM OLD.duracion_tratamiento OR
    NEW.fecha_inicio_tratamiento IS DISTINCT FROM OLD.fecha_inicio_tratamiento OR
    NEW.fecha_fin_tratamiento IS DISTINCT FROM OLD.fecha_fin_tratamiento OR
    NEW.observaciones_ortodoncia IS DISTINCT FROM OLD.observaciones_ortodoncia OR
    NEW.radiografias_realizadas IS DISTINCT FROM OLD.radiografias_realizadas OR
    NEW.modelos_estudio IS DISTINCT FROM OLD.modelos_estudio OR
    NEW.analisis_cefalometrico IS DISTINCT FROM OLD.analisis_cefalometrico OR
    NEW.extracciones_realizadas IS DISTINCT FROM OLD.extracciones_realizadas OR
    NEW.retenedor_tipo IS DISTINCT FROM OLD.retenedor_tipo OR
    NEW.retenedor_uso IS DISTINCT FROM OLD.retenedor_uso OR
    NEW.retenedor_inferior_tipo IS DISTINCT FROM OLD.retenedor_inferior_tipo OR
    NEW.retenedor_inferior_uso IS DISTINCT FROM OLD.retenedor_inferior_uso OR
    NEW.seguimiento_post_tratamiento IS DISTINCT FROM OLD.seguimiento_post_tratamiento OR
    NEW.documentos_ortodoncia IS DISTINCT FROM OLD.documentos_ortodoncia OR
    NEW.firma_digital_ortodoncia IS DISTINCT FROM OLD.firma_digital_ortodoncia OR
    NEW.record_date IS DISTINCT FROM OLD.record_date OR
    NEW.progress_percentage IS DISTINCT FROM OLD.progress_percentage OR
    NEW.completed_appointments IS DISTINCT FROM OLD.completed_appointments OR
    NEW.total_estimated_appointments IS DISTINCT FROM OLD.total_estimated_appointments
  );

  IF NOT v_content_changed THEN
    RETURN NEW;
  END IF;

  IF v_override_exists THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'historical_version_readonly: Versión histórica (solo lectura)';
END;
$$;

DROP TRIGGER IF EXISTS enforce_ortho_version_immutability_trigger
  ON public.historia_clinica_ortodoncia_versions;

CREATE TRIGGER enforce_ortho_version_immutability_trigger
  BEFORE UPDATE OR DELETE
  ON public.historia_clinica_ortodoncia_versions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_ortho_version_immutability();
