import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';
import { authorizeAuthenticated, authorizeInventory } from '@/lib/inventoryAuth';

export async function GET() {
  const auth = await authorizeAuthenticated();
  if ('response' in auth) return auth.response;

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
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

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
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const body = await request.json();
    const data = await InventarioService.updateMarca(id, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/inventario/marcas:', error);
    return NextResponse.json({ error: 'Failed to update marca' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await InventarioService.deleteMarca(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/inventario/marcas:', error);
    return NextResponse.json({ error: 'Failed to delete marca' }, { status: 500 });
  }
}
