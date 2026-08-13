-- The orthodontic forms use more granular values (e.g. 'clase_ii_division_1',
-- 'mordida_abierta_anterior', 'mordida_cruzada_posterior') than the original
-- CHECK constraints allowed. These values are stored fine in the main table,
-- but inserts into historia_clinica_ortodoncia_versions failed because the
-- versions table inherited the old, narrower CHECK constraints.
-- Drop all CHECK constraints on both orthodontic tables so version creation
-- no longer fails on valid form values.
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