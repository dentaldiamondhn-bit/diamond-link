import React from 'react';

export type ImplantStatus = 1 | 2 | 3;

export function getImplantColor(status: number): string {
  if (status === 2) return '#ef4444';
  if (status === 3) return '#22c55e';
  return '#4b5563';
}

export function getImplantScrewSvg(
  x: number,
  cejY: number,
  width: number,
  length: number,
  isUpper: boolean,
  status: number,
) {
  const direction = isUpper ? -1 : 1;
  const apexY = cejY + length * direction;
  const fill = getImplantColor(status);

  const bodyPath = `
    M ${x - width / 2} ${cejY}
    L ${x + width / 2} ${cejY}
    L ${x + width / 3} ${apexY}
    Q ${x} ${apexY + 4 * direction} ${x - width / 3} ${apexY}
    Z
  `;

  const ratios = [0.2, 0.4, 0.6, 0.8];

  return (
    <g className="implant-screw-group">
      <path d={bodyPath} fill={fill} stroke="#111827" strokeWidth={1} />
      {ratios.map(ratio => {
        const lineY = cejY + length * ratio * direction;
        const currentWidth = (width / 2) * (1 - ratio * 0.3);
        return (
          <line
            key={ratio}
            x1={x - currentWidth}
            y1={lineY}
            x2={x + currentWidth}
            y2={lineY}
            stroke="#111827"
            strokeWidth={1.2}
          />
        );
      })}
    </g>
  );
}