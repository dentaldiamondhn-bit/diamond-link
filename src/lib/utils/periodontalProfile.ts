// Pure logic for the Perfil (risk profile) and AI Prompt modals.
// Ported from periodontalchart-online.com:
//   - history_renderer.js analyzeJsonData
//   - profile_rendering.js generateStabilityAssessmentText / renderProfileText
//   - aiprompt_renderer.js generateAIPromptText
//
// Self-contained (no imports) so it runs under plain `node --test`, like
// periodontalClassification.ts and periodontalOverview.ts.

export type ProfileChartRecord = Record<string, any>;

export type SmokingStatus = 'raucher' | 'nichtraucher';

// The site's position Besetzt: the tooth switch alone decides, compared as
// its string form ('1' or 1 both pass).
function isBesetzt(rec: ProfileChartRecord, tooth: number): boolean {
  const value = rec[`tooth_${tooth}`];
  return value !== undefined && value !== null && String(value) === '1';
}

const ALL_FDI_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
];

function readNum(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Percentage the site's way: numerator/denominator * 100 rounded to one
// decimal (Math.round(x * 1000) / 10).
function percent(count: number, totalSites: number): number {
  if (!totalSites) return 0;
  return Math.round((count / totalSites) * 1000) / 10;
}

export interface ProfileMetrics {
  totalTeeth: number;
  totalImplants: number;
  totalSites: number;
  pi: number;
  bop: number;
  pd4: number;
  pd5: number;
  pd6: number;
  bopPositiveSites: number;
  piPositiveSites: number;
  furcation2: number;
}

// analyzeJsonData: PI / BOP / PD bucket percentages over six sites per
// position. The denominator is (32 - explicitly switched-off teeth) * 6,
// exactly the site's quirk: positions without a tooth flag still count in
// the denominator but contribute no measurements.
export function analyzeForProfile(rec: ProfileChartRecord): ProfileMetrics {
  let missingTeeth = 0;
  for (const key of Object.keys(rec)) {
    if (key.startsWith('tooth_') && readLooseZero(rec[key])) missingTeeth++;
  }
  const totalTeeth = 32 - missingTeeth;
  const totalSites = totalTeeth * 6;

  let bopSurfaces = 0;
  let piSurfaces = 0;
  let bopPositiveSites = 0;
  let piPositiveSites = 0;
  let pd4 = 0;
  let pd5 = 0;
  let pd6Plus = 0;
  let furcationAdvanced = 0;

  for (const key of Object.keys(rec)) {
    const parts = key.split('_');
    if (parts.length !== 3) continue;
    const prefix = parts[0];
    if (prefix !== 'bop' && prefix !== 'pi' && prefix !== 'pd' && prefix !== 'furcation') {
      continue;
    }

    const tooth = parseInt(parts[1], 10);
    if (!isBesetzt(rec, tooth)) continue;

    const value = rec[key];

    if (prefix === 'bop') {
      if (readNum(value) > 0) bopSurfaces++;
      if (readNum(value) === 1) bopPositiveSites++;
    } else if (prefix === 'pi') {
      if (readNum(value) > 0) piSurfaces++;
      if (readNum(value) === 1) piPositiveSites++;
    } else if (prefix === 'pd') {
      const toothValue = rec[`tooth_${tooth}`];
      if (String(toothValue) === '1') {
        const val = readNum(value);
        if (val === 4) pd4++;
        else if (val === 5) pd5++;
        else if (val >= 6) pd6Plus++;
      }
    } else {
      const val = parseInt(String(value), 10);
      if (val === 2 || val === 3) furcationAdvanced++;
    }
  }

  const totalImplants = ALL_FDI_TEETH.filter(tooth => {
    if (!isBesetzt(rec, tooth)) return false;
    const status = String(rec[`implant_${tooth}`]);
    return ['1', '2', '3'].includes(status);
  }).length;

  return {
    totalTeeth,
    totalImplants,
    totalSites,
    pi: percent(piSurfaces, totalSites),
    bop: percent(bopSurfaces, totalSites),
    pd4: percent(pd4, totalSites),
    pd5: percent(pd5, totalSites),
    pd6: percent(pd6Plus, totalSites),
    bopPositiveSites,
    piPositiveSites,
    furcation2: furcationAdvanced,
  };
}

// jsonData[key] == 0 in the site's loose sense: '0', 0 or empty.
function readLooseZero(value: unknown): boolean {
  const num = readNum(value);
  return String(value) === '0' || num === 0;
}

export interface PatientRiskSource {
  fuma?: 'no' | 'si';
  fuma_cantidad?: number;
  enfermedades?: string;
  enfermedades_sistemicas_texto?: string;
}

// profileValues mapping: the site separates smokers from non-smokers for the
// BOP target; the amount only matters further in staging/grading.
export function getSmokingStatus(patient: PatientRiskSource | null | undefined): SmokingStatus {
  return patient?.fuma === 'si' ? 'raucher' : 'nichtraucher';
}

// No structured diabetes field: detect it from the recorded systemic
// disease free text.
export function detectDiabetes(patient: PatientRiskSource | null | undefined): boolean {
  const texts = [patient?.enfermedades, patient?.enfermedades_sistemicas_texto];
  return texts.some(text => typeof text === 'string' && /diab[ée]t/i.test(text));
}

export const PROFILE_PATIENT_TARGET = 20;
export const PROFILE_BOP_TARGET_SMOKER = 16;
export const PROFILE_BOP_TARGET_NON_SMOKER = 20;

export interface ProfileAssessmentInput {
  pi: number;
  bop: number;
  pd6: number;
  furcation2: number;
  smokingStatus: SmokingStatus;
  diabetes: boolean;
}

export interface ProfileAssessment {
  bopTarget: number;
  stable: boolean;
  deviations: string[];
  risks: string[];
  goals: string[];
  summaryGood: boolean;
  summaryRisks: string | null;
}

// generateStabilityAssessmentText + the summary part of renderProfileText.
// Spanish copy matches the site's lang=es dictionary.
export function buildProfileAssessment(values: ProfileAssessmentInput): ProfileAssessment {
  const { pi, bop, pd6, furcation2, smokingStatus, diabetes } = values;

  const bopTarget = smokingStatus === 'raucher'
    ? PROFILE_BOP_TARGET_SMOKER
    : PROFILE_BOP_TARGET_NON_SMOKER;

  const piOk = pi <= PROFILE_PATIENT_TARGET;
  const bopOk = bop <= bopTarget;
  const pdOk = pd6 === 0;
  const furcationOk = furcation2 === 0;

  const stable = piOk && bopOk && pdOk && furcationOk;

  const deviations: string[] = [];
  if (!piOk) {
    deviations.push(
      `La higiene bucal está en el ${pi}%, lo cual está por encima del objetivo del 20%.`,
    );
  }
  if (!pdOk) {
    deviations.push(`Todavía hay un ${pd6}% de bolsas residuales ≥ 6mm.`);
  }
  if (!furcationOk) {
    deviations.push('Hay furcaciones de Grado 2 o superior presentes.');
  }
  if (!bopOk) {
    deviations.push(`La inflamación (BOP: ${bop}%) está por encima del objetivo (${bopTarget}%).`);
  }

  const risks: string[] = [];
  if (smokingStatus === 'raucher') risks.push('Tabaquismo');
  if (diabetes) risks.push('Diabetes mellitus');

  const piBad = pi > PROFILE_PATIENT_TARGET;
  const pdBad = pd6 > 0;

  const goals: string[] = [];
  if (piBad) {
    goals.push('mejora de la higiene bucal (por debajo del 20%)');
  }
  if (pdBad) {
    goals.push(
      piBad
        ? 'reducción de las bolsas residuales ≥ 6mm mediante tratamiento adicional (siempre que mejore la higiene bucal)'
        : 'reducción de las bolsas residuales ≥ 6mm mediante tratamiento adicional (si la higiene bucal está bien controlada)',
    );
  }
  if (furcation2 > 0) {
    goals.push(
      piBad
        ? 'evaluación de las furcaciones de Grado 2 o 3 respecto a las opciones de corrección quirúrgica (con una higiene bucal mejorada)'
        : 'evaluación de las furcaciones de Grado 2 o 3 respecto a las opciones de corrección quirúrgica (con una buena higiene bucal)',
    );
  }
  if (bop > bopTarget) {
    goals.push(
      pdBad
        ? `reducción de la inflamación por debajo del ${bopTarget}% (después de la reducción previa de las bolsas residuales)`
        : `reducción de la inflamación por debajo del ${bopTarget}% (con la ausencia existente de bolsas profundas)`,
    );
  }

  const summaryGood = goals.length === 0 && risks.length === 0;

  return {
    bopTarget,
    stable,
    deviations,
    risks,
    goals,
    summaryGood,
    summaryRisks: risks.length > 0
      ? `Adicionalmente, existen factores de riesgo (${risks.join(', ')}) que pueden influir en el proceso de curación.`
      : null,
  };
}

export function profileBopText(values: ProfileAssessmentInput, bopTarget: number): string {
  return values.bop <= bopTarget
    ? `La inflamación está dentro del rango recomendado con un valor BOP del ${values.bop}%. Este hallazgo sugiere una situación periodontal actualmente estable.`
    : `La inflamación está elevada con un valor BOP de ${values.bop}% (Objetivo: menos del ${bopTarget}%). Discuta con su profesional dental cómo puede abordarse la inflamación para reducirla.`;
}

export function profilePiText(pi: number): string {
  return pi <= PROFILE_PATIENT_TARGET
    ? `La higiene bucal está bien controlada con un Índice de Placa de ${pi}%. Mantenga su rutina de cuidado actual constantemente.`
    : `La higiene bucal muestra margen de mejora con un Índice de Placa de ${pi}% (Objetivo: por debajo del 20%). Preste mayor atención a su cuidado dental diario y siga las instrucciones recibidas.`;
}

export function profilePdText(pd6: number): string {
  return pd6 === 0
    ? 'No se encontraron bolsas residuales ≥ 6mm, lo que respalda la estabilidad periodontal. Manténgase en el intervalo de mantenimiento recomendado.'
    : `Todavía hay un ${pd6}% de bolsas residuales ≥ 6mm, lo que puede requerir tratamiento adicional. Discuta las posibles opciones de estabilización con su profesional dental.`;
}

export function profileFurcationText(furcation2: number): string {
  return furcation2 > 0
    ? 'Se detectaron furcaciones de Grado 2 o 3, presentando un mayor riesgo de pérdida de dientes. Discuta las medidas adecuadas con su profesional dental.'
    : 'No se detectaron furcaciones de Grado 2 o 3 – un hallazgo favorable respecto a la estabilidad.';
}

export const AI_PROMPT_LANGUAGES: Array<{ code: string; name: string }> = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'rm', name: 'Rumantsch' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'es', name: 'Español' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'sq', name: 'Shqip' },
  { code: 'sr', name: 'Српски' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'bs', name: 'Bosanski' },
  { code: 'mk', name: 'Македонски' },
  { code: 'hu', name: 'Magyar' },
  { code: 'ro', name: 'Română' },
  { code: 'uk', name: 'Українська' },
  { code: 'ar', name: 'العربية' },
];

const AI_PROMPT_INSTRUCTIONS = [
  'Por favor:',
  '- explique al paciente en términos sencillos qué significan estos valores',
  '- señale las conexiones entre la higiene bucal, las bolsas residuales y la inflamación',
  '- señale la necesidad de reducir cualquier factor de riesgo existente, como fumar productos de tabaco, snus o diabetes no controlada',
  '- absténgase de dar recomendaciones médicas o diagnósticos',
  '- use un lenguaje neutral, objetivo y motivador',
].join('\n');

// generateAIPromptText: a copy-paste prompt for a public AI chat service.
export function buildAIPrompt(values: ProfileAssessmentInput, languageCode: string): string {
  const { pi, bop, pd6, furcation2, smokingStatus, diabetes } = values;
  const bopTarget = smokingStatus === 'raucher'
    ? PROFILE_BOP_TARGET_SMOKER
    : PROFILE_BOP_TARGET_NON_SMOKER;

  const riskFactors: string[] = [];
  if (smokingStatus === 'raucher') riskFactors.push('Tabaquismo');
  if (diabetes) riskFactors.push('Diabetes mellitus');

  const lines: string[] = [];
  lines.push(
    'Cree un resumen comprensible y respetuoso de la condición periodontal de un paciente con los siguientes datos:',
  );
  lines.push('');
  lines.push(`Índice de Placa: ${pi}% (Objetivo: <20%)`);
  lines.push(`Profundidades de sondaje ≥ 6mm: ${pd6}%`);
  lines.push(`Sangrado (BOP): ${bop}% (Objetivo: <${bopTarget}%)`);

  const furcationText = furcation2 > 0 ? String(furcation2) : 'ninguno';
  lines.push(`Número de furcaciones afectadas Grado 2 o 3: ${furcationText}`);

  if (riskFactors.length > 0) {
    lines.push(`Otros factores de riesgo: ${riskFactors.join(', ')}`);
  }

  lines.push('');
  lines.push(AI_PROMPT_INSTRUCTIONS);
  lines.push('');

  const language = AI_PROMPT_LANGUAGES.find(item => item.code === languageCode);
  lines.push(`Cree el resumen en este idioma: ${language?.name ?? 'Deutsch'}`);

  return lines.join('\n');
}
