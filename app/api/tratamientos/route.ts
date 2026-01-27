import { NextRequest, NextResponse } from 'next/server';
import { TreatmentService } from '@/services/treatmentService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const treatments = await TreatmentService.searchTreatments(search);
      return NextResponse.json(treatments);
    } else {
      const treatments = await TreatmentService.getTreatments();
      return NextResponse.json(treatments);
    }
  } catch (error) {
    console.error('Error in GET /api/tratamientos:', error);
    // Return proper JSON error response instead of HTML
    return NextResponse.json(
      { 
        error: 'Failed to fetch treatments',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const treatmentData = await request.json();
    
    // Generate code if not provided
    if (!treatmentData.codigo) {
      const timestamp = Date.now().toString().slice(-3);
      treatmentData.codigo = `T${timestamp}`;
    }

    const newTreatment = await TreatmentService.createTreatment(treatmentData);
    return NextResponse.json(newTreatment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tratamientos:', error);
    // Return proper JSON error response instead of HTML
    return NextResponse.json(
      { 
        error: 'Failed to create treatment',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}
