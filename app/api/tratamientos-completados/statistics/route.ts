import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let statistics;

    if (startDate && endDate) {
      // For date-specific statistics, we could extend this in the future
      statistics = await CompletedTreatmentService.getTreatmentStatistics();
    } else {
      statistics = await CompletedTreatmentService.getTreatmentStatistics();
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
