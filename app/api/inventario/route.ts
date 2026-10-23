import { NextRequest, NextResponse } from 'next/server';
import { InventarioService } from '@/services/inventarioService';
import { authorizeAuthenticated, authorizeInventory } from '@/lib/inventoryAuth';
import {
  InventoryValidationError,
  parseItemInput,
  parseItemPatch,
} from '@/lib/inventory/domain';

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

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store' };
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAuthenticated();
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const inventario = await InventarioService.getInventario(activeOnly);
    return NextResponse.json(inventario, { headers: noStoreHeaders() });
  } catch (error) {
    console.error('Error in GET /api/inventario:', error);
    return errorResponse(error, 'Failed to fetch inventario');
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

  try {
    const input = parseItemInput(await request.json());
    const item = await InventarioService.upsertInventario(input);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventario:', error);
    return errorResponse(error, 'Failed to create inventario item');
  }
}

async function updateFromRequest(request: NextRequest) {
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const patch = parseItemPatch(await request.json());
    const item = await InventarioService.updateInventario(id, patch);
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating /api/inventario:', error);
    return errorResponse(error, 'Failed to update inventario item');
  }
}

export async function PUT(request: NextRequest) {
  return updateFromRequest(request);
}

export async function PATCH(request: NextRequest) {
  return updateFromRequest(request);
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeInventory();
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await InventarioService.getInventarioItem(id);
    if (!existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    await InventarioService.deleteInventario(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/inventario:', error);
    return errorResponse(error, 'Failed to delete inventario item');
  }
}
