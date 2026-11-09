'use client';

import React from 'react';
import { FDIToothNumber, SurfaceId } from '@/lib/types';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';
import { getToothAl, isToothPresent, readFlag } from '@/lib/utils/periodontalAnalysis';
import { useChartStore } from '@/lib/store/useChartStore';

interface ArchDataGridProps {
  arch: 'upper' | 'lower';
  readOnly?: boolean;
}

const UPPER_TEETH: FDIToothNumber[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];

const LOWER_TEETH: FDIToothNumber[] = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

type RowKind = 'mobility' | 'implant' | 'furcation' | 'bop' | 'plaque' | 'gm' | 'pd' | 'al';

interface RowDef {
  kind: RowKind;
  label: string;
  perSite: boolean;
}

const UPPER_ROWS: RowDef[] = [
  { kind: 'mobility', label: 'Movilidad', perSite: false },
  { kind: 'implant', label: 'Implante', perSite: false },
  { kind: 'furcation', label: 'Furcación', perSite: false },
  { kind: 'bop', label: 'Sangrado al sondaje', perSite: false },
  { kind: 'plaque', label: 'Placa', perSite: false },
  { kind: 'gm', label: 'Margen gingival', perSite: true },
  { kind: 'pd', label: 'Profundidad de sondaje', perSite: true },
  { kind: 'al', label: 'Nivel de inserción', perSite: true },
];

const LOWER_ROWS: RowDef[] = [...UPPER_ROWS].reverse();

const SUB_LABELS_UPPER = ['VM', 'VMe', 'VD', 'PM', 'PMe', 'PD'];
const SUB_LABELS_LOWER = ['VM', 'VMe', 'VD', 'LM', 'LMe', 'LD'];

const MOBILITY_OPTIONS = ['0', '1', '2', '3'];
const IMPLANT_OPTIONS = ['0', '1', '2', '3'];
const FURCATION_OPTIONS = ['no-evaluado', 'grado1', 'grado2', 'grado3'];

const cellClass =
  'w-full min-w-[34px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-1 py-0.5 text-center text-xs text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60';

const headerCellClass =
  'border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-200';

const labelCellClass =
  'sticky left-0 z-10 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-[11px] font-medium whitespace-nowrap text-gray-700 dark:text-gray-200';

export function ArchDataGrid({ arch, readOnly = false }: ArchDataGridProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);
  const toggleToothIndex = useChartStore(state => state.toggleToothIndex);
  const toggleToothPresence = useChartStore(state => state.toggleToothPresence);
  const setFurcation = useChartStore(state => state.setFurcation);
  const setMobility = useChartStore(state => state.setMobility);
  const cycleImplantStatus = useChartStore(state => state.cycleImplantStatus);
  const isOverlayMode = useChartStore(state => state.isOverlayMode);

  const disabled = readOnly || isOverlayMode;
  const teeth = arch === 'upper' ? UPPER_TEETH : LOWER_TEETH;
  const rows = arch === 'upper' ? UPPER_ROWS : LOWER_ROWS;
  const subLabels = arch === 'upper' ? SUB_LABELS_UPPER : SUB_LABELS_LOWER;

  const sitesFor = (tooth: FDIToothNumber): SurfaceId[] => {
    const applicable = getApplicableSurfaces(tooth);
    return [applicable[0], applicable[1], applicable[2], applicable[3], applicable[4], applicable[5]];
  };

  const renderNumberCell = (tooth: FDIToothNumber, surface: SurfaceId, field: 'pd' | 'gm' | 'al') => {
    const key = `${field}_${tooth}_${surface}`;

    if (field === 'al') {
      const value = getToothAl(chartData, tooth, surface);
      return (
        <td key={key} className="border border-gray-200 dark:border-gray-600 p-0 text-center">
          <span className="block px-1 py-0.5 text-xs text-gray-500 dark:text-gray-400">
            {value ? value.toFixed(1) : '–'}
          </span>
        </td>
      );
    }

    const raw = chartData[key];
    const value = raw === undefined || raw === null ? '' : String(raw);

    return (
      <td key={key} className="border border-gray-200 dark:border-gray-600 p-0">
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          max="20"
          className={cellClass}
          value={value}
          disabled={disabled}
          onChange={event => updateField(key, event.target.value === '' ? '' : event.target.value)}
        />
      </td>
    );
  };

  const renderIndexCell = (tooth: FDIToothNumber, type: 'bop' | 'pi') => {
    const sites = getApplicableSurfaces(tooth);
    const positives = sites.filter(surface => readFlag(chartData[`${type}_${tooth}_${surface}`])).length;
    const state = positives === 0 ? 'none' : positives === sites.length ? 'all' : 'some';

    const colorClass =
      state === 'all'
        ? type === 'bop'
          ? 'bg-red-500 text-white'
          : 'bg-blue-500 text-white'
        : state === 'some'
          ? type === 'bop'
            ? 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100'
            : 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
          : 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500';

    return (
      <td key={`${type}-${tooth}`} colSpan={6} className="border border-gray-200 dark:border-gray-600 p-0">
        <button
          type="button"
          className={`w-full py-0.5 text-xs font-semibold transition-colors ${colorClass} disabled:cursor-not-allowed`}
          disabled={disabled}
          onClick={() => toggleToothIndex(tooth, type)}
          title={
            state === 'all'
              ? 'Quitar sangrado al sondaje'
              : state === 'some'
                ? 'Marcar todo el diente'
                : 'Marcar todo el diente'
          }
        >
          {state === 'all' ? '●' : state === 'some' ? '◐' : '○'}
        </button>
      </td>
    );
  };

  const renderSelectCell = (
    tooth: FDIToothNumber,
    options: string[],
    current: string,
    onChange: (value: string) => void,
  ) => (
    <td key={`select-${tooth}-${options.join('-')}`} colSpan={6} className="border border-gray-200 dark:border-gray-600 p-0">
      <select
        className={cellClass}
        value={current}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </td>
  );

  const renderRowCells = (row: RowDef) =>
    teeth.map(tooth => {
      if (row.perSite) {
        const sites = sitesFor(tooth);
        return sites.map(surface => renderNumberCell(tooth, surface, row.kind as 'pd' | 'gm' | 'al'));
      }

      switch (row.kind) {
        case 'mobility':
          return renderSelectCell(
            tooth,
            MOBILITY_OPTIONS,
            String(chartData[`mobility_${tooth}`] ?? '0'),
            value => setMobility(tooth, parseInt(value, 10) || 0),
          );
        case 'implant':
          return renderSelectCell(
            tooth,
            IMPLANT_OPTIONS,
            String(chartData[`implant_${tooth}`] ?? '0'),
            () => cycleImplantStatus(tooth),
          );
        case 'furcation':
          return renderSelectCell(
            tooth,
            FURCATION_OPTIONS,
            String(chartData[`furcation_${tooth}_b`] ?? 'no-evaluado'),
            value => setFurcation(tooth, 'b', FURCATION_OPTIONS.indexOf(value) - 1),
          );
        case 'bop':
          return renderIndexCell(tooth, 'bop');
        case 'plaque':
          return renderIndexCell(tooth, 'pi');
        default:
          return null;
      }
    });

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className={`${labelCellClass} z-20 text-center`}>
              Parámetro
            </th>
            {teeth.map((tooth, index) => (
              <th
                key={`tooth-${tooth}`}
                colSpan={6}
                className={`${headerCellClass} ${index === 7 ? 'border-l-2 border-l-teal-500' : ''}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleToothPresence(tooth)}
                  className={`font-bold ${isToothPresent(chartData, tooth) ? 'text-teal-700 dark:text-teal-300' : 'text-gray-400 line-through'}`}
                  title={
                    isToothPresent(chartData, tooth)
                      ? 'Marcar como ausente'
                      : 'Marcar como presente'
                  }
                >
                  {tooth}
                </button>
              </th>
            ))}
          </tr>
          <tr>
            {teeth.map((tooth, toothIndex) =>
              subLabels.map((label, subIndex) => (
                <th
                  key={`sub-${tooth}-${label}`}
                  className={`${headerCellClass} ${toothIndex === 7 && subIndex === 0 ? 'border-l-2 border-l-teal-500' : ''}`}
                >
                  {label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.kind}>
              <th scope="row" className={labelCellClass}>
                {row.label}
              </th>
              {renderRowCells(row)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
