import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const pacienteId = request.nextUrl.searchParams.get('paciente_id');

  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const [patientResult, appointmentsResult, treatmentsResult, odontogramsResult, consentimientosResult, presupuestosResult] = await Promise.all([
      supabase.from('patients').select('paciente_id, nombre_completo, fecha_inicio, edad, sexo').eq('paciente_id', pacienteId).single(),
      supabase.from('calendar_events').select('id, title, description, start_date, end_date, event_type, status, notes, location').eq('patient_id', pacienteId).order('start_date', { ascending: false }),
      supabase.from('tratamientos_completados').select('id, fecha_cita, total_final, monto_pagado, estado, notas_doctor, especialidad').eq('paciente_id', pacienteId).order('fecha_cita', { ascending: false }),
      supabase.from('odontogram_pilots').select('id, version, datos_odontograma, notas, fecha_creacion').eq('paciente_id', pacienteId).order('fecha_creacion', { ascending: false }),
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
    const odontogramsRaw = odontogramsResult.data || [];
    console.log('[TIMELINE API] odontogram_pilots raw count:', odontogramsRaw.length);
    if (odontogramsRaw.length > 0) {
      const sample = odontogramsRaw[0];
      console.log('[TIMELINE API] sample keys:', Object.keys(sample));
      console.log('[TIMELINE API] datos_odontograma type:', typeof sample.datos_odontograma);
      console.log('[TIMELINE API] datos_odontograma preview:', JSON.stringify(sample.datos_odontograma).substring(0, 300));
    }
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
    const adultToothNumbers = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
      48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
    const childToothNumbers = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
      85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

    const getToothState = (diente: any, odontogramType?: string) => {
      if (!diente || typeof diente !== 'object') return 'sano';
      if (diente.estado !== undefined) return diente.estado || 'sano';
      const cuadrantes = diente.cuadrantes;
      const central = diente.central;
      if (cuadrantes && typeof cuadrantes === 'object') {
        const quadrantValues = Object.values(cuadrantes).filter((v) => typeof v === 'string') as string[];
        const firstNonSano = quadrantValues.find((v) => v !== 'sano');
        if (odontogramType === 'oleary_adulto') return firstNonSano || 'sano';
        if (central && typeof central === 'string' && central !== 'sano') return central;
        return firstNonSano || 'sano';
      }
      if (central && typeof central === 'string') return central || 'sano';
      return 'sano';
    };

    const odontogramSummaries = odontograms.map(o => {
      // Handle JSONB that may be returned as string
      let datosOdontograma = o.datos_odontograma;
      if (typeof datosOdontograma === 'string') {
        try {
          datosOdontograma = JSON.parse(datosOdontograma);
        } catch {
          datosOdontograma = {};
        }
      }
      datosOdontograma = datosOdontograma || {};

      // Handle nested structure (datos_odontograma.datos_odontograma)
      if (datosOdontograma.datos_odontograma && typeof datosOdontograma.datos_odontograma === 'object') {
        datosOdontograma = datosOdontograma.datos_odontograma;
      }

      const dientes = datosOdontograma.dientes || {};
      const odontogramType = datosOdontograma.tipo;
      const toothKeys = odontogramType === 'nino' ? childToothNumbers : adultToothNumbers;
      const counts: Record<string, number> = {};

      toothKeys.forEach((toothNumber) => {
        const key = toothNumber.toString();
        const diente = dientes[key];
        const toothState = getToothState(diente, odontogramType);
        counts[toothState] = (counts[toothState] || 0) + 1;
      });

      const significant = Object.entries(counts)
        .filter(([k]) => k !== 'sano')
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`);

      // notas may be inside datos_odontograma or at top level
      const notas = datosOdontograma.notas || o.notas || null;

      return {
        id: o.id,
        version: o.version,
        fecha_creacion: o.fecha_creacion,
        notas,
        tooth_counts: counts,
        significant_findings: significant,
        total_teeth: toothKeys.length,
        odontogram_type: odontogramType
      };
    });

    console.log('[TIMELINE API] odontogram summaries:', JSON.stringify(odontogramSummaries).substring(0, 500));

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
