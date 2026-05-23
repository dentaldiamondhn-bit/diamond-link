import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const pacienteId = request.nextUrl.searchParams.get('paciente_id');

  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id is required' }, { status: 400 });
  }

  try {
    const [patientResult, appointmentsResult, treatmentsResult, consentimientosResult, presupuestosResult] = await Promise.all([
      supabase.from('patients').select('paciente_id, nombre_completo, fecha_inicio, edad, sexo').eq('paciente_id', pacienteId).single(),
      supabase.from('calendar_events').select('id, title, description, start_date, end_date, event_type, status, notes, location').eq('patient_id', pacienteId).order('start_date', { ascending: false }),
      supabase.from('tratamientos_completados').select('id, fecha_cita, total_final, monto_pagado, estado, notas_doctor, especialidad').eq('paciente_id', pacienteId).order('fecha_cita', { ascending: false }),
      supabase.from('consentimientos').select('id, nombre_consentimiento, tipo_consentimiento, fecha_consentimiento, estado').eq('paciente_id', pacienteId).order('fecha_consentimiento', { ascending: false }),
      supabase.from('presupuestos').select('id, treatment_description, total_amount, status, quote_date, doctor_name').eq('patient_id', pacienteId).order('quote_date', { ascending: false })
    ]);

    // Fetch payments for this patient's treatments
    const treatmentIds = (treatmentsResult.data || []).map(t => t.id);
    const paymentsResult = treatmentIds.length > 0
      ? await supabase.from('payments').select('id, tratamiento_completado_id, monto_pago, moneda, fecha_pago, metodo_pago, notas_pago').in('tratamiento_completado_id', treatmentIds).order('fecha_pago', { ascending: false })
      : { data: [], error: null };

    const patient = patientResult.data;
    const appointments = appointmentsResult.data || [];
    const treatments = treatmentsResult.data || [];
    const consentimientos = consentimientosResult.data || [];
    const presupuestos = presupuestosResult.data || [];
    const payments = paymentsResult.data || [];

    // Build treatment items for each treatment
    const treatmentsWithItems = await Promise.all(
      treatments.map(async (t) => {
        const { data: items } = await supabase
          .from('vista_tratamientos_realizados_detalles')
          .select('nombre_tratamiento, doctor_name, precio_final, cantidad')
          .eq('tratamiento_completado_id', t.id);

        const treatmentPayments = payments.filter(p => p.tratamiento_completado_id === t.id);

        return {
          ...t,
          items: items || [],
          payments: treatmentPayments
        };
      })
    );

    return NextResponse.json({
      patient,
      appointments,
      treatments: treatmentsWithItems,
      odontograms: [],
      consentimientos,
      presupuestos,
      summary: {
        total_appointments: appointments.length,
        total_treatments: treatments.length,
        total_odontograms: 0,
        total_consentimientos: consentimientos.length,
        total_presupuestos: presupuestos.length,
        total_paid: treatments.reduce((sum, t) => sum + (t.monto_pagado || 0), 0),
        total_billed: treatments.reduce((sum, t) => sum + (t.total_final || 0), 0),
        fecha_inicio: patient?.fecha_inicio || null
      }
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline data' }, { status: 500 });
  }
}
