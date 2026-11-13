'use client';

import React from 'react';
import { FDIToothNumber, SurfaceId } from '@/lib/types';
import { getApplicableSurfaces } from '@/lib/utils/chartGeometry';
import { getToothAl, isToothPresent, readFlag, formatMeasurementInput } from '@/lib/utils/periodontalAnalysis';
import { useChartStore } from '@/lib/store/useChartStore';

interface ArchDataGridProps {
  arch: 'upper' | 'lower';
  siteGroup: 'vestibular' | 'palatal' | 'lingual';
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

const ROWS: RowDef[] = [
  { kind: 'mobility', label: 'Movilidad', perSite: false },
  { kind: 'implant', label: 'Implante', perSite: false },
  { kind: 'furcation', label: 'Furcación', perSite: false },
  { kind: 'bop', label: 'Sangrado al sondaje', perSite: true },
  { kind: 'plaque', label: 'Placa', perSite: true },
  { kind: 'gm', label: 'Margen gingival', perSite: true },
  { kind: 'pd', label: 'Profundidad de sondaje', perSite: true },
  { kind: 'al', label: 'Nivel de inserción', perSite: true },
];

// Site data order (live DOM probe of periodontalchart-online.com): Q1/Q4
// teeth (18-11, 48-41) list sites distal-first [db,b,mb]; Q2/Q3 teeth
// (21-28, 31-38) list them mesial-first [mb,b,db]. Grid columns follow
// that left-to-right anatomical order.
const isDistalFirst = (tooth: FDIToothNumber): boolean => {
  const quadrant = Math.floor(tooth / 10);
  return quadrant === 1 || quadrant === 4;
};

const MOBILITY_OPTIONS = ['0', '1', '2', '3'];
const IMPLANT_OPTIONS = ['0', '1', '2', '3'];
const FURCATION_OPTIONS = ['no-evaluado', 'grado1', 'grado2', 'grado3'];

const cellClass =
  'w-full min-w-[34px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-1 py-0.5 text-center text-xs text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60';

const headerCellClass =
  'border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-200';

const labelCellClass =
  'sticky left-0 z-10 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-left text-[11px] font-medium whitespace-nowrap text-gray-700 dark:text-gray-200';

export function ArchDataGrid({ arch, siteGroup, readOnly = false }: ArchDataGridProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);
  const toggleBop = useChartStore(state => state.toggleBop);
  const togglePlaque = useChartStore(state => state.togglePlaque);
  const toggleToothPresence = useChartStore(state => state.toggleToothPresence);
  const setFurcation = useChartStore(state => state.setFurcation);
  const setMobility = useChartStore(state => state.setMobility);
  const cycleImplantStatus = useChartStore(state => state.cycleImplantStatus);
  const isOverlayMode = useChartStore(state => state.isOverlayMode);

  const disabled = readOnly || isOverlayMode;
  const teeth = arch === 'upper' ? UPPER_TEETH : LOWER_TEETH;
  const rows = ROWS;

  const sitesFor = (tooth: FDIToothNumber): SurfaceId[] => {
    const applicable = getApplicableSurfaces(tooth);
    const sites =
      siteGroup === 'vestibular' ? applicable.slice(0, 3) : applicable.slice(3, 6);
    return isDistalFirst(tooth) ? sites.slice().reverse() : sites;
  };

  const subLabelsFor = (tooth: FDIToothNumber): string[] => {
    const distalFirst = isDistalFirst(tooth);
    if (siteGroup === 'vestibular') return distalFirst ? ['VD', 'VMe', 'VM'] : ['VM', 'VMe', 'VD'];
    if (siteGroup === 'palatal') return distalFirst ? ['PD', 'PMe', 'PM'] : ['PM', 'PMe', 'PD'];
    // lingual (lower only)
    return distalFirst ? ['LD', 'LMe', 'LM'] : ['LM', 'LMe', 'LD'];
  };

  const renderNumberCell = (tooth: FDIToothNumber, surface: SurfaceId, field: 'pd' | 'gm' | 'al') => {
    const cellKey = `${field}_${tooth}_${surface}`;

    if (field === 'al') {
      const value = getToothAl(chartData, tooth, surface);
      return (
        <td key={cellKey} className="border border-gray-200 dark:border-gray-600 p-0 text-center">
          <span className="block px-1 py-0.5 text-xs text-gray-500 dark:text-gray-400">
            {value ? value.toFixed(1) : '–'}
          </span>
        </td>
      );
    }

    // Site input validation (js/script.js validateAndFormatInput): GM accepts
    // -99..99 (data-validation-type="-99-99"), PD 0..99 ("0-99"). Both are
    // integers, enforced by formatMeasurementInput.
    const raw = chartData[cellKey];
    const value = raw === undefined || raw === null ? '' : String(raw);

    // The site uses type="text" inputs: a controlled type="number" input
    // cannot hold the intermediate "-" state, so the minus sign is dropped
    // before any digit can follow it. Formatting on every keystroke mirrors
    // the site's own validateAndFormatInput behaviour.
    const handleChange = (next: string) => {
      updateField(cellKey, formatMeasurementInput(next, field));
    };

    const handleBlur = () => {
      // The site resets an empty or lone "-" value to "0" on blur.
      if (value === '' || value === '-') {
        updateField(cellKey, '0');
      }
    };

    return (
      <td key={cellKey} className="border border-gray-200 dark:border-gray-600 p-0">
        <input
          type="text"
          className={cellClass}
          value={value}
          disabled={disabled}
          onChange={event => handleChange(event.target.value)}
          onBlur={handleBlur}
        />
      </td>
    );
  };

  const renderIndexCell = (tooth: FDIToothNumber, type: 'bop' | 'pi', surface: SurfaceId) => {
    const cellKey = `${type}_${tooth}_${surface}`;
    const isActive = readFlag(chartData[cellKey]);

    const colorClass = isActive
      ? type === 'bop'
        ? 'bg-red-500 text-white'
        : 'bg-blue-500 text-white'
      : 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500';

    return (
      <td key={cellKey} className="border border-gray-200 dark:border-gray-600 p-0">
        <button
          type="button"
          className={`w-full py-0.5 text-[10px] font-bold transition-colors disabled:cursor-not-allowed ${colorClass}`}
          disabled={disabled}
          onClick={() => (type === 'bop' ? toggleBop(tooth, surface) : togglePlaque(tooth, surface))}
          title={isActive ? 'Quitar' : 'Marcar'}
        >
          {isActive ? '●' : '○'}
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
    <td key={`select-${tooth}`} colSpan={3} className="border border-gray-200 dark:border-gray-600 p-0">
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
        if (row.kind === 'bop') {
          return sites.map(surface => renderIndexCell(tooth, 'bop', surface));
        }
        if (row.kind === 'plaque') {
          return sites.map(surface => renderIndexCell(tooth, 'pi', surface));
        }
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
          return (
            <td key={`implant-${tooth}`} colSpan={3} className="border border-gray-200 dark:border-gray-600 p-0">
              <button
                type="button"
                className={`w-full py-0.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  String(chartData[`implant_${tooth}`] ?? '0') === '0'
                    ? 'bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400'
                    : String(chartData[`implant_${tooth}`] ?? '0') === '1'
                      ? 'bg-gray-400 text-white'
                      : String(chartData[`implant_${tooth}`] ?? '0') === '2'
                        ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                }`}
                disabled={disabled}
                onClick={() => cycleImplantStatus(tooth)}
                title="Ciclar estado de implante"
              >
                {String(chartData[`implant_${tooth}`] ?? '0') === '0'
                  ? '○'
                  : String(chartData[`implant_${tooth}`] ?? '0') === '1'
                    ? '●'
                    : String(chartData[`implant_${tooth}`] ?? '0') === '2'
                      ? '⚠'
                      : '✓'}
              </button>
            </td>
          );
        case 'furcation':
          return renderSelectCell(
            tooth,
            FURCATION_OPTIONS,
            String(chartData[`furcation_${tooth}_b`] ?? 'no-evaluado'),
            value => setFurcation(tooth, 'b', FURCATION_OPTIONS.indexOf(value) - 1),
          );
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
                colSpan={3}
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
              subLabelsFor(tooth).map((label, subIndex) => (
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