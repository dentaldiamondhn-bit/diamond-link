import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First get the completed treatment to verify it exists
    const treatment = await CompletedTreatmentService.getCompletedTreatmentById(params.id);
    
    if (!treatment) {
      return NextResponse.json(
        { error: 'Completed treatment not found' },
        { status: 404 }
      );
    }

    // Return the treatment items
    return NextResponse.json(treatment.tratamientos_realizados || []);
  } catch (error) {
    console.error('Error in GET /api/tratamientos-completados/[id]/items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treatment items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['tratamiento_id', 'nombre_tratamiento', 'codigo_tratamiento', 'precio_original', 'precio_final', 'cantidad'];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate quantity
    if (body.cantidad <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify the completed treatment exists
    const treatment = await CompletedTreatmentService.getCompletedTreatmentById(params.id);
    if (!treatment) {
      return NextResponse.json(
        { error: 'Completed treatment not found' },
        { status: 404 }
      );
    }

    const newItem = await CompletedTreatmentService.addTreatmentItem(params.id, body);
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tratamientos-completados/[id]/items:', error);
    return NextResponse.json(
      { error: 'Failed to add treatment item' },
      { status: 500 }
    );
  }
}
