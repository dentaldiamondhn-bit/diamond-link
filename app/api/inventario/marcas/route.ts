import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';

export async function GET() {
  try {
    const data = await InventarioService.getMarcas();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/inventario/marcas:', error);
    return NextResponse.json({ error: 'Failed to fetch marcas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await InventarioService.createMarca(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario/marcas:', error);
    return NextResponse.json({ error: 'Failed to create marca' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    const body = await request.json();
    const data = await InventarioService.updateMarca(id, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/inventario/marcas:', error);
    return NextResponse.json({ error: 'Failed to update marca' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    await InventarioService.deleteMarca(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/inventario/marcas:', error);
    return NextResponse.json({ error: 'Failed to delete marca' }, { status: 500 });
  }
}
