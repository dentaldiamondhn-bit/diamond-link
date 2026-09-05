import { PatientCaseLinkType } from '@/types/chat';
import type { TranslationKey } from '@/chat/i18n/translations';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import type { CompletedTreatment } from '@/services/completedTreatmentService';
import { OdontogramPilotService } from '@/services/odontogramPilotService';
import type { OdontogramData } from '@/types/odontogram';
import type { Patient } from '@/types/patient';

export const CARD_KIND_TITLE_KEYS: Record<PatientCaseLinkType, TranslationKey> = {
  consent: 'patientContactCard',
  odontogram: 'odontogramSnapshotCard',
  treatment: 'treatmentSummaryCard',
  event: 'patientCase',
  presupuesto: 'patientCase',
  payment: 'patientCase',
  general: 'patientCase',
};

export interface ToothStatus {
  toothNumber: string;
  status: string;
  color: string;
}

export interface TreatmentRow {
  id: string;
  date: string;
  procedure: string;
  cdt: string;
  qty: number;
  payment?: number;
  doctor?: string | null;
}

const ODONT_STATUS_COLORS: Record<string, string> = {
  sano: '#FFFFFF',
  caries: '#FF5722',
  cariado: '#FF5722',
  'caries-restauracion': '#FFC107',
  obturado: '#2196F3',
  extraccion: '#E91E63',
  extraccionind: '#E91E63',
  ausente: '#9E9E9E',
  corona: '#795548',
  puente: '#4E342E',
  implante: '#3F51B5',
  endodoncia: '#5D4037',
  fracturado: '#FF9800',
  sellante: '#26C6DA',
  fistula: '#7E57C2',
  abrasion: '#4FC3F7',
  erosion: '#FF8A65',
  hipoplasia: '#FFA726',
  mancha: '#FDD835',
  apilado: '#455A64',
  atricion: '#FFD54F',
  carilla: '#00BCD4',
  resina: '#8BC34A',
  raiz: '#5E35B1',
  temporal: '#9C27B0',
  protesis: '#8D6E63',
  amalgama: '#607D8B',
  movilidad: '#FDD835',
  abfraccion: '#BA68C8',
  erupcion: '#FF7043',
  odontopatia: '#CDDC39',
  txpulpar: '#1976D2',
  placa: '#FFEB3B',
};

const ODONT_STATUS_RANK: Record<string, number> = {
  sano: 0,
  sellante: 1,
  placa: 1,
  abrasion: 1,
  erosion: 1,
  hipoplasia: 1,
  mancha: 1,
  atricion: 1,
  erupcion: 1,
  apilado: 1,
  movilidad: 2,
  carilla: 2,
  resina: 2,
  temporal: 2,
  amalgama: 2,
  'caries-restauracion': 2,
  obturado: 3,
  corona: 3,
  protesis: 3,
  puente: 3,
  implante: 3,
  endodoncia: 4,
  txpulpar: 4,
  odontopatia: 4,
  fistula: 4,
  raiz: 5,
  caries: 5,
  cariado: 5,
  fracturado: 5,
  extraccion: 6,
  extraccionind: 6,
  ausente: 6,
};

function rawStatus(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.estado === 'string' && record.estado) return record.estado;
  return null;
}

function pickStatus(diente: Record<string, any> | undefined): { status: string; color: string } {
  if (!diente || typeof diente !== 'object') {
    return { status: 'sano', color: ODONT_STATUS_COLORS.sano };
  }

  const candidates: string[] = [];
  if (typeof diente.estado === 'string' && diente.estado) candidates.push(diente.estado);

  const central = rawStatus(diente.central);
  if (central) candidates.push(central);

  const cuadrantes = diente.cuadrantes;
  if (cuadrantes && typeof cuadrantes === 'object') {
    for (const value of Object.values(cuadrantes) as unknown[]) {
      if (typeof value === 'string' && value) candidates.push(value);
      else {
        const face = rawStatus(value);
        if (face) candidates.push(face);
      }
    }
  }

  const caras = diente.caras;
  if (caras && typeof caras === 'object') {
    for (const value of Object.values(caras) as unknown[]) {
      const face = rawStatus(value);
      if (face) candidates.push(face);
    }
  }

  if (candidates.length === 0) {
    return { status: 'sano', color: ODONT_STATUS_COLORS.sano };
  }

  const status = candidates.reduce((worst, current) =>
    (ODONT_STATUS_RANK[current] ?? 0) > (ODONT_STATUS_RANK[worst] ?? 0) ? current : worst
  );

  return { status, color: ODONT_STATUS_COLORS[status] || '#6b7280' };
}

export function buildTeethStatus(datos: OdontogramData | null | undefined): ToothStatus[] {
  if (!datos || !datos.dientes || typeof datos.dientes !== 'object') return [];

  return Object.entries(datos.dientes)
    .map(([toothNumber, diente]) => {
      const { status, color } = pickStatus(diente as Record<string, any>);
      return { toothNumber, status, color };
    })
    .sort((a, b) => Number(a.toothNumber) - Number(b.toothNumber));
}

export function buildTreatmentRows(treatments: CompletedTreatment[]): {
  rows: TreatmentRow[];
  totals: { moneda: string; total: number }[];
} {
  const rows: TreatmentRow[] = [];
  const totals: Record<string, number> = {};

  for (const treatment of treatments) {
    const moneda = treatment.moneda || 'NIO';
    totals[moneda] = (totals[moneda] || 0) + (treatment.total_final || 0);

    const items = treatment.tratamientos_realizados || [];
    if (items.length === 0) {
      rows.push({
        id: treatment.id,
        date: treatment.fecha_cita || '-',
        procedure: treatment.estado.replaceAll('_', ' ') || '-',
        cdt: '-',
        qty: 0,
      });
      continue;
    }
    for (const item of items) {
      rows.push({
        id: item.id,
        date: treatment.fecha_cita || '-',
        procedure: item.nombre_tratamiento || '-',
        cdt: item.codigo_tratamiento || '-',
        qty: item.cantidad || 0,
        payment:
          item.precio_final != null
            ? Math.round(item.precio_final * (item.cantidad || 0) * 100) / 100
            : undefined,
        doctor: item.doctor_name,
      });
    }
  }

  return {
    rows,
    totals: Object.entries(totals).map(([moneda, total]) => ({ moneda, total })),
  };
}

export async function buildPatientCardMetadata(
  patient: Patient,
  linkType: PatientCaseLinkType,
  scope: Record<string, any>
): Promise<Record<string, any>> {
  const metadata: Record<string, any> = { ...scope, patient: buildPatientSnapshot(patient) };
  const pacienteId = patient.paciente_id;

  if (linkType === PatientCaseLinkType.TREATMENT && scope.includeTreatments) {
    try {
      const treatments = await CompletedTreatmentService.getCompletedTreatmentsByPatientId(pacienteId);
      const { rows, totals } = buildTreatmentRows(treatments);
      metadata.treatments = rows.slice(0, 60);
      metadata.treatmentsCount = rows.length;
      metadata.treatmentsTotals = totals;
    } catch (error) {
      console.error('Error building treatment card metadata:', error);
      metadata.treatments = [];
      metadata.treatmentsCount = 0;
      metadata.treatmentsTotals = [];
    }
  }

  if (linkType === PatientCaseLinkType.ODONTOGRAM && scope.includeOdontogram) {
    try {
      const odontogram = await OdontogramPilotService.getActiveOdontogram(pacienteId);
      if (odontogram) {
        metadata.teethStatus = buildTeethStatus(odontogram.datos_odontograma);
        metadata.odontogramVersion = odontogram.version;
        metadata.odontogramDate =
          odontogram.datos_odontograma?.informacion_general?.fecha || odontogram.fecha_creacion || '';
        const datos = odontogram.datos_odontograma;
        metadata.odontogramType = datos?.tipo || null;
        metadata.odontogramPlanned = datos?.tratamientos_planificados?.length || 0;
        metadata.odontogramDiagnostics = datos?.diagnosticos?.length || 0;
        metadata.odontogramGingivitis = datos?.gingivitis?.length || 0;
        metadata.odontogramMordidas = datos?.mordidas || [];
      } else {
        metadata.teethStatus = [];
      }
    } catch (error) {
      console.error('Error building odontogram card metadata:', error);
      metadata.teethStatus = [];
    }
  }

  return metadata;
}

export function buildPatientSnapshot(patient: Patient): Record<string, any> {
  return {
    paciente_id: patient.paciente_id,
    nombre_completo: patient.nombre_completo,
    numero_identidad: patient.numero_identidad,
    telefono: patient.telefono,
    email: patient.email,
    doctor: patient.doctor,
    alergias: patient.alergias,
  };
}

export function getPatientAge(
  fechaNacimiento?: string | null,
  fallbackEdad?: number
): number | null {
  if (fechaNacimiento) {
    const dob = new Date(fechaNacimiento);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age -= 1;
      }
      if (age >= 0) return age;
    }
  }
  return typeof fallbackEdad === 'number' && Number.isFinite(fallbackEdad)
    ? fallbackEdad
    : null;
}

export function resolveCardPatient(
  input?:
    | {
        patient?: unknown;
        metadata?: Record<string, any> | null;
        title?: string | null;
      }
    | Array<{ patient?: unknown; metadata?: Record<string, any> | null; title?: string | null }>
    | null
    | undefined
): Patient {
  const link = Array.isArray(input) ? input[0] : input;
  const embedded = link?.patient;
  const snapshot = link?.metadata?.patient;
  const raw =
    embedded && typeof embedded === 'object' && 'nombre_completo' in embedded
      ? (embedded as Record<string, any>)
      : snapshot && typeof snapshot === 'object'
      ? (snapshot as Record<string, any>)
      : null;
  if (raw) return raw as unknown as Patient;
  return {
    nombre_completo: link?.title || '',
    numero_identidad: '',
    paciente_id: '',
    tipo_identificacion: 'HN',
    sexo: 'masculino',
    tipo_sangre: 'Desconocido',
    direccion: '',
    estado_civil: 'Desconocido',
    contacto_emergencia: '',
    contacto_telefono: '',
    enfermedades: '',
    alergias: '',
    medicamentos: '',
    hospitalizaciones: '',
    cirugias: '',
    antecedentes_familiares: '',
    fuma: 'no',
    alcohol: 'no',
    drogas: 'no',
    doctor: 'otro',
    fecha_inicio: new Date().toISOString().split('T')[0],
    seguro: 'Ninguno',
    contacto: '',
    escolaridad: '',
    trabajo: '',
    medico_cabecera: '',
    otro_doctor: '',
    otra_identificacion: '',
    rep_numero_identidad: '',
    rep_tipo_identificacion: 'HN',
    rep_otro_tipo_identificacion: '',
    rep_celular: '',
    codigopaisrepresentante: '',
    rep_pais_codigo: '',
    codigopaisemergencia: '',
    contacto_pais_codigo: '',
    representante_legal: '',
    parentesco: 'otro',
    apodo: '',
    enfermedades_sistemicas_texto: '',
    pediatra_otorrinolaringologo: '',
    pediatra: '',
    psicologo: '',
    otro_medico: '',
    frecuencia_cepillado_detalle: '',
    cepillado_acompanado: '',
    peso: 0,
    talla: 0,
    tipo_alimentacion: '',
    momentos_azucar: '',
    edad: 0,
    edad_al_momento_consulta: 0,
    fecha_nacimiento: new Date().toISOString().split('T')[0],
    otro_tipo_identificacion: '',
    otro_genero: '',
    tipo_droga: '',
    drogas_frecuencia: 'Ocasional',
    alcohol_frecuencia: 'Ocasional',
    fuma_cantidad: 0,
    fuma_frecuencia: 'Ocasional',
    embarazo: 'no',
    semanas_embarazo: 0,
    embarazo_fecha_fin: '',
    embarazo_activo: false,
    vacunas: '',
    observaciones_medicas: '',
    poliza: '',
    otro_seguro: '',
    codigopais: '',
    pais_codigo: '',
  } as unknown as Patient;
}