-- Recompute progress fields so stored values match the duration-based
-- calculation used by the progress bar and version cards:
--   months = first number in duracion_tratamiento (default 12)
--   total_estimated_appointments = GREATEST(months, 4)
--   progress_percentage = ROUND(completed_appointments / total * 100), capped 100
--
-- Older records stored hardcoded defaults (12 appointments / 8%) regardless of
-- the treatment duration (e.g. a 24-month treatment showed 8% instead of 4%).
-- Idempotent; safe to run multiple times.

-- Recompute total appointments from duration (main table)
UPDATE historia_clinica_ortodoncia
SET total_estimated_appointments = GREATEST(
  COALESCE(NULLIF((regexp_match(COALESCE(duracion_tratamiento, ''), '\d+'))[1]::int, 0), 12),
  4
);

-- Recompute progress percentage (main table)
UPDATE historia_clinica_ortodoncia
SET progress_percentage = LEAST(
  ROUND((COALESCE(completed_appointments, 0)::numeric / NULLIF(total_estimated_appointments, 0)) * 100),
  100
);

-- Recompute total appointments from duration (versions table)
UPDATE historia_clinica_ortodoncia_versions
SET total_estimated_appointments = GREATEST(
  COALESCE(NULLIF((regexp_match(COALESCE(duracion_tratamiento, ''), '\d+'))[1]::int, 0), 12),
  4
);

-- Recompute progress percentage (versions table)
UPDATE historia_clinica_ortodoncia_versions
SET progress_percentage = LEAST(
  ROUND((COALESCE(completed_appointments, 0)::numeric / NULLIF(total_estimated_appointments, 0)) * 100),
  100
);

-- Verify results
SELECT
  id,
  duracion_tratamiento,
  completed_appointments,
  total_estimated_appointments,
  progress_percentage
FROM historia_clinica_ortodoncia
ORDER BY created_at DESC
LIMIT 5;

SELECT
  id,
  version_number,
  duracion_tratamiento,
  completed_appointments,
  total_estimated_appointments,
  progress_percentage
FROM historia_clinica_ortodoncia_versions
ORDER BY created_at DESC
LIMIT 10;