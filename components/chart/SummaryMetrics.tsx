'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ALL_TEETH, getAllSurfacesForTooth } from '@/lib/constants/teeth';

interface SummaryMetricsProps {
  data: ChartData;
}

export function SummaryMetrics({ data }: SummaryMetricsProps) {
  const presentTeeth = ALL_TEETH.filter(t => data[`tooth_${t}`] === '1').length;
  const missingTeeth = ALL_TEETH.filter(t => data[`tooth_${t}`] === '0' || !data[`tooth_${t}`]).length;
  const implantTeeth = ALL_TEETH.filter(t => (data[`implant_${t}`] as number) > 0).length;

  let totalPd = 0;
  let pdCount = 0;
  let totalBleeding = 0;
  let totalPlaque = 0;
  let sitesCount = 0;

  ALL_TEETH.forEach(tooth => {
    if (data[`tooth_${tooth}`] !== '1') return;
    const surfaces = getAllSurfacesForTooth(tooth);
    surfaces.forEach(surface => {
      const pd = parseFloat(data[`pd_${tooth}_${surface}`]) || 0;
      if (pd > 0) {
        totalPd += pd;
        pdCount++;
      }
      const bop = data[`bop_${tooth}_${surface}`] === '1' || data[`bop_${tooth}_${surface}`] === 1;
      const pi = data[`pi_${tooth}_${surface}`] === '1' || data[`pi_${tooth}_${surface}`] === 1;
      if (bop) totalBleeding++;
      if (pi) totalPlaque++;
      sitesCount++;
    });
  });

  const avgPd = pdCount > 0 ? (totalPd / pdCount).toFixed(1) : '0.0';
  const bleedingIndex = sitesCount > 0 ? ((totalBleeding / sitesCount) * 100).toFixed(1) : '0.0';
  const plaqueIndex = sitesCount > 0 ? ((totalPlaque / sitesCount) * 100).toFixed(1) : '0.0';

  const deepPockets = ALL_TEETH.reduce((count, tooth) => {
    if (data[`tooth_${tooth}`] !== '1') return count;
    const surfaces = getAllSurfacesForTooth(tooth);
    return count + surfaces.filter(s => (parseFloat(data[`pd_${tooth}_${s}`]) || 0) >= 5).length;
  }, 0);

  const veryDeepPockets = ALL_TEETH.reduce((count, tooth) => {
    if (data[`tooth_${tooth}`] !== '1') return count;
    const surfaces = getAllSurfacesForTooth(tooth);
    return count + surfaces.filter(s => (parseFloat(data[`pd_${tooth}_${s}`]) || 0) >= 7).length;
  }, 0);

  const furcationCount = ALL_TEETH.reduce((count, tooth) => {
    if (data[`tooth_${tooth}`] !== '1') return count;
    const sites = ['b', 'dp', 'mp', 'l', 'p'] as const;
    return count + sites.filter(s => (data[`furcation_${tooth}_${s}`] as number) >= 2).length;
  }, 0);

  const mobilityCount = ALL_TEETH.reduce((count, tooth) => {
    if (data[`tooth_${tooth}`] !== '1') return count;
    const mob = (data[`mobility_${tooth}`] as number) || 0;
    return count + (mob >= 2 ? 1 : 0);
  }, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <MetricCard label="Dientes" value={presentTeeth} unit="presentes" icon="🦷" color="blue" />
      <MetricCard label="Ausentes" value={missingTeeth} icon="❌" color="gray" />
      <MetricCard label="Implantes" value={implantTeeth} icon="🦷" color="purple" />
      <MetricCard label="PS Prom." value={avgPd} unit="mm" icon="📏" color="blue" />
      <MetricCard label="BOP" value={`${bleedingIndex}%`} icon="🩸" color="red" />
      <MetricCard label="PI" value={`${plaqueIndex}%`} icon="🦠" color="cyan" />
      <MetricCard label="Bolsas ≥5mm" value={deepPockets} icon="⚠️" color="amber" />
      <MetricCard label="Bolsas ≥7mm" value={veryDeepPockets} icon="🔴" color="red" />
      <MetricCard label="Furc. II/III" value={furcationCount} icon="🔱" color="orange" />
      <MetricCard label="Mov. II/III" value={mobilityCount} icon="↔️" color="green" />
    </div>
  );
}

function MetricCard({ label, value, unit, icon, color }: { label: string; value: string | number; unit?: string; icon: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses] || 'text-gray-900'}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}