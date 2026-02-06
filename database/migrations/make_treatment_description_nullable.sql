-- Make treatment_description column nullable in presupuestos table
ALTER TABLE presupuestos 
ALTER COLUMN treatment_description DROP NOT NULL;
