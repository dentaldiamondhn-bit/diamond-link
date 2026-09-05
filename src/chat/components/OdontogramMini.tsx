'use client';

import type { ToothStatus, ToothZoneKey } from '../patientCardData';
import { buildOdontogramStateCounts } from '../patientCardData';

interface OdontogramMiniProps {
  teethStatus?: ToothStatus[] | null;
  child?: boolean;
}

const ADULT_ARCH = {
  upperLeft: [18, 17, 16, 15, 14, 13, 12, 11],
  upperRight: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerRight: [31, 32, 33, 34, 35, 36, 37, 38],
};

const CHILD_ARCH = {
  upperLeft: [55, 54, 53, 52, 51],
  upperRight: [61, 62, 63, 64, 65],
  lowerLeft: [85, 84, 83, 82, 81],
  lowerRight: [71, 72, 73, 74, 75],
};

const ZONES: { key: ToothZoneKey; start: number; end: number }[] = [
  { key: 'mesial', start: 45, end: 135 },
  { key: 'buccal', start: 135, end: 225 },
  { key: 'lingual', start: 225, end: 315 },
  { key: 'distal', start: 315, end: 405 },
];

function pieSlicePath(startAngle: number, endAngle: number, r: number) {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = r * Math.cos(startRad);
  const y1 = r * Math.sin(startRad);
  const x2 = r * Math.cos(endRad);
  const y2 = r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

export default function OdontogramMini({ teethStatus, child = false }: OdontogramMiniProps) {
  const arch = child ? CHILD_ARCH : ADULT_ARCH;

  const toothStatusMap = new Map<string, ToothStatus>();
  for (const tooth of teethStatus || []) {
    toothStatusMap.set(String(tooth.toothNumber), tooth);
  }

  const toothCell = (n: number) => {
    const tooth = toothStatusMap.get(String(n));

    if (!tooth?.cuadrantes && !tooth?.central) {
      const sano = !tooth || tooth.status === 'sano';
      return (
        <span
          key={n}
          title={`#${n}: ${tooth?.status || 'sano'}`}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold ${
            sano
              ? 'bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-300 dark:bg-gray-700 dark:text-gray-500'
              : 'text-white'
          }`}
          style={sano ? undefined : { backgroundColor: tooth?.color }}
        >
          {n}
        </span>
      );
    }

    const central = tooth?.central;
    const centerFill = central?.color || '#FFFFFF';
    const centerText = central && central.estado && central.estado !== 'sano' ? '#FFFFFF' : '#1F2937';

    return (
      <svg
        key={n}
        width="30"
        height="30"
        viewBox="0 0 40 40"
        className="h-7 w-7 shrink-0"
        style={{ display: 'block' }}
      >
        <g transform="translate(20,20)">
          <title>{`#${n}: ${tooth?.status || 'sano'}`}</title>
          {ZONES.map(({ key, start, end }) => (
            <path
              key={key}
              d={pieSlicePath(start, end, 16)}
              fill={tooth?.cuadrantes?.[key]?.color || '#FFFFFF'}
              stroke="#cbd5e1"
              strokeWidth="0.8"
            />
          ))}
          <circle cx="0" cy="0" r="6.5" fill={centerFill} stroke="#cbd5e1" strokeWidth="1" />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7.5"
            fontWeight="bold"
            fill={centerText}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {n}
          </text>
          {tooth?.nota && (
            <circle cx={12} cy={-12} r="4" fill="#FF5252" stroke="#FFFFFF" strokeWidth="1" />
          )}
        </g>
      </svg>
    );
  };

  const archGroup = (teeth: number[]) => (
    <div className="flex gap-1">{teeth.map(toothCell)}</div>
  );

  const counts = buildOdontogramStateCounts(teethStatus);

  return (
    <div>
      <div className="mt-2 flex flex-col items-center gap-1">
        <div className="flex flex-wrap items-center justify-center gap-x-2">
          {archGroup(arch.upperLeft)}
          <span className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          {archGroup(arch.upperRight)}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2">
          {archGroup(arch.lowerLeft)}
          <span className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
          {archGroup(arch.lowerRight)}
        </div>
      </div>
      {counts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {counts.map(({ status, label, color, count }) => (
            <span
              key={status}
              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500"
                style={{ backgroundColor: color }}
              />
              {label}: {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}