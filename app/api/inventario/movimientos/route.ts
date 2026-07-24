import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const movimientos = await InventarioService.getMovimientos({
      inventario_id: searchParams.get('inventario_id') || undefined,
      insumo_id: searchParams.get('insumo_id') || undefined,
      tipo: (searchParams.get('tipo') as 'entrada' | 'salida') || undefined,
      desde: searchParams.get('desde') || undefined,
      hasta: searchParams.get('hasta') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    console.error('Error in GET /api/inventario/movimientos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movimientos', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const movimiento = await InventarioService.registrarMovimiento({
      inventario_id: data.inventario_id || data.insumo_id,
      insumo_id: data.insumo_id,
      tipo: data.tipo,
      cantidad: data.cantidad,
      precio_unitario: data.precio_unitario,
      notas: data.notas,
      created_by: data.created_by,
      tratamiento_completado_id: data.tratamiento_completado_id,
    });
    return NextResponse.json(movimiento, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario/movimientos:', error);
    return NextResponse.json(
      { error: 'Failed to create movimiento', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
