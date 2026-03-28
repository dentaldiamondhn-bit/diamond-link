import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const treatment = await TreatmentService.getTreatmentById(id);
    return NextResponse.json(treatment);
  } catch (error) {
    console.error('Error in GET /api/tratamientos/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treatment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const updates = await request.json();
    
    const updatedTreatment = await TreatmentService.updateTreatment(id, updates);
    return NextResponse.json(updatedTreatment);
  } catch (error) {
    console.error('Error in PUT /api/tratamientos/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update treatment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    await TreatmentService.deleteTreatment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/tratamientos/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete treatment' },
      { status: 500 }
    );
  }
}
