/**
 * Puerto del generador de URL del "Código QR" del sitio de referencia
 * (periodontalchart-online.com, js/qrcode_modal.js).
 *
 * El sitio codifica el periodontograma completo en una cadena de 1800 caracteres:
 * exactamente 900 claves en un orden fijo, cada valor redondeado + 50 y rellenado
 * a 2 dígitos ("same as decoder.js" — el decodificador vive en el visor público
 * /api/?i=... del sitio). Escanear el QR abre el periodontograma completo e
 * interactivo en el visor del sitio de referencia, sin registro ni auth.
 *
 * Motor autocontenido (sin imports) para poder ejecutarlo con node --test.
 */

export const PERIO_QR_TARGET_BASE = 'https://www.periodontalchart-online.com/api/';

/** Orden de dientes del codificador original: 18→11, 28→21, 38→31, 48→41. */
export const PERIO_QR_TEETH: readonly number[] = [
  18, 17, 16, 15, 14, 13, 12, 11,
  28, 27, 26, 25, 24, 23, 22, 21,
  38, 37, 36, 35, 34, 33, 32, 31,
  48, 47, 46, 45, 44, 43, 42, 41,
];

/** Claves de furcación por diente tal como las lista el codificador original. */
const FURCATION_SITES: Partial<Record<number, string[]>> = {
  18: ['b', 'dp', 'mp'],
  17: ['b', 'dp', 'mp'],
  16: ['b', 'dp', 'mp'],
  14: ['dp', 'mp'],
  28: ['b', 'dp', 'mp'],
  27: ['b', 'dp', 'mp'],
  26: ['b', 'dp', 'mp'],
  24: ['dp', 'mp'],
  38: ['b', 'l'],
  37: ['b', 'l'],
  36: ['b', 'l'],
  48: ['b', 'l'],
  47: ['b', 'l'],
  46: ['b', 'l'],
};

const BUCCAL_SITES = ['db', 'b', 'mb'] as const;
const INNER_SITES_UPPER = ['dp', 'p', 'mp'] as const;
const INNER_SITES_LOWER = ['dl', 'l', 'ml'] as const;
/** Bloques del original: [BOP,PI] y [GM,PD], cada par por grupo de sitios. */
const PREFIX_PAIRS = [
  ['bop', 'pi'],
  ['gm', 'pd'],
] as const;

function buildKeySequence(): string[] {
  const keys: string[] = ['initial_exam', 'reevaluation'];
  for (const tooth of PERIO_QR_TEETH) {
    const upper = tooth < 30;
    const inner = upper ? INNER_SITES_UPPER : INNER_SITES_LOWER;
    keys.push(`tooth_${tooth}`, `mobility_${tooth}`);
    for (const site of FURCATION_SITES[tooth] ?? []) {
      keys.push(`furcation_${tooth}_${site}`);
    }
    keys.push(`implant_${tooth}`);
    for (const [first, second] of PREFIX_PAIRS) {
      for (const group of [BUCCAL_SITES, inner]) {
        for (const prefix of [first, second]) {
          for (const site of group) {
            keys.push(`${prefix}_${tooth}_${site}`);
          }
        }
      }
    }
  }
  return keys;
}

/** Secuencia exacta de claves del codificador (900 entradas → 1800 caracteres). */
export const PERIO_QR_KEY_SEQUENCE: readonly string[] = buildKeySequence();

export const PERIO_QR_KEY_COUNT = PERIO_QR_KEY_SEQUENCE.length;

/**
 * Puerto de `encodeChartDataToAPI`: cada valor se redondea, se le suma 50
 * (permite GM negativos hasta −50) y se rellena a 2 dígitos. Los valores
 * ausentes cuentan como 0 → "50".
 */
export function encodeChartDataForQr(chartData: Record<string, unknown>): string {
  let encoded = '';
  for (const key of PERIO_QR_KEY_SEQUENCE) {
    const raw = chartData[key];
    let value = raw === undefined || raw === null ? 0 : Number(raw);
    if (!Number.isFinite(value)) value = 0;
    encoded += String(Math.round(value) + 50).padStart(2, '0');
  }
  return encoded;
}

/**
 * Puerto de `generateAPIUrl`: el visor público del sitio de referencia decodifica
 * `?i=<datos>` y muestra el periodontograma interactivo completo.
 */
export function buildPerioChartUrl(encoded: string, base: string = PERIO_QR_TARGET_BASE): string {
  return `${base}?i=${encoded}`;
}

/** true cuando ninguna clave de la secuencia tiene un valor distinto de 0. */
export function hasRecordedFindings(chartData: Record<string, unknown>): boolean {
  for (const key of PERIO_QR_KEY_SEQUENCE) {
    const raw = chartData[key];
    if (raw === undefined || raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value) && Math.round(value) !== 0) return true;
  }
  return false;
}
