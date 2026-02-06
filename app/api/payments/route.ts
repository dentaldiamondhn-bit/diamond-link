import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/paymentService';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tratamientoCompletadoId = searchParams.get('tratamiento_completado_id');

    if (!tratamientoCompletadoId) {
      return NextResponse.json(
        { error: 'tratamiento_completado_id is required' },
        { status: 400 }
      );
    }

    const payments = await PaymentService.getPaymentsByTreatmentId(tratamientoCompletadoId);
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error in GET /api/payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['tratamiento_completado_id', 'monto_pago', 'metodo_pago'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate payment amount
    if (body.monto_pago <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    const payment = await PaymentService.addPayment(body);
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error in POST /api/payments:', error);
    return NextResponse.json(
      { error: 'Failed to add payment' },
      { status: 500 }
    );
  }
}
