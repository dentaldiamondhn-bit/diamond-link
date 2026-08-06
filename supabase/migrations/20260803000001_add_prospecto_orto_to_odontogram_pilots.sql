-- Add "Prospecto para Orto" flag to odontogram_pilots
-- The flag is stored inside the datos_odontograma JSONB (prospecto_orto: boolean),
-- set from the checkbox next to the odontogram date picker.
-- Counted on the dashboard via active odontograms marked as ortho prospects.

-- Document the field on the datos_odontograma column
COMMENT ON COLUMN odontogram_pilots.datos_odontograma IS
  'Odontogram JSONB. Tooth status keys per section/cuadrante include: sano, cariado, obturado, resina, amalgama, temporal, sellante, corona, protesis, implante, endodoncia, txpulpar, raiz, ausente, erupcion, extraccionind, apilado, movilidad, fistula, fracturado, odontopatia, carilla, caries-restauracion, erosion, abfraccion, atricion, abrasion. prospecto_orto: boolean flag marking the patient as an orthodontic prospect.';
