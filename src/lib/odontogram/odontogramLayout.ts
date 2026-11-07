export type TipoOdontograma = 'adulto' | 'nino' | 'oleary_adulto';

export type TipoOdontogramaRegular = Exclude<TipoOdontograma, 'oleary_adulto'>;

export const ESTADOS_APLICAN_TODA_LA_PIEZA: string[] = [
  'ausente',
  'corona',
  'extraccionind',
  'erupcion',
  'implante',
  'protesis',
  'raiz',
];

export const ESTADOS_APLICAN_TODA_LA_PIEZA_OLEARY: string[] = ['ausente'];

export function aplicaATodaLaPieza(estado: string, esOleary: boolean): boolean {
  const estados = esOleary ? ESTADOS_APLICAN_TODA_LA_PIEZA_OLEARY : ESTADOS_APLICAN_TODA_LA_PIEZA;
  return estados.includes(estado);
}

export interface RegistroOdontograma {
  id?: string;
  version: number;
  fecha_creacion?: string | null;
  datos_odontograma?: { tipo?: unknown; fecha?: string } | null;
}

export interface EntradaHistorialOdontograma {
  id: string;
  nombre: string;
  fecha: string;
  version: number;
  esActual: boolean;
  tipo: TipoOdontograma;
}

function esTipoOdontogramaValido(tipo: unknown): tipo is TipoOdontograma {
  return tipo === 'adulto' || tipo === 'nino' || tipo === 'oleary_adulto';
}

export function obtenerTipoOdontograma(
  datos: { tipo?: unknown } | null | undefined,
): TipoOdontograma {
  const tipo = datos?.tipo;
  return esTipoOdontogramaValido(tipo) ? tipo : 'adulto';
}

export function filtrarRegistrosPorTipo(
  historial: RegistroOdontograma[],
  tipo: TipoOdontogramaRegular,
): RegistroOdontograma[] {
  return historial.filter((registro) => obtenerTipoOdontograma(registro.datos_odontograma) === tipo);
}

function ordenarPorVersionDesc(historial: RegistroOdontograma[]): RegistroOdontograma[] {
  return [...historial].sort((a, b) => b.version - a.version);
}

export function obtenerRegistroActual(
  historial: RegistroOdontograma[],
  tipo: TipoOdontogramaRegular,
): RegistroOdontograma | undefined {
  return ordenarPorVersionDesc(filtrarRegistrosPorTipo(historial, tipo))[0];
}

export function buscarRegistroPorId(
  historialRegular: RegistroOdontograma[],
  historialOleary: RegistroOdontograma[],
  id: string,
): RegistroOdontograma | undefined {
  return [...historialRegular, ...historialOleary].find((registro) => registro.id === id);
}

export function buscarRegistroPorVersion(
  historialRegular: RegistroOdontograma[],
  historialOleary: RegistroOdontograma[],
  version: number,
): RegistroOdontograma | undefined {
  if (!Number.isFinite(version)) {
    return undefined;
  }
  return [...historialRegular, ...historialOleary].find((registro) => registro.version === version);
}

function construirEntrada(
  registro: RegistroOdontograma,
  tipo: TipoOdontograma,
  esActual: boolean,
): EntradaHistorialOdontograma {
  return {
    id: registro.id ?? '',
    nombre: `Versión ${registro.version}${esActual ? ' (Actual)' : ''}`,
    fecha: registro.datos_odontograma?.fecha || registro.fecha_creacion || '',
    version: registro.version,
    esActual,
    tipo,
  };
}

export function construirHistorialRegular(
  historial: RegistroOdontograma[],
  tipo: TipoOdontogramaRegular,
): EntradaHistorialOdontograma[] {
  return ordenarPorVersionDesc(filtrarRegistrosPorTipo(historial, tipo)).map((registro, index) =>
    construirEntrada(registro, tipo, index === 0),
  );
}

export function construirHistorialOleary(
  registrosOleary: RegistroOdontograma[],
): EntradaHistorialOdontograma[] {
  return ordenarPorVersionDesc(registrosOleary).map((registro, index) =>
    construirEntrada(registro, 'oleary_adulto', index === 0),
  );
}

function fechaComoNumero(fecha: string | null | undefined): number {
  if (!fecha) {
    return Number.NEGATIVE_INFINITY;
  }
  const tiempo = Date.parse(fecha);
  return Number.isNaN(tiempo) ? Number.NEGATIVE_INFINITY : tiempo;
}

export function detectarTipoPorHistorial(
  pilots: RegistroOdontograma[],
  oleary: RegistroOdontograma[],
): TipoOdontograma | null {
  const candidatos = [
    ...pilots.map((registro) => ({
      tipo: obtenerTipoOdontograma(registro.datos_odontograma),
      fecha: fechaComoNumero(registro.fecha_creacion),
    })),
    ...oleary.map((registro) => ({
      tipo: 'oleary_adulto' as TipoOdontograma,
      fecha: fechaComoNumero(registro.fecha_creacion),
    })),
  ];

  if (candidatos.length === 0) {
    return null;
  }

  return candidatos.reduce((mejor, candidato) => (candidato.fecha > mejor.fecha ? candidato : mejor)).tipo;
}
