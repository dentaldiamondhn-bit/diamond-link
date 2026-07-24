import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const inventario = await InventarioService.getInventario(activeOnly);
    return NextResponse.json(inventario);
  } catch (error) {
    console.error('Error in GET /api/inventario:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventario', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const item = await InventarioService.upsertInventario({
      codigo: data.codigo,
      nombre: data.nombre,
      precio: data.precio ?? 0,
      precio_compra: data.precio_compra ?? 0,
      fecha_compra: data.fecha_compra || null,
      moneda: data.moneda || 'HNL',
      marca_id: data.marca_id,
      marca: data.marca,
      stock_actual: data.stock_actual || 0,
      stock_minimo: data.stock_minimo || 5,
      ubicacion: data.ubicacion,
      imagen_url: data.imagen_url,
      activo: data.activo ?? true,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario:', error);
    return NextResponse.json(
      { error: 'Failed to create inventario item', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    const data = await request.json();

    const item = await InventarioService.upsertInventario({
      id,
      codigo: data.codigo,
      nombre: data.nombre,
      precio: data.precio ?? 0,
      precio_compra: data.precio_compra ?? 0,
      fecha_compra: data.fecha_compra || null,
      moneda: data.moneda || 'HNL',
      marca_id: data.marca_id,
      marca: data.marca,
      stock_actual: data.stock_actual ?? 0,
      stock_minimo: data.stock_minimo ?? 5,
      ubicacion: data.ubicacion,
      imagen_url: data.imagen_url,
      activo: data.activo ?? true,
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error in PUT /api/inventario:', error);
    return NextResponse.json(
      { error: 'Failed to update inventario item', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    await InventarioService.deleteInventario(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/inventario:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventario item', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
