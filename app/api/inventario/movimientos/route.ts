import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';
import { authorizeAuthenticated, authorizeInventory } from '@/lib/inventoryAuth';
import { InventoryValidationError, parseMovementInput } from '@/lib/inventory/domain';

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof InventoryValidationError) {
    return NextResponse.json({ error: fallback, message: error.message }, { status: 400 });
  }
  return NextResponse.json(
    {
      error: fallback,
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const movimientos = await InventarioService.getMovimientos({
      inventario_id: searchParams.get('inventario_id') || undefined,
      insumo_id: searchParams.get('insumo_id') || undefined,
      tipo: searchParams.get('tipo') || undefined,
      accion: searchParams.get('accion') || undefined,
      desde: searchParams.get('desde') || undefined,
      hasta: searchParams.get('hasta') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });
    return NextResponse.json(movimientos, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error in GET /api/inventario/movimientos:', error);
    return errorResponse(error, 'Failed to fetch movimientos');
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAuthenticated();
  if ('response' in auth) return auth.response;

  try {
    const input = parseMovementInput(await request.json());
    const movimiento = await InventarioService.registrarMovimiento(input);
    return NextResponse.json(movimiento, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario/movimientos:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    return errorResponse(error, 'Failed to create movimiento');
  }
}
