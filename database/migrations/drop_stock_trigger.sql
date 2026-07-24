-- Drop the stock trigger that was causing double-decrement
-- Stock is now updated directly in registrarMovimiento (inventarioService.ts)
DROP TRIGGER IF EXISTS trigger_update_stock ON movimientos_inventario;
DROP FUNCTION IF EXISTS update_stock_on_movement;
