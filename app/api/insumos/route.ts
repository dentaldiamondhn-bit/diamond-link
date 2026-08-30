import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const insumos = await TreatmentService.searchInsumos(search);
      return NextResponse.json(insumos, { headers: { 'Cache-Control': 'no-store' } });
    } else {
      const insumos = await TreatmentService.getInsumos();
      return NextResponse.json(insumos, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (error) {
    console.error('Error in GET /api/insumos:', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json([], { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch insumos',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const insumoData = await request.json();

    if (!insumoData.codigo) {
      insumoData.codigo = await TreatmentService.generateNextInsumoCode();
    }

    const newInsumo = await TreatmentService.createInsumo(insumoData);
    return NextResponse.json(newInsumo, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/insumos:', error);
    return NextResponse.json(
      {
        error: 'Failed to create insumo',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    const insumoData = await request.json();
    const updatedInsumo = await TreatmentService.updateInsumo(id, insumoData);
    return NextResponse.json(updatedInsumo);
  } catch (error) {
    console.error('Error in PUT /api/insumos:', error);
    return NextResponse.json(
      {
        error: 'Failed to update insumo',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    await TreatmentService.deleteInsumo(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/insumos:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete insumo',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}
