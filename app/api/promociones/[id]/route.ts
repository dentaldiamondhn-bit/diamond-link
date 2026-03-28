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
    const promotion = await TreatmentService.getPromotionById(id);
    return NextResponse.json(promotion);
  } catch (error) {
    console.error('Error in GET /api/promociones/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotion' },
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
    
    const updatedPromotion = await TreatmentService.updatePromotion(id, updates);
    return NextResponse.json(updatedPromotion);
  } catch (error) {
    console.error('Error in PUT /api/promociones/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update promotion' },
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
    await TreatmentService.deletePromotion(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/promociones/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}
