export type TipoOdontograma = 'adulto' | 'nino' | 'oleary_adulto' | 'oleary_nino';

export type TipoOdontogramaRegular = 'adulto' | 'nino';

export type TipoOdontogramaOleary = 'oleary_adulto' | 'oleary_nino';

export function esLayoutOleary(tipo: TipoOdontograma): tipo is TipoOdontogramaOleary {
  return tipo === 'oleary_adulto' || tipo === 'oleary_nino';
}

export function esLayoutRegular(tipo: TipoOdontograma): tipo is TipoOdontogramaRegular {
  return tipo === 'adulto' || tipo === 'nino';
}

export function esLayoutDenticionAdulta(tipo: TipoOdontograma): tipo is 'adulto' | 'oleary_adulto' {
  return tipo === 'adulto' || tipo === 'oleary_adulto';
}

export function etiquetaTipoOdontograma(tipo: TipoOdontograma): string {
  switch (tipo) {
    case 'adulto':
      return 'Adulto';
    case 'nino':
      return 'Niño';
    case 'oleary_adulto':
      return "O'Leary Adulto";
    case 'oleary_nino':
      return "O'Leary Niño";
  }
}

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
  return tipo === 'adulto' || tipo === 'nino' || tipo === 'oleary_adulto' || tipo === 'oleary_nino';
}

export function obtenerTipoOdontograma(
  datos: { tipo?: unknown } | null | undefined,
): TipoOdontograma {
  const tipo = datos?.tipo;
  return esTipoOdontogramaValido(tipo) ? tipo : 'adulto';
}

export function obtenerTipoLayoutOleary(registro: RegistroOdontograma): TipoOdontogramaOleary {
  return registro.datos_odontograma?.tipo === 'oleary_nino' ? 'oleary_nino' : 'oleary_adulto';
}

export function filtrarRegistrosPorTipo(
  historial: RegistroOdontograma[],
  tipo: TipoOdontogramaRegular,
): RegistroOdontograma[] {
  return historial.filter((registro) => obtenerTipoOdontograma(registro.datos_odontograma) === tipo);
}

export function filtrarRegistrosOlearyPorTipo(
  historial: RegistroOdontograma[],
  tipo: TipoOdontogramaOleary,
): RegistroOdontograma[] {
  return historial.filter((registro) => obtenerTipoLayoutOleary(registro) === tipo);
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

export function obtenerRegistroActualOleary(
  historial: RegistroOdontograma[],
  tipo: TipoOdontogramaOleary,
): RegistroOdontograma | undefined {
  return ordenarPorVersionDesc(filtrarRegistrosOlearyPorTipo(historial, tipo))[0];
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
  tipoPreferido?: TipoOdontograma | null,
): RegistroOdontograma | undefined {
  if (!Number.isFinite(version)) {
    return undefined;
  }

  const buscarEn = (historial: RegistroOdontograma[]) =>
    historial.find((registro) => registro.version === version);

  const preferidoEsOleary = tipoPreferido ? esLayoutOleary(tipoPreferido) : false;
  const primero = preferidoEsOleary ? historialOleary : historialRegular;
  const segundo = preferidoEsOleary ? historialRegular : historialOleary;

  return buscarEn(primero) ?? buscarEn(segundo);
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
  tipo: TipoOdontogramaOleary,
): EntradaHistorialOdontograma[] {
  return ordenarPorVersionDesc(filtrarRegistrosOlearyPorTipo(registrosOleary, tipo)).map((registro, index) =>
    construirEntrada(registro, tipo, index === 0),
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
      tipo: obtenerTipoLayoutOleary(registro),
      fecha: fechaComoNumero(registro.fecha_creacion),
    })),
  ];

  if (candidatos.length === 0) {
    return null;
  }

  return candidatos.reduce((mejor, candidato) => (candidato.fecha > mejor.fecha ? candidato : mejor)).tipo;
}
