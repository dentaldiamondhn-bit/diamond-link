-- Calendario Phase — procedure-tint repaint: after rebalancing PROCEDURE_COLORS
-- (Ortodoncia vs Endodoncia clashed, plus 4 more duplicates), bump every event
-- whose pill eats the old tint to the new one so old rows match new ones.
--
-- Idempotent: rerun safe — events already repainted are re-mapped to the SAME
-- value (only the old → new pairs change anything). New events adopt the tint
-- at save time via EventModal; this backfills rows created before deploy.
--
-- Run from the Supabase SQL editor (or via the CLI), then verify:
--   SELECT procedure, color, count(*)
--   FROM events GROUP BY procedure, color ORDER BY procedure;

UPDATE events
SET color = new_color
FROM (
  SELECT * FROM (VALUES
    ('Ortodoncia',            '#ec4899'),  -- was #7c3aed (clashed with Endodoncia)
    ('Radiografía',           '#64748b'),  -- was #2563eb (clashed with Chequeo)
    ('Implante',              '#f97316'),  -- was #0d9488 (clashed with Limpieza)
    ('Promo 3 tapones',       '#ca8a04'),  -- was #d97706 (clashed with Extracción)
    ('Limpieza + 3 tapones',  '#06b6d4'),  -- was #059669 (clashed with Restauraciones)
    ('Blanqueamiento',        '#0ea5e9')   -- was #059669 (clashed with Restauraciones)
  ) AS map(procedure, new_color)
  WHERE events.procedure = map.procedure
) AS m
WHERE m.procedure = events.procedure
  AND events.color IS DISTINCT FROM m.new_color;