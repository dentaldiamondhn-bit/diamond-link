import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const body = await request.json();

    // Validate quantity if provided
    if (body.cantidad !== undefined && body.cantidad <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    const updatedItem = await CompletedTreatmentService.updateTreatmentItem(params.itemId, body);
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error in PUT /api/tratamientos-completados/[id]/items/[itemId]:', error);
    return NextResponse.json(
      { error: 'Failed to update treatment item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    await CompletedTreatmentService.removeTreatmentItem(params.itemId);
    return NextResponse.json({ message: 'Treatment item deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/tratamientos-completados/[id]/items/[itemId]:', error);
    return NextResponse.json(
      { error: 'Failed to delete treatment item' },
      { status: 500 }
    );
  }
}
