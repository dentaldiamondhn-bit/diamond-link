import { NextRequest, NextResponse } from 'next/server';
import { DoctorService } from '../../../services/doctorService';
import { auth } from '@clerk/nextjs/server';

// GET /api/doctors - Get all doctors

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const specialty = searchParams.get('specialty');

    let doctors;
    
    if (search) {
      doctors = await DoctorService.searchDoctors(search);
    } else if (specialty) {
      doctors = await DoctorService.getDoctorsBySpecialty(specialty);
    } else {
      doctors = await DoctorService.getDoctors();
    }

    return NextResponse.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch doctors' },
      { status: 500 }
    );
  }
}

// POST /api/doctors - Create new doctor
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.specialty) {
      return NextResponse.json(
        { error: 'Missing required fields: name and specialty are required' },
        { status: 400 }
      );
    }

    // Validate doctor data
    const validation = await DoctorService.validateDoctor(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const newDoctor = await DoctorService.addDoctor({
      name: body.name,
      specialty: body.specialty
    });

    return NextResponse.json(newDoctor, { status: 201 });
  } catch (error) {
    console.error('Error creating doctor:', error);
    return NextResponse.json(
      { error: 'Failed to create doctor' },
      { status: 500 }
    );
  }
}

// PUT /api/doctors - Update doctor
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Validate doctor data
    const validation = await DoctorService.validateDoctor(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const updatedDoctor = await DoctorService.updateDoctor(body.id, {
      name: body.name,
      specialty: body.specialty
    });

    if (!updatedDoctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedDoctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    return NextResponse.json(
      { error: 'Failed to update doctor' },
      { status: 500 }
    );
  }
}

// DELETE /api/doctors - Delete doctor
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('id');
    
    if (!doctorId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const deleted = await DoctorService.deleteDoctor(doctorId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    return NextResponse.json(
      { error: 'Failed to delete doctor' },
      { status: 500 }
    );
  }
}
