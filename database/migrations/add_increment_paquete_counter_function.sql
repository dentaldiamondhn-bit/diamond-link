-- Create function to increment paquete counter
CREATE OR REPLACE FUNCTION increment_paquete_counter(paquete_id INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE paquetes 
  SET veces_vendido = veces_vendido + 1
  WHERE id = paquete_id;
END;
$$ LANGUAGE plpgsql;
