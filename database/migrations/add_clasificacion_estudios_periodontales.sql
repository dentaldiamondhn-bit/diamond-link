-- Clasificación periodontal 2017 AAP/EFP (selección de Estadio/Grado/Extensión)
-- guardada junto con cada estudio periodontal.
ALTER TABLE estudios_periodontales
  ADD COLUMN IF NOT EXISTS clasificacion jsonb;
