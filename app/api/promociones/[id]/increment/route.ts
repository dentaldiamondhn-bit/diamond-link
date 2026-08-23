import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    
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
