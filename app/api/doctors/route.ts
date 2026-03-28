import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDoctorService } from '@/services/supabaseDoctorService';
import { Doctor } from '@/config/doctors';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const userId = searchParams.get('userId');

    let doctors: Doctor[];

    if (specialty) {
      doctors = await SupabaseDoctorService.getDoctorsBySpecialty(specialty);
    } else if (userId) {
      const doctor = await SupabaseDoctorService.getDoctorByUserId(userId);
      doctors = doctor ? [doctor] : [];
    } else {
      doctors = await SupabaseDoctorService.getDoctors();
    }

    return NextResponse.json({ 
      success: true, 
      data: doctors 
    });
  } catch (error) {
    console.error('API Error - GET /api/doctors:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch doctors' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newDoctor = await SupabaseDoctorService.createDoctor(body);
    
    return NextResponse.json({ 
      success: true, 
      data: newDoctor 
    }, { status: 201 });
  } catch (error) {
    console.error('API Error - POST /api/doctors:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create doctor' 
      },
      { status: 400 }
    );
  }
}
