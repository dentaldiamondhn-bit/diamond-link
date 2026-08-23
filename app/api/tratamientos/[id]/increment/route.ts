import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const parsedId = parseInt(rawId);
    
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: 'Invalid treatment ID' },
        { status: 400 }
      );
    }

    const updatedTreatment = await TreatmentService.incrementTreatmentCounter(parsedId);
    return NextResponse.json(updatedTreatment);
  } catch (error) {
    console.error('Error in POST /api/tratamientos/[id]/increment:', error);
    return NextResponse.json(
      { error: 'Failed to increment treatment counter' },
      { status: 500 }
    );
  }
}
