'use client';

import React from 'react';
import { useChartStore } from '@/lib/store/useChartStore';
import { ALL_TEETH, FDIToothNumber, SurfaceId } from '@/lib/types';
import { getTableSiteSurfaces } from '@/lib/constants/surfaces';
import { Input, Select, SelectValue } from '@/components/ui';

const MOBILITY_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: 'I' },
  { value: '2', label: 'II' },
  { value: '3', label: 'III' },
];

interface PeriodontalTableProps {
  readOnly?: boolean;
}

export function PeriodontalTable({ readOnly = false }: PeriodontalTableProps) {
  const chartData = useChartStore((state) => state.chartData);
  const toothMeasurements = useChartStore((state) => state.toothMeasurements);
  const isOverlayMode = useChartStore((state) => state.isOverlayMode);
  const updateField = useChartStore((state) => state.updateField);
  const updateToothMeasurement = useChartStore((state) => state.updateToothMeasurement);
  const toggleToothIndex = useChartStore((state) => state.toggleToothIndex);
  const deleteToothRow = useChartStore((state) => state.deleteToothRow);
  const restoreLastDeletedRow = useChartStore((state) => state.restoreLastDeletedRow);

  const disabled = readOnly || isOverlayMode;

  const measurementIndexFor = (tooth: FDIToothNumber) =>
    toothMeasurements.findIndex(tm => parseInt(tm.diente, 10) === tooth);

  const handleProbingDepth = (
    tooth: FDIToothNumber,
    surface: SurfaceId,
    group: 'vestibular' | 'palatino',
    position: 'mesial' | 'medio' | 'distal',
    rawValue: string
  ) => {
    const value = rawValue === '' ? '' : rawValue;
    updateField(`pd_${tooth}_${surface}`, parseFloat(value) || 0);

    const index = measurementIndexFor(tooth);
    if (index !== -1) {
      updateToothMeasurement(index, `${group}.${position}`, value);
    }
  };

  const handleMobility = (tooth: FDIToothNumber, grade: string) => {
    updateField(`mobility_${tooth}`, grade);

    const index = measurementIndexFor(tooth);
    if (index !== -1) {
      updateToothMeasurement(index, 'movilidad', grade);
    }
  };

  const handleIndexToggle = (tooth: FDIToothNumber, type: 'bop' | 'pi') => {
    toggleToothIndex(tooth, type);
  };

  const handleNote = (tooth: FDIToothNumber, note: string) => {
    updateField(`note_${tooth}`, note);

    const index = measurementIndexFor(tooth);
    if (index !== -1) {
      updateToothMeasurement(index, 'observaciones', note);
    }
  };

  const handleToggleTooth = (tooth: FDIToothNumber) => {
    const key = `tooth_${tooth}`;
    const current = chartData[key] === '1' || chartData[key] === 1;
    updateField(key, current ? '0' : '1');
  };

  const isPresent = (tooth: FDIToothNumber) =>
    chartData[`tooth_${tooth}`] === '1' || chartData[`tooth_${tooth}`] === 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Chart Periodontal</h3>
        <button
          type="button"
          onClick={restoreLastDeletedRow}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Restaurar Último Diente
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th rowSpan={2} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Diente</th>
              <th colSpan={3} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Vestibular</th>
              <th colSpan={3} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Palatino / Lingual</th>
              <th rowSpan={2} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Movilidad</th>
              <th rowSpan={2} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Sangrado</th>
              <th rowSpan={2} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Placa</th>
              <th rowSpan={2} className="px-2 py-2 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">Observaciones</th>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
              {['Mesial', 'Medio', 'Distal'].map(label => (
                <th key={`v-${label}`} className="px-2 py-1 border border-gray-200 dark:border-gray-600 font-medium">{label}</th>
              ))}
              {['Mesial', 'Medio', 'Distal'].map(label => (
                <th key={`p-${label}`} className="px-2 py-1 border border-gray-200 dark:border-gray-600 font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_TEETH.map(tooth => {
              const { vestibular: vestibularSurfaces, palatino: palatinoSurfaces } = getTableSiteSurfaces(tooth);
              const measurementIndex = measurementIndexFor(tooth);
              const present = isPresent(tooth);
              const mobility = String((chartData[`mobility_${tooth}`] as number) || 0);
              const bop = chartData[`bop_${tooth}_b`] === '1' || chartData[`bop_${tooth}_b`] === 1;
              const plaque = chartData[`pi_${tooth}_b`] === '1' || chartData[`pi_${tooth}_b`] === 1;

              return (
                <tr
                  key={tooth}
                  className={`${present ? '' : 'opacity-50'} border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                  data-tooth={tooth}
                >
                  <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => { if (!disabled) handleToggleTooth(tooth); }}
                        disabled={disabled}
                        className={`font-semibold ${present ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}
                      >
                        {tooth}
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!disabled && measurementIndex !== -1) deleteToothRow(measurementIndex); }}
                        disabled={disabled || measurementIndex === -1}
                        title="Eliminar fila"
                        className="text-gray-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>

                  {vestibularSurfaces.map((surface, i) => (
                    <td key={`v-${tooth}-${surface}`} className="px-1 py-1 border border-gray-200 dark:border-gray-600">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={chartData[`pd_${tooth}_${surface}`] || ''}
                        onChange={(e) => handleProbingDepth(tooth, surface, 'vestibular', (['mesial', 'medio', 'distal'] as const)[i], e.target.value)}
                        disabled={disabled}
                        className="h-8 px-1 text-center text-sm"
                      />
                    </td>
                  ))}

                  {palatinoSurfaces.map((surface, i) => (
                    <td key={`p-${tooth}-${surface}`} className="px-1 py-1 border border-gray-200 dark:border-gray-600">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={chartData[`pd_${tooth}_${surface}`] || ''}
                        onChange={(e) => handleProbingDepth(tooth, surface, 'palatino', (['mesial', 'medio', 'distal'] as const)[i], e.target.value)}
                        disabled={disabled}
                        className="h-8 px-1 text-center text-sm"
                      />
                    </td>
                  ))}

                  <td className="px-1 py-1 border border-gray-200 dark:border-gray-600">
                    <Select
                      value={mobility}
                      onValueChange={(value) => handleMobility(tooth, value)}
                      disabled={disabled}
                      className="h-8 px-1 text-center text-sm"
                    >
                      {MOBILITY_OPTIONS.map(option => (
                        <SelectValue key={option.value} value={option.value}>{option.label}</SelectValue>
                      ))}
                    </Select>
                  </td>

                  <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center">
                    <input
                      type="checkbox"
                      checked={bop}
                      onChange={() => { if (!disabled) handleIndexToggle(tooth, 'bop'); }}
                      disabled={disabled}
                      className="h-4 w-4 text-red-500"
                      title="Sangrado al sondaje"
                    />
                  </td>

                  <td className="px-2 py-1 border border-gray-200 dark:border-gray-600 text-center">
                    <input
                      type="checkbox"
                      checked={plaque}
                      onChange={() => { if (!disabled) handleIndexToggle(tooth, 'pi'); }}
                      disabled={disabled}
                      className="h-4 w-4 text-blue-500"
                      title="Placa"
                    />
                  </td>

                  <td className="px-1 py-1 border border-gray-200 dark:border-gray-600">
                    <Input
                      value={chartData[`note_${tooth}`] || ''}
                      onChange={(e) => handleNote(tooth, e.target.value)}
                      disabled={disabled}
                      placeholder="Nota..."
                      className="h-8 px-2 text-sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
