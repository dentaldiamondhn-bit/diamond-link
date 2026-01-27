import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid treatment ID' },
        { status: 400 }
      );
    }

    const updatedTreatment = await TreatmentService.incrementTreatmentCounter(id);
    return NextResponse.json(updatedTreatment);
  } catch (error) {
    console.error('Error in POST /api/tratamientos/[id]/increment:', error);
    return NextResponse.json(
      { error: 'Failed to increment treatment counter' },
      { status: 500 }
    );
  }
}
