import { NextRequest, NextResponse } from 'next/server';
import { PatientService } from '../../../services/patientService';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search');

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json([]);
    }

    // Use the existing PatientService search method
    const patients = await PatientService.searchPatients(searchTerm);
    return NextResponse.json(patients || []);
  } catch (error) {
    console.error('Error in patients API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search patients',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );
  }
}
