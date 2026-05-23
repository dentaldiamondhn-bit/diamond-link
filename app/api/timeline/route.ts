import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const pacienteId = request.nextUrl.searchParams.get('paciente_id');

  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id is required' }, { status: 400 });
  }

  try {
    const [patientResult, appointmentsResult, treatmentsResult, odontogramsResult, consentimientosResult, presupuestosResult] = await Promise.all([
      supabase.from('patients').select('paciente_id, nombre_completo, fecha_inicio, edad, sexo').eq('paciente_id', pacienteId).single(),
      supabase.from('calendar_events').select('id, title, description, start_date, end_date, event_type, status, notes, location').eq('patient_id', pacienteId).order('start_date', { ascending: false }),
      supabase.from('tratamientos_completados').select('id, fecha_cita, total_final, monto_pagado, estado, notas_doctor, especialidad').eq('paciente_id', pacienteId).order('fecha_cita', { ascending: false }),
      supabase.from('odontograms').select('id, version, datos_odontograma, notas, fecha_creacion').eq('paciente_id', pacienteId).order('fecha_creacion', { ascending: false }),
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
    const odontograms = odontogramsResult.data || [];
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

    // Compute odontogram summaries
    const odontogramSummaries = odontograms.map(o => {
      const dientes = o.datos_odontograma?.dientes || {};
      const counts: Record<string, number> = {};
      Object.values(dientes).forEach((d: any) => {
        const estado = d?.estado || 'sano';
        counts[estado] = (counts[estado] || 0) + 1;
      });
      const significant = Object.entries(counts)
        .filter(([k]) => k !== 'sano')
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`);

      return {
        id: o.id,
        version: o.version,
        fecha_creacion: o.fecha_creacion,
        notas: o.notas,
        tooth_counts: counts,
        significant_findings: significant,
        total_teeth: Object.keys(dientes).length
      };
    });

    return NextResponse.json({
      patient,
      appointments,
      treatments: treatmentsWithItems,
      odontograms: odontogramSummaries,
      consentimientos,
      presupuestos,
      summary: {
        total_appointments: appointments.length,
        total_treatments: treatments.length,
        total_odontograms: odontograms.length,
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
