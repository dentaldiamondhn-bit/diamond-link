-- Add notes column to tratamientos table
ALTER TABLE tratamientos ADD COLUMN notas TEXT;

-- Add comment to describe the purpose of the column
COMMENT ON COLUMN tratamientos.notas IS 'Notas adicionales sobre el tratamiento, similar a comentarios en odontograma';
