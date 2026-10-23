-- Inventory integrity: preserve audit history, remove the legacy stock trigger,
-- and make stock + price changes atomic with their movement row.

-- Some environments still have the old trigger that also mutates stock.
DROP TRIGGER IF EXISTS trigger_update_stock ON movimientos_inventario;
DROP FUNCTION IF EXISTS update_stock_on_movement();

-- Preserve movement/audit history when an inventory item is deleted.
ALTER TABLE movimientos_inventario
  DROP CONSTRAINT IF EXISTS movimientos_inventario_inventario_id_fkey;
ALTER TABLE movimientos_inventario
  ADD CONSTRAINT movimientos_inventario_inventario_id_fkey
  FOREIGN KEY (inventario_id) REFERENCES inventario(id) ON DELETE SET NULL;

-- One transaction: lock the item, update stock and optional prices, insert movement.
CREATE OR REPLACE FUNCTION register_inventory_movement(
  p_inventario_id UUID,
  p_tipo TEXT,
  p_cantidad INTEGER,
  p_precio_unitario DECIMAL(10,2) DEFAULT NULL,
  p_notas TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_precio DECIMAL(10,2) DEFAULT NULL,
  p_precio_compra DECIMAL(10,2) DEFAULT NULL,
  p_fecha_compra DATE DEFAULT NULL
) RETURNS movimientos_inventario
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
  v_movement movimientos_inventario;
BEGIN
  IF p_tipo NOT IN ('entrada', 'salida') THEN
    RAISE EXCEPTION 'invalid movement type: %', p_tipo;
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'cantidad must be greater than zero';
  END IF;

  SELECT stock_actual INTO v_current
  FROM inventario WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory item not found: %', p_inventario_id;
  END IF;

  v_new := CASE
    WHEN p_tipo = 'entrada' THEN GREATEST(0, v_current) + p_cantidad
    ELSE GREATEST(0, GREATEST(0, v_current) - p_cantidad)
  END;

  UPDATE inventario
  SET stock_actual = v_new,
      precio = COALESCE(p_precio, precio),
      precio_compra = COALESCE(p_precio_compra, precio_compra),
      fecha_compra = COALESCE(p_fecha_compra, fecha_compra),
      updated_at = NOW()
  WHERE id = p_inventario_id;

  INSERT INTO movimientos_inventario (
    inventario_id, tipo, cantidad, precio_unitario, notas, created_by,
    accion, entidad_tipo, created_at
  ) VALUES (
    p_inventario_id, p_tipo, p_cantidad, p_precio_unitario, p_notas, p_created_by,
    CASE WHEN p_tipo = 'entrada' THEN 'entrada_stock' ELSE 'salida_stock' END,
    'inventario', NOW()
  ) RETURNING * INTO v_movement;

  RETURN v_movement;
END;
$$;

REVOKE ALL ON FUNCTION register_inventory_movement(
  UUID, TEXT, INTEGER, DECIMAL, TEXT, UUID, DECIMAL, DECIMAL, DATE
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_inventory_movement(
  UUID, TEXT, INTEGER, DECIMAL, TEXT, UUID, DECIMAL, DECIMAL, DATE
) TO anon, authenticated, service_role;
