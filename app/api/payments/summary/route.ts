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

    const summary = await PaymentService.getPaymentSummary(tratamientoCompletadoId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in GET /api/payments/summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment summary' },
      { status: 500 }
    );
  }
}
