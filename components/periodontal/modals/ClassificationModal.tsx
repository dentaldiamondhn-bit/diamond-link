'use client';

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import { classifyAllTeeth } from '@/lib/utils/periodontalAnalysis';
import {
  buildDiagnosisText,
  calculateAgeAt,
  ClassificationDetails,
  computeAutoSuggestions,
  getGroupPrefix,
  resolveClassification,
} from '@/lib/utils/periodontalClassification';
import type { Patient } from '@/types/patient';

interface ClassificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

interface MatrixCellData {
  id: string;
  label: React.ReactNode;
  colSpan?: number;
}

const STAGE_HEADERS = [
  { id: 'stage-1', title: 'Estadio I', subtitle: 'Periodontitis inicial' },
  { id: 'stage-2', title: 'Estadio II', subtitle: 'Periodontitis moderada' },
  { id: 'stage-3', title: 'Estadio III', subtitle: 'Periodontitis severa con potencial para mayor pérdida dental' },
  { id: 'stage-4', title: 'Estadio IV', subtitle: 'Periodontitis avanzada con extensa pérdida dental y potencial para la pérdida de la dentición' },
];

const SEVERITY_ROWS: MatrixCellData[][] = [
  [
    { id: 'interproximal-al-stage-1', label: '1–2 mm' },
    { id: 'interproximal-al-stage-2', label: '3–4 mm' },
    { id: 'interproximal-al-stage-3', label: '≥ 5 mm' },
    { id: 'interproximal-al-stage-4', label: '≥ 5 mm' },
  ],
  [
    { id: 'radiographic-bl-stage-1', label: 'Tercio coronal (< 15%)' },
    { id: 'radiographic-bl-stage-2', label: 'Tercio coronal (15–33%)' },
    { id: 'radiographic-bl-stage-4', label: 'Tercio medio a apical', colSpan: 2 },
  ],
  [
    { id: 'tooth-loss-stage-2', label: 'Sin pérdida dental debida a periodontitis', colSpan: 2 },
    { id: 'tooth-loss-stage-3', label: 'Pérdida dental debida a periodontitis de ≤ 4 dientes' },
    { id: 'tooth-loss-stage-4', label: 'Pérdida dental debida a periodontitis de ≥ 5 dientes' },
  ],
];

const SEVERITY_CRITERIA = [
  'Pérdida de inserción interdental en el sitio de mayor pérdida',
  'Pérdida ósea radiográfica',
  'Pérdida dental',
];

const COMPLEXITY_CELLS: MatrixCellData[] = [
  { id: 'complexity-stage-1', label: 'Profundidad máxima de sondaje ≤ 4 mm · Pérdida ósea mayoritariamente horizontal' },
  { id: 'complexity-stage-2', label: 'Profundidad máxima de sondaje ≤ 5 mm · Pérdida ósea mayoritariamente horizontal' },
  { id: 'complexity-stage-3', label: 'Además de la complejidad del Estadio II: PD ≥ 6 mm · Pérdida ósea vertical ≥ 3 mm · Furcación Grado II o III · Defecto moderado del reborde' },
  { id: 'complexity-stage-4', label: 'Además de la complejidad del Estadio III: necesidad de rehabilitación compleja (disfunción masticatoria · movilidad ≥ Grado 2 · defecto severo del reborde · colapso de mordida · < 20 dientes remanentes)' },
];

const EXTENT_CELLS: MatrixCellData[] = [
  { id: 'extent-distribution-1', label: 'Localizado (< 30% de los dientes)' },
  { id: 'extent-distribution-2', label: 'Generalizado (≥ 30% de los dientes)' },
  { id: 'extent-distribution-3', label: 'Patrón de molares/incisivos' },
];

const GRADE_HEADERS = [
  { id: 'grade-a', title: 'Grado A', subtitle: 'Tasa lenta de progresión' },
  { id: 'grade-b', title: 'Grado B', subtitle: 'Tasa moderada de progresión' },
  { id: 'grade-c', title: 'Grado C', subtitle: 'Tasa rápida de progresión' },
];

const LONGITUDINAL_CELLS: MatrixCellData[] = [
  { id: 'longitudinal-bl-al-grade-a', label: 'Evidencia de no pérdida durante 5 años' },
  { id: 'longitudinal-bl-al-grade-b', label: 'Evidencia de < 2 mm de pérdida durante 5 años' },
  { id: 'longitudinal-bl-al-grade-c', label: 'Evidencia de ≥ 2 mm de pérdida durante 5 años' },
];

const BL_AGE_CELLS: MatrixCellData[] = [
  { id: 'bl-age-grade-a', label: '< 0.25' },
  { id: 'bl-age-grade-b', label: '0.25 – 1.00' },
  { id: 'bl-age-grade-c', label: '> 1.00' },
];

const PHENOTYPE_CELLS: MatrixCellData[] = [
  { id: 'phenotype-grade-a', label: 'Fuertes depósitos de biopelícula con bajos niveles de destrucción' },
  { id: 'phenotype-grade-b', label: 'Destrucción acorde a los depósitos de biopelícula' },
  { id: 'phenotype-grade-c', label: 'La destrucción supera las expectativas dados los depósitos de biopelícula · patrón de progresión rápida o enfermedad de aparición temprana' },
];

const SMOKING_CELLS: MatrixCellData[] = [
  { id: 'smoking-grade-a', label: 'No fumador' },
  { id: 'smoking-grade-b', label: 'Fumador (< 10 cig/día)' },
  { id: 'smoking-grade-c', label: 'Fumador (≥ 10 cig/día)' },
];

const DIABETES_CELLS: MatrixCellData[] = [
  { id: 'diabetes-grade-a', label: 'Sin diabetes, normoglucémico' },
  { id: 'diabetes-grade-b', label: 'Diabetes con HbA1c < 7.0 %' },
  { id: 'diabetes-grade-c', label: 'Diabetes con HbA1c ≥ 7 %' },
];

const STAGE_STYLES: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  2: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  4: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-200',
};

const HEADER_CELL_CLASS =
  'border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-2 py-2 text-left align-top text-[11px] font-semibold text-gray-700 dark:text-gray-200';
const LABEL_CELL_CLASS =
  'border border-gray-300 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-900/60 px-2 py-2 text-left align-top text-[11px] text-gray-600 dark:text-gray-300';

interface ClickableCellProps {
  cell: MatrixCellData;
  active: boolean;
  suggested: boolean;
  onSelect: (cellId: string) => void;
}

function ClickableCell({ cell, active, suggested, onSelect }: ClickableCellProps) {
  const stateClasses = active
    ? 'bg-teal-600 text-white border-teal-700 dark:bg-teal-600 dark:text-white'
    : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-teal-50 dark:hover:bg-gray-700 cursor-pointer';
  const suggestionClasses = suggested && !active ? 'ring-2 ring-inset ring-sky-500' : '';

  return (
    <td
      colSpan={cell.colSpan}
      onClick={() => onSelect(cell.id)}
      className={`border border-gray-300 dark:border-gray-600 px-2 py-2 align-top text-[11px] leading-snug transition-colors ${stateClasses} ${suggestionClasses}`}
    >
      {cell.label}
    </td>
  );
}

export function ClassificationModal({ open, onOpenChange, patient = null }: ClassificationModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);

  const selection: ClassificationDetails = useMemo(
    () => (chartData.clasificacion?.details ?? {}) as ClassificationDetails,
    [chartData.clasificacion],
  );

  const age = useMemo(
    () => calculateAgeAt(patient?.fecha_nacimiento, chartData.date),
    [patient?.fecha_nacimiento, chartData.date],
  );

  const suggestions = useMemo(
    () => computeAutoSuggestions(chartData, age, patient),
    [chartData, age, patient],
  );

  const suggestedCellIds = useMemo(
    () => new Set(suggestions.map(s => s.cellId)),
    [suggestions],
  );

  const resolved = useMemo(() => resolveClassification(selection), [selection]);
  const diagnosis = useMemo(() => buildDiagnosisText(resolved), [resolved]);
  const toothClassifications = useMemo(
    () => classifyAllTeeth(chartData).filter(item => item.stage > 0),
    [chartData],
  );

  if (!open) return null;

  const handleSelect = (cellId: string) => {
    const group = getGroupPrefix(cellId);
    const next: ClassificationDetails = { ...selection };
    if (next[group] === cellId) {
      delete next[group];
    } else {
      next[group] = cellId;
    }
    updateField('clasificacion', { details: next });
  };

  const patientInfo = patient
    ? [
        patient.nombre_completo,
        age !== null ? `nac. ${patient.fecha_nacimiento} (${age} años)` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className="relative z-50 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Clasificación de las Enfermedades Periodontales
            </h2>
            {patientInfo && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{patientInfo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-800 dark:bg-teal-900/20">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <b>Diagnóstico:</b>{' '}
              <span className="font-semibold">
                {diagnosis ?? 'Determine al menos un estadio.'}
              </span>
            </p>
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Estadio de Periodontitis
              </h3>
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th colSpan={2} className={HEADER_CELL_CLASS}>
                      Estadio de Periodontitis
                    </th>
                    {STAGE_HEADERS.map(header => (
                      <th key={header.id} className={HEADER_CELL_CLASS}>
                        {header.title}
                        <span className="mt-1 block font-normal text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                          {header.subtitle}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowSpan={3} className={`${LABEL_CELL_CLASS} font-semibold`}>
                      Severidad
                    </td>
                    <td className={LABEL_CELL_CLASS}>{SEVERITY_CRITERIA[0]}</td>
                    {SEVERITY_ROWS[0].map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td className={LABEL_CELL_CLASS}>{SEVERITY_CRITERIA[1]}</td>
                    {SEVERITY_ROWS[1].map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td className={LABEL_CELL_CLASS}>{SEVERITY_CRITERIA[2]}</td>
                    {SEVERITY_ROWS[2].map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={2} className={`${LABEL_CELL_CLASS} font-semibold`}>
                      Complejidad
                    </td>
                    {COMPLEXITY_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Extensión y Distribución
              </h3>
              <table className="w-full border-collapse table-fixed">
                <tbody>
                  <tr>
                    <td className={LABEL_CELL_CLASS}>Descripción adicional del estadio</td>
                    {EXTENT_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Grado de Periodontitis
              </h3>
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th colSpan={3} className={HEADER_CELL_CLASS}>
                      Grado de Periodontitis
                    </th>
                    {GRADE_HEADERS.map(header => (
                      <th key={header.id} className={HEADER_CELL_CLASS}>
                        {header.title}
                        <span className="mt-1 block font-normal text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                          {header.subtitle}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td rowSpan={2} className={`${LABEL_CELL_CLASS} font-semibold`}>
                      Criterios Principales
                    </td>
                    <td colSpan={2} className={LABEL_CELL_CLASS}>
                      Evidencia directa de progresión — datos longitudinales (pérdida ósea radiográfica o pérdida de inserción)
                    </td>
                    {LONGITUDINAL_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={2} className={LABEL_CELL_CLASS}>
                      Evidencia indirecta de progresión — pérdida ósea (%) por edad
                    </td>
                    {BL_AGE_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td colSpan={3} className={LABEL_CELL_CLASS}>
                      Fenotipo
                    </td>
                    {PHENOTYPE_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td rowSpan={2} className={`${LABEL_CELL_CLASS} font-semibold`}>
                      Modificadores
                    </td>
                    <td rowSpan={2} className={LABEL_CELL_CLASS}>
                      Factores de Riesgo
                    </td>
                    <td className={LABEL_CELL_CLASS}>Tabaquismo</td>
                    {SMOKING_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                  <tr>
                    <td className={LABEL_CELL_CLASS}>Diabetes</td>
                    {DIABETES_CELLS.map(cell => (
                      <ClickableCell
                        key={cell.id}
                        cell={cell}
                        active={selection[getGroupPrefix(cell.id)] === cell.id}
                        suggested={suggestedCellIds.has(cell.id)}
                        onSelect={handleSelect}
                      />
                    ))}
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-5 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-900/20">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                Sugerencias automáticas del periodontograma
              </p>
              <ul className="space-y-1">
                {suggestions.map(suggestion => (
                  <li key={suggestion.cellId} className="text-xs text-gray-700 dark:text-gray-200">
                    • {suggestion.text}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                Las celdas marcadas con borde azul corresponden a estas sugerencias; la selección final es del clínico.
              </p>
            </div>
          )}

          <details className="mt-5 rounded-md border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Desglose por diente (referencia)
            </summary>
            <div className="px-4 pb-3">
              {toothClassifications.length === 0 ? (
                <p className="py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                  Ningún diente cumple criterios de periodontitis con los datos registrados.
                </p>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {['Diente', 'Estadío', 'Criterios'].map(header => (
                        <th
                          key={header}
                          className="border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {toothClassifications.map(item => (
                      <tr key={item.tooth}>
                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-center font-bold text-gray-900 dark:text-white">
                          {item.tooth}
                        </td>
                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-1">
                          <span className={`rounded px-2 py-0.5 font-semibold ${STAGE_STYLES[item.stage]}`}>
                            {item.label}
                          </span>
                        </td>
                        <td className="border border-gray-200 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-200">
                          {item.reasons.join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>

          <p className="mt-5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            Tonetti, M. S., Greenwell, H., Kornman, K. S. (2018). Staging and grading of periodontitis:
            Framework and proposal of a new classification and case definition. <i>Journal of Periodontology</i>, 89(1), 159-172.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            La clasificación se guarda junto con el estudio periodontal.
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
