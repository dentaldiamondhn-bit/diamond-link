-- Heal orthodontic versioning for existing records:
--   1. Drop restrictive CHECK constraints again (idempotent, in case
--      20260813000000 was not applied) so valid form values like
--      'clase_ii_division_1' can be stored in the versions table.
--   2. Backfill missing V1 rows from the main record (previously the V1
--      insert failed silently because radiografias_realizadas was an array
--      being written into a TEXT column).
--   3. Repair "wiped" version-1 rows: versions created from an empty
--      versions list contained only documentos/firma/radiografias; copy the
--      clinical fields from the main record back into them.
--
-- Safe to run multiple times.

-- ============================================================
-- 1. Drop CHECK constraints on both orthodontic tables
-- ============================================================
DO $$
DECLARE
  _tbl text;
  _con record;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY[
    'historia_clinica_ortodoncia',
    'historia_clinica_ortodoncia_versions'
  ] LOOP
    IF to_regclass('public.' || _tbl) IS NULL THEN
      CONTINUE;
    END IF;
    FOR _con IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public'
        AND cls.relname = _tbl
        AND con.contype = 'c'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', _tbl, _con.conname);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 2. Repair wiped version-1 rows with data from the main record
-- ============================================================
UPDATE historia_clinica_ortodoncia_versions v
SET
  motivo_consulta_ortodoncia = m.motivo_consulta_ortodoncia,
  diagnostico_ortodoncia = m.diagnostico_ortodoncia,
  plan_tratamiento_ortodoncia = m.plan_tratamiento_ortodoncia,
  tipo_mordida = m.tipo_mordida,
  tipo_aparato = m.tipo_aparato,
  duracion_tratamiento = m.duracion_tratamiento,
  fecha_inicio_tratamiento = m.fecha_inicio_tratamiento,
  fecha_fin_tratamiento = m.fecha_fin_tratamiento,
  observaciones_ortodoncia = m.observaciones_ortodoncia,
  radiografias_realizadas = array_to_string(m.radiografias_realizadas, ', '),
  modelos_estudio = m.modelos_estudio,
  analisis_cefalometrico = m.analisis_cefalometrico,
  extracciones_realizadas = m.extracciones_realizadas,
  retenedor_tipo = m.retenedor_tipo,
  retenedor_uso = m.retenedor_uso,
  retenedor_inferior_tipo = m.retenedor_inferior_tipo,
  retenedor_inferior_uso = m.retenedor_inferior_uso,
  seguimiento_post_tratamiento = m.seguimiento_post_tratamiento,
  doctor_id = m.doctor_id,
  progress_percentage = m.progress_percentage,
  total_estimated_appointments = m.total_estimated_appointments,
  completed_appointments = m.completed_appointments,
  is_current = true
FROM historia_clinica_ortodoncia m
WHERE v.version_number = 1
  AND v.patient_id = m.paciente_id::text
  AND v.motivo_consulta_ortodoncia IS NULL
  AND v.diagnostico_ortodoncia IS NULL
  AND v.plan_tratamiento_ortodoncia IS NULL
  AND (SELECT COUNT(*) FROM historia_clinica_ortodoncia_versions v2 WHERE v2.patient_id = v.patient_id) = 1;

-- ============================================================
-- 3. Backfill missing V1 rows (no version exists for the patient)
-- ============================================================
INSERT INTO historia_clinica_ortodoncia_versions (
  patient_id,
  original_record_id,
  version_number,
  record_date,
  progress_percentage,
  is_current,
  paciente_id,
  doctor_id,
  motivo_consulta_ortodoncia,
  diagnostico_ortodoncia,
  plan_tratamiento_ortodoncia,
  tipo_mordida,
  tipo_aparato,
  duracion_tratamiento,
  fecha_inicio_tratamiento,
  fecha_fin_tratamiento,
  observaciones_ortodoncia,
  radiografias_realizadas,
  modelos_estudio,
  analisis_cefalometrico,
  extracciones_realizadas,
  retenedor_tipo,
  retenedor_uso,
  retenedor_inferior_tipo,
  retenedor_inferior_uso,
  seguimiento_post_tratamiento,
  documentos_ortodoncia,
  firma_digital_ortodoncia,
  total_estimated_appointments,
  completed_appointments,
  created_by,
  notes
)
SELECT
  m.paciente_id::text,
  m.id,
  1,
  m.created_at::date,
  m.progress_percentage,
  true,
  m.paciente_id::text,
  m.doctor_id,
  m.motivo_consulta_ortodoncia,
  m.diagnostico_ortodoncia,
  m.plan_tratamiento_ortodoncia,
  m.tipo_mordida,
  m.tipo_aparato,
  m.duracion_tratamiento,
  m.fecha_inicio_tratamiento,
  m.fecha_fin_tratamiento,
  m.observaciones_ortodoncia,
  array_to_string(m.radiografias_realizadas, ', '),
  m.modelos_estudio,
  m.analisis_cefalometrico,
  m.extracciones_realizadas,
  m.retenedor_tipo,
  m.retenedor_uso,
  m.retenedor_inferior_tipo,
  m.retenedor_inferior_uso,
  m.seguimiento_post_tratamiento,
  m.documentos_ortodoncia,
  m.firma_digital_ortodoncia,
  m.total_estimated_appointments,
  m.completed_appointments,
  'system',
  NULL
FROM historia_clinica_ortodoncia m
WHERE NOT EXISTS (
  SELECT 1
  FROM historia_clinica_ortodoncia_versions v
  WHERE v.patient_id = m.paciente_id::text
)
ON CONFLICT (patient_id, version_number) DO NOTHING;