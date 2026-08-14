// Label translations for orthodontic enum values stored in Supabase
// (values are stored as snake_case keys; display uses human-readable labels).

export const MORDIDA_LABELS: Record<string, string> = {
  clase_i: 'Clase I',
  clase_ii: 'Clase II',
  clase_ii_division_1: 'Clase II División 1',
  clase_ii_division_2: 'Clase II División 2',
  clase_iii: 'Clase III',
  mordida_abierta: 'Mordida abierta',
  mordida_abierta_anterior: 'Mordida abierta anterior',
  mordida_abierta_posterior: 'Mordida abierta posterior',
  mordida_cruzada: 'Mordida cruzada',
  mordida_cruzada_anterior: 'Mordida cruzada anterior',
  mordida_cruzada_posterior: 'Mordida cruzada posterior',
  mordida_profunda: 'Mordida profunda',
};

export const APARATO_LABELS: Record<string, string> = {
  brackets_metalicos: 'Brackets metálicos',
  brackets_ceramicos: 'Brackets cerámicos',
  brackets_zafiro: 'Brackets de zafiro',
  invisalign: 'Invisalign',
  aparato_removible: 'Aparato removible',
  expansion_palatina: 'Expansión palatina',
  mantenedor_espacio: 'Mantenedor de espacio',
};

export const RADIOGRAFIAS_LABELS: Record<string, string> = {
  panoramica: 'Panorámica',
  periapical: 'Periapical',
  oclusal: 'Oclusal',
  lateral_craneo: 'Lateral de cráneo',
  todas: 'Todas',
};

export const MODELOS_LABELS: Record<string, string> = {
  si: 'Sí',
  no: 'No',
  en_proceso: 'En proceso',
};

export const RETENEDOR_TIPO_LABELS: Record<string, string> = {
  fijo: 'Fijo',
  removible: 'Removible',
  hawley: 'Hawley',
  hawley_convencional: 'Hawley Convencional',
  hawley_arco_continuo: 'Hawley Arco Continuo',
  hawley_arco_continuo_banda_anterior: 'Hawley Arco Continuo Banda Anterior',
  invisible: 'Invisible',
  sin_retenedor: 'Sin retenedor',
};

export const RETENEDOR_USO_LABELS: Record<string, string> = {
  tiempo_completo: 'Tiempo completo',
  noche: 'Noche',
  ocasional: 'Ocasional',
  no_usa: 'No lo usa',
};

export const translateLabel = (value: string, labels: Record<string, string>): string =>
  labels[value] || value;

export const translateMordida = (value: string): string => translateLabel(value, MORDIDA_LABELS);
export const translateAparato = (value: string): string => translateLabel(value, APARATO_LABELS);
export const translateModelos = (value: string): string => translateLabel(value, MODELOS_LABELS);

export const translateRadiografias = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const parts = Array.isArray(value)
    ? value.map((item) => String(item))
    : String(value).split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.map((part) => translateLabel(part, RADIOGRAFIAS_LABELS)).join(', ');
};

export const formatRetainer = (tipo: string, uso?: string): string => {
  const tipoLabel = translateLabel(tipo, RETENEDOR_TIPO_LABELS);
  return uso ? `${tipoLabel} · ${translateLabel(uso, RETENEDOR_USO_LABELS)}` : tipoLabel;
};