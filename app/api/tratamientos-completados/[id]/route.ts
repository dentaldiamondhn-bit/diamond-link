import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const treatment = await CompletedTreatmentService.getCompletedTreatmentById(params.id);
    
    if (!treatment) {
      return NextResponse.json(
        { error: 'Completed treatment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(treatment);
  } catch (error) {
    console.error('Error in GET /api/tratamientos-completados/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed treatment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate tipo_descuento if provided
    if (body.tipo_descuento && !['monto', 'porcentaje', 'ninguno'].includes(body.tipo_descuento)) {
      return NextResponse.json(
        { error: 'Invalid tipo_descuento value' },
        { status: 400 }
      );
    }

    // Validate estado if provided
    if (body.estado && !['pendiente_firma', 'firmado', 'pagado'].includes(body.estado)) {
      return NextResponse.json(
        { error: 'Invalid estado value' },
        { status: 400 }
      );
    }

    const updatedTreatment = await CompletedTreatmentService.updateCompletedTreatment(params.id, body);
    return NextResponse.json(updatedTreatment);
  } catch (error) {
    console.error('Error in PUT /api/tratamientos-completados/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update completed treatment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await CompletedTreatmentService.deleteCompletedTreatment(params.id);
    return NextResponse.json({ message: 'Completed treatment deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/tratamientos-completados/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete completed treatment' },
      { status: 500 }
    );
  }
}
