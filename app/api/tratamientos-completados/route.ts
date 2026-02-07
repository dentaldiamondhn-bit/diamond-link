import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { TreatmentService } from '@/services/treatmentService';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const pacienteId = searchParams.get('paciente_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let treatments;

    if (search) {
      treatments = await CompletedTreatmentService.searchCompletedTreatments(search);
    } else if (pacienteId) {
      treatments = await CompletedTreatmentService.getCompletedTreatmentsByPatientId(pacienteId);
    } else if (startDate && endDate) {
      treatments = await CompletedTreatmentService.getCompletedTreatmentsByDateRange(startDate, endDate);
    } else {
      treatments = await CompletedTreatmentService.getAllCompletedTreatments();
    }

    return NextResponse.json(treatments);
  } catch (error) {
    console.error('Error in GET /api/tratamientos-completados:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed treatments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['paciente_id', 'fecha_cita', 'total_original', 'total_final', 'estado'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate tipo_descuento if provided
    if (body.tipo_descuento && !['monto', 'porcentaje', 'ninguno'].includes(body.tipo_descuento)) {
      return NextResponse.json(
        { error: 'Invalid tipo_descuento value' },
        { status: 400 }
      );
    }

    // Validate estado
    if (!['pendiente_firma', 'firmado', 'pagado'].includes(body.estado)) {
      return NextResponse.json(
        { error: 'Invalid estado value' },
        { status: 400 }
      );
    }

    // Validate tratamientos_realizados array
    if (!body.tratamientos_realizados || !Array.isArray(body.tratamientos_realizados)) {
      return NextResponse.json(
        { error: 'tratamientos_realizados must be an array' },
        { status: 400 }
      );
    }

    // Validate each treatment item
    for (const item of body.tratamientos_realizados) {
      const requiredItemFields = ['tratamiento_id', 'nombre_tratamiento', 'codigo_tratamiento', 'precio_original', 'precio_final', 'cantidad'];
      for (const field of requiredItemFields) {
        if (item[field] === undefined || item[field] === null) {
          return NextResponse.json(
            { error: `Missing required field in treatment item: ${field}` },
            { status: 400 }
          );
        }
      }

      if (item.cantidad <= 0) {
        return NextResponse.json(
          { error: 'Treatment item quantity must be greater than 0' },
          { status: 400 }
        );
      }
    }

    const treatment = await CompletedTreatmentService.createCompletedTreatment(body);
    
    // Increment the counter for each treatment that was completed
    if (body.tratamientos_realizados && Array.isArray(body.tratamientos_realizados)) {
      for (const item of body.tratamientos_realizados) {
        try {
          await TreatmentService.incrementTreatmentCounter(item.tratamiento_id, item.cantidad);
        } catch (error) {
          console.error(`Error incrementing counter for treatment ${item.tratamiento_id}:`, error);
        }
      }
    }
    
    return NextResponse.json(treatment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/tratamientos-completados:', error);
    return NextResponse.json(
      { error: 'Failed to create completed treatment' },
      { status: 500 }
    );
  }
}
