import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid promotion ID' },
        { status: 400 }
      );
    }

    const updatedPromotion = await TreatmentService.incrementPromotionCounter(id);
    return NextResponse.json(updatedPromotion);
  } catch (error) {
    console.error('Error in POST /api/promociones/[id]/increment:', error);
    return NextResponse.json(
      { error: 'Failed to increment promotion counter' },
      { status: 500 }
    );
  }
}
