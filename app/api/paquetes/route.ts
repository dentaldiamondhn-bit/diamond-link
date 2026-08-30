import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '../../../services/treatmentService';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const paquetes = await TreatmentService.searchPaquetes(search);
      return NextResponse.json(paquetes, { headers: { 'Cache-Control': 'no-store' } });
    } else {
      const paquetes = await TreatmentService.getPaquetes();
      return NextResponse.json(paquetes, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (error) {
    console.error('Error in GET /api/paquetes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch paquetes',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const paqueteData = await request.json();
    
    // Generate code if not provided
    if (!paqueteData.codigo) {
      paqueteData.codigo = await TreatmentService.generateNextPaqueteCode();
    }

    const newPaquete = await TreatmentService.createPaquete(paqueteData);
    return NextResponse.json(newPaquete, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/paquetes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create paquete',
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
    const id = parseInt(searchParams.get('id') || '0');
    
    const paqueteData = await request.json();
    const updatedPaquete = await TreatmentService.updatePaquete(id, paqueteData);
    return NextResponse.json(updatedPaquete);
  } catch (error) {
    console.error('Error in PUT /api/paquetes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update paquete',
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
    const id = parseInt(searchParams.get('id') || '0');
    
    await TreatmentService.deletePaquete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/paquetes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete paquete',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}
