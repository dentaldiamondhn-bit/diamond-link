import { getPatientType, type PatientTypeInfo } from '../../utils/patientTypeUtils';
import type { CompletedTreatment } from '../../services/completedTreatmentService';

export function resolvePatientType(
  treatment: CompletedTreatment,
): PatientTypeInfo | null {
  const paciente = treatment.paciente;
  if (!paciente) return null;

  if (paciente.fecha_nacimiento) {
    return getPatientType(paciente);
  }

  if (paciente.edad) {
    return getPatientType({
      ...paciente,
      fecha_nacimiento: new Date(
        Date.now() - paciente.edad * 365.25 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0],
    });
  }

  return null;
}

export function collectTreatmentNames(treatment: CompletedTreatment): string[] {
  const performed = (treatment.tratamientos_realizados ?? []).map(
    (item) => item.nombre_tratamiento,
  );
  const inventory = (treatment.tratamientos_inventario ?? []).map((item) => item.nombre);

  return [...performed, ...inventory].filter(Boolean);
}

export function patientIdentity(treatment: CompletedTreatment): string {
  return treatment.paciente?.numero_identidad || 'Sin identificación';
}

export function patientDoctor(treatment: CompletedTreatment): string {
  return treatment.paciente?.doctor || 'No especificado';
}
