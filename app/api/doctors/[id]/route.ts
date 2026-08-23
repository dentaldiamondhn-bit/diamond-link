import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDoctorService } from '@/services/supabaseDoctorService';
import { Doctor } from '@/config/doctors';



export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await SupabaseDoctorService.getDoctorById(id);
    
    if (!doctor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Doctor not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: doctor 
    });
  } catch (error) {
    console.error('API Error - GET /api/doctors/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch doctor' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updatedDoctor = await SupabaseDoctorService.updateDoctor(id, body);
    
    if (!updatedDoctor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Doctor not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedDoctor 
    });
  } catch (error) {
    console.error('API Error - PUT /api/doctors/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update doctor' 
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await SupabaseDoctorService.deleteDoctor(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Doctor deleted successfully' 
    });
  } catch (error) {
    console.error('API Error - DELETE /api/doctors/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete doctor' 
      },
      { status: 500 }
    );
  }
}
