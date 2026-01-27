import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '../../../services/treatmentService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const promotions = await TreatmentService.searchPromotions(search);
      return NextResponse.json(promotions);
    } else {
      const promotions = await TreatmentService.getPromotions();
      return NextResponse.json(promotions);
    }
  } catch (error) {
    console.error('Error in GET /api/promociones:', error);
    // Return proper JSON error response instead of HTML
    return NextResponse.json(
      { 
        error: 'Failed to fetch promotions',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const promotionData = await request.json();
    
    // Generate code if not provided
    if (!promotionData.codigo) {
      const timestamp = Date.now().toString().slice(-3);
      promotionData.codigo = `P${timestamp}`;
    }

    const newPromotion = await TreatmentService.createPromotion(promotionData);
    return NextResponse.json(newPromotion, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/promociones:', error);
    // Return proper JSON error response instead of HTML
    return NextResponse.json(
      { 
        error: 'Failed to create promotion',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}
