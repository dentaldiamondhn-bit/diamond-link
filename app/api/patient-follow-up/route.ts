
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const minDays = parseInt(searchParams.get('minDays') || '150', 10);

    // Fetch ALL treatments — no date cutoff.
    // The minDays filter at the end handles excluding recently treated patients.
    const { data, error } = await supabase
      .from('tratamientos_completados')
      .select(`
        paciente_id,
        fecha_cita,
        patients (
          paciente_id,
          nombre_completo,
          telefono
        ),
        vista_tratamientos_realizados_detalles (
          nombre_tratamiento
        )
      `)
      .order('fecha_cita', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('Error fetching treatments:', error);
      throw error;
    }

    const LIMPIEZA_KEYWORDS = ['limpieza', 'limpieza promocion', 'profilaxis', 'profilaxia'];
    const ORTODONCIA_KEYWORDS = [
      'ortodoncia', 'bracket', 'brackets', 'aparato',
      'frenillos', 'alineador', 'invisalign', 'retenedor',
      'consultas de ortodoncia', 'control de ortodoncia',
    ];

    const stripAccents = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const classifyTreatment = (name: string): 'limpieza' | 'ortodoncia' | 'otro' => {
      const lower = stripAccents(name.toLowerCase());
      if (LIMPIEZA_KEYWORDS.some(k => lower.includes(k))) return 'limpieza';
      if (ORTODONCIA_KEYWORDS.some(k => lower.includes(k))) return 'ortodoncia';
      return 'otro';
    };

    // Flatten: one row per individual treatment, not per appointment
    const individualRows: Array<{
      paciente_id: string;
      patients: any;
      nombre_tratamiento: string;
      fecha_cita: string;
      tipo: 'limpieza' | 'ortodoncia' | 'otro';
    }> = [];

    for (const appointment of (data || [])) {
      const details = appointment.vista_tratamientos_realizados_detalles || [];
      if (details.length === 0) continue;

      for (const detail of details) {
        const treatmentName = detail.nombre_tratamiento || '';
        const tipo = classifyTreatment(treatmentName);

        // Apply type filter — never include 'otro'
        if (tipo === 'otro') continue;
        if (type !== 'all' && type !== tipo) continue;

        individualRows.push({
          paciente_id: appointment.paciente_id,
          patients: appointment.patients,
          nombre_tratamiento: treatmentName,
          fecha_cita: appointment.fecha_cita,
          tipo,
        });
      }
    }

    // Group by (patient_id, tipo) → keep the most recent individual treatment per type
    const typePatientMap = new Map<string, typeof individualRows[0]>();
    for (const row of individualRows) {
      const key = `${row.paciente_id}__${row.tipo}`;
      const existing = typePatientMap.get(key);
      if (!existing || new Date(row.fecha_cita) > new Date(existing.fecha_cita)) {
        typePatientMap.set(key, row);
      }
    }

    const grouped = Array.from(typePatientMap.values()).map((row) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(row.fecha_cita).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        paciente_id: row.paciente_id,
        paciente_nombre: row.patients?.nombre_completo || 'Desconocido',
        paciente_telefono: row.patients?.telefono,
        ultimo_tratamiento: row.nombre_tratamiento,
        fecha_ultimo_tratamiento: row.fecha_cita,
        dias_ultimo_tratamiento: daysSince,
        tipo_seguimiento: row.tipo,
      };
    });

    // Sort by most overdue first
    grouped.sort((a: any, b: any) => b.dias_ultimo_tratamiento - a.dias_ultimo_tratamiento);

    // Only include patients whose last treatment (of this type) is >= minDays ago
    const withMinDays = grouped.filter((p: any) => p.dias_ultimo_tratamiento >= minDays);

    return NextResponse.json({
      message: 'Follow-up patients retrieved successfully',
      data: withMinDays,
    });
  } catch (error) {
    console.error('Error in GET /api/patient-follow-up:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch follow-up patients',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
