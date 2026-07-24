import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';

export async function GET() {
  try {
    const data = await InventarioService.getDistribuidores();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/inventario/distribuidores:', error);
    return NextResponse.json({ error: 'Failed to fetch distribuidores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await InventarioService.createDistribuidor(body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario/distribuidores:', error);
    return NextResponse.json({ error: 'Failed to create distribuidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    const body = await request.json();
    const data = await InventarioService.updateDistribuidor(id, body);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/inventario/distribuidores:', error);
    return NextResponse.json({ error: 'Failed to update distribuidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    await InventarioService.deleteDistribuidor(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/inventario/distribuidores:', error);
    return NextResponse.json({ error: 'Failed to delete distribuidor' }, { status: 500 });
  }
}
