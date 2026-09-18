-- Migration: Add new endodontic statuses to odontogram
-- Date: 2025
-- Description: Update endodontic statuses in odontogram pilot
-- 1. Change 'endodoncia' to 'endodoncia_con_restauracion'
-- 2. Add new endodontic statuses

-- Since the database stores tooth statuses as JSONB strings (no enum constraint),
-- we only need to update existing data and document the new valid statuses.

-- Update existing 'endodoncia' records to 'endodoncia_con_restauracion'
UPDATE odontograms
SET datos_odontograma = jsonb_set(
    datos_odontograma,
    '{dientes}',
    (
        SELECT jsonb_object_agg(
            k,
            CASE 
                WHEN v->>'estado' = 'endodoncia' THEN jsonb_set(v, '{estado}', '"endodoncia_con_restauracion"')
                WHEN v->'caras' IS NOT NULL THEN jsonb_set(
                    v,
                    '{caras}',
                    (
                        SELECT jsonb_object_agg(
                            cara_k,
                            CASE 
                                WHEN cara_v->>'estado' = 'endodoncia' THEN jsonb_set(cara_v, '{estado}', '"endodoncia_con_restauracion"')
                                ELSE cara_v
                            END
                        )
                        FROM jsonb_each(v->'caras') AS cara(cara_k, cara_v)
                    )
                )
                ELSE v
            END
        )
        FROM jsonb_each(datos_odontograma->'dientes') AS d(k, v)
    )
)
WHERE datos_odontograma ? 'dientes';

-- Add comment documenting new valid endodontic statuses
COMMENT ON COLUMN odontograms.datos_odontograma IS 'JSONB containing dientes with estado values. Valid endodontic statuses: endodoncia_con_restauracion, endodoncia_con_caries, endodoncia_con_corona, endodoncia_abierta, endodoncia_con_provisional';

-- The new valid endodontic statuses are:
-- endodoncia_con_restauracion (replaces 'endodoncia')
-- endodoncia_con_caries (new)
-- endodoncia_con_corona (new)
-- endodoncia_abierta (new)
-- endodoncia_con_provisional (new)

-- Note: No enum constraint on estado field - it's stored as JSONB text.
-- Frontend validation in TypeScript types enforces valid values.