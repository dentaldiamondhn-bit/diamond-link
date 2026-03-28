import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let statistics;

    if (startDate && endDate) {
      // For date-specific statistics, we could extend this in the future
      statistics = await CompletedTreatmentService.getDoctorStatistics();
    } else {
      statistics = await CompletedTreatmentService.getDoctorStatistics();
    }

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error in GET /api/tratamientos-completados/statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch treatment statistics' },
      { status: 500 }
    );
  }
}
