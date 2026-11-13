import { ChartData, CHART_TEMPLATE, SurfaceId } from '@/lib/types';

const VESTIBULAR_SURFACES: SurfaceId[] = ['mb', 'b', 'db'];
const PALATINO_SURFACES_UPPER: SurfaceId[] = ['mp', 'p', 'dp'];
const PALATINO_SURFACES_LOWER: SurfaceId[] = ['ml', 'l', 'dl'];

function readNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseFloat(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function buildChartDataFromStudy(study: any): ChartData {
  const chartData: ChartData = { ...CHART_TEMPLATE };

  chartData.patient_number = study?.paciente_id || '';
  chartData.date = study?.fecha_estudio || '';
  chartData.indice_placa = study?.indice_placa ?? 0;
  chartData.indice_sangrado = study?.indice_sangrado ?? 0;
  chartData.nivel_insercion_clinica = study?.nivel_insercion_clinica || '';
  chartData.furcaciones = study?.furcaciones || 'no-evaluado';
  chartData.observaciones_generales = study?.observaciones_generales || '';
  chartData.plan_tratamiento = study?.plan_tratamiento || {};
  chartData.doctor_id = study?.doctor_id || '';
  chartData.clinician = study?.doctors?.name || study?.doctor || '';

  const mediciones: any[] = Array.isArray(study?.mediciones)
    ? study.mediciones
    : Array.isArray(study?.mediciones_periodontales)
      ? study.mediciones_periodontales
      : [];

  mediciones.forEach((m) => {
    const tooth = parseInt(String(m.numero_diente ?? m.diente), 10);
    if (Number.isNaN(tooth)) return;

    chartData[`tooth_${tooth}`] = '1';

    const isLower = tooth >= 31 && tooth <= 48;
    const palatinoSurfaces = isLower ? PALATINO_SURFACES_LOWER : PALATINO_SURFACES_UPPER;

    const vestibular = [
      m.vestibular_mesial ?? m.vestibular?.mesial,
      m.vestibular_medio ?? m.vestibular?.medio,
      m.vestibular_distal ?? m.vestibular?.distal,
    ];
    const palatino = [
      m.palatino_mesial ?? m.palatino?.mesial,
      m.palatino_medio ?? m.palatino?.medio,
      m.palatino_distal ?? m.palatino?.distal,
    ];

    // Gingival margin is signed: negative values mean recession, so they must
    // survive the round trip instead of being reset to 0.
    const vestibularGm = [
      m.vestibular_gm_mesial ?? m.vestibularGm?.mesial,
      m.vestibular_gm_medio ?? m.vestibularGm?.medio,
      m.vestibular_gm_distal ?? m.vestibularGm?.distal,
    ];
    const palatinoGm = [
      m.palatino_gm_mesial ?? m.palatinoGm?.mesial,
      m.palatino_gm_medio ?? m.palatinoGm?.medio,
      m.palatino_gm_distal ?? m.palatinoGm?.distal,
    ];

    const vestibularAl = [
      m.vestibular_al_mesial ?? m.vestibularAl?.mesial,
      m.vestibular_al_medio ?? m.vestibularAl?.medio,
      m.vestibular_al_distal ?? m.vestibularAl?.distal,
    ];
    const palatinoAl = [
      m.palatino_al_mesial ?? m.palatinoAl?.mesial,
      m.palatino_al_medio ?? m.palatinoAl?.medio,
      m.palatino_al_distal ?? m.palatinoAl?.distal,
    ];

    VESTIBULAR_SURFACES.forEach((surface, i) => {
      chartData[`pd_${tooth}_${surface}`] = readNumber(vestibular[i]);
      chartData[`gm_${tooth}_${surface}`] = readNumber(vestibularGm[i]);
      chartData[`al_${tooth}_${surface}`] = readNumber(vestibularAl[i]);
    });

    palatinoSurfaces.forEach((surface, i) => {
      chartData[`pd_${tooth}_${surface}`] = readNumber(palatino[i]);
      chartData[`gm_${tooth}_${surface}`] = readNumber(palatinoGm[i]);
      chartData[`al_${tooth}_${surface}`] = readNumber(palatinoAl[i]);
    });

    const mobility = readNumber(m.movilidad);
    if (mobility > 0) chartData[`mobility_${tooth}`] = mobility;

    const applicable = [...VESTIBULAR_SURFACES, ...palatinoSurfaces];
    applicable.forEach(surface => {
      chartData[`bop_${tooth}_${surface}`] = m.sangrado ? '1' : '0';
      chartData[`pi_${tooth}_${surface}`] = m.placa ? '1' : '0';
    });
  });

  return chartData;
}
