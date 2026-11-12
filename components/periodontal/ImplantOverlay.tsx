'use client';

import React from 'react';
import { ChartData, FDIToothNumber } from '@/lib/types';
import { ChartViewId, SVG_VIEWBOX_HEIGHT, SVG_VIEWBOX_WIDTH } from '@/lib/utils/chartGeometry';
import { readNumber } from '@/lib/utils/periodontalAnalysis';

interface ImplantOverlayProps {
  tooth: FDIToothNumber;
  viewId: ChartViewId;
  data: ChartData;
}

// Exact implant anchor coordinates copied from periodontalchart-online.com
// (js/coordinates/implant_coordinates.js; per-view space is 790x162).
const SITE_IMPLANT_COORDS: Record<string, { x: number; y: number }> = {
  // Oberkiefer rechts (Quadrant 1)
  'implant_18_b': { x: 26, y: 57 },
  'implant_18_p': { x: 26, y: 105 },
  'implant_17_b': { x: 82.7, y: 57 },
  'implant_17_p': { x: 82.7, y: 105 },
  'implant_16_b': { x: 140.1, y: 57 },
  'implant_16_p': { x: 140.4, y: 105 },
  'implant_15_b': { x: 191.1, y: 57 },
  'implant_15_p': { x: 191.1, y: 105 },
  'implant_14_b': { x: 233, y: 57 },
  'implant_14_p': { x: 233, y: 105 },
  'implant_13_b': { x: 275.3, y: 57 },
  'implant_13_p': { x: 275.3, y: 105 },
  'implant_12_b': { x: 314.4, y: 57 },
  'implant_12_p': { x: 314.5, y: 105.8 },
  'implant_11_b': { x: 363.9, y: 57 },
  'implant_11_p': { x: 363.9, y: 106 },

  // Oberkiefer links (Quadrant 2)
  'implant_28_b': { x: 762, y: 57 },
  'implant_28_p': { x: 761.8, y: 105 },
  'implant_27_b': { x: 704.8, y: 57 },
  'implant_27_p': { x: 704.8, y: 105 },
  'implant_26_b': { x: 646.8, y: 57 },
  'implant_26_p': { x: 646.8, y: 105 },
  'implant_25_b': { x: 596, y: 57 },
  'implant_25_p': { x: 596, y: 105 },
  'implant_24_b': { x: 555, y: 57 },
  'implant_24_p': { x: 554.4, y: 105 },
  'implant_23_b': { x: 512.7, y: 57 },
  'implant_23_p': { x: 512.7, y: 105 },
  'implant_22_b': { x: 473.6, y: 57 },
  'implant_22_p': { x: 473.4, y: 105.8 },
  'implant_21_b': { x: 424.9, y: 57 },
  'implant_21_p': { x: 424.9, y: 106 },

  // Unterkiefer links (Quadrant 3)
  'implant_38_b': { x: 759.9, y: 112 },
  'implant_38_l': { x: 757.5, y: 54 },
  'implant_37_b': { x: 689.4, y: 112 },
  'implant_37_l': { x: 684.9, y: 54 },
  'implant_36_b': { x: 625, y: 112 },
  'implant_36_l': { x: 623, y: 54 },
  'implant_35_b': { x: 570.9, y: 112 },
  'implant_35_l': { x: 570.9, y: 54 },
  'implant_34_b': { x: 530, y: 112 },
  'implant_34_l': { x: 529, y: 54 },
  'implant_33_b': { x: 492, y: 112 },
  'implant_33_l': { x: 491, y: 54 },
  'implant_32_b': { x: 454.5, y: 112 },
  'implant_32_l': { x: 455, y: 54 },
  'implant_31_b': { x: 415, y: 112 },
  'implant_31_l': { x: 415.9, y: 54 },

  // Unterkiefer rechts (Quadrant 4)
  'implant_48_b': { x: 36, y: 112 },
  'implant_48_l': { x: 38.4, y: 54 },
  'implant_47_b': { x: 98.9, y: 112 },
  'implant_47_l': { x: 103.4, y: 54 },
  'implant_46_b': { x: 162.5, y: 112 },
  'implant_46_l': { x: 165.4, y: 54 },
  'implant_45_b': { x: 217.4, y: 112 },
  'implant_45_l': { x: 217.5, y: 54 },
  'implant_44_b': { x: 257, y: 112 },
  'implant_44_l': { x: 258.9, y: 54 },
  'implant_43_b': { x: 294.9, y: 112 },
  'implant_43_l': { x: 296.6, y: 54 },
  'implant_42_b': { x: 333, y: 112 },
  'implant_42_l': { x: 331.9, y: 54 },
  'implant_41_b': { x: 373.2, y: 112 },
  'implant_41_l': { x: 371.9, y: 54 },
};

// Natural pixel sizes of the site's implant PNGs (public/img/implants);
// identical across the gray/red/green status variants of the same tooth + view.
const IMPLANT_PNG_SIZES: Record<string, [number, number]> = {
  // Quadrant 1 (11-18)
  '18b': [60, 137],
  '18p': [60, 119],
  '17b': [54, 137],
  '17p': [54, 119],
  '16b': [62, 137],
  '16p': [62, 119],
  '15b': [41, 137],
  '15p': [41, 119],
  '14b': [43, 137],
  '14p': [43, 119],
  '13b': [42, 137],
  '13p': [42, 119],
  '12b': [37, 137],
  '12p': [37, 119],
  '11b': [62, 137],
  '11p': [62, 119],

  // Quadrant 2 (21-28)
  '28b': [60, 137],
  '28p': [60, 119],
  '27b': [55, 137],
  '27p': [55, 119],
  '26b': [62, 137],
  '26p': [62, 119],
  '25b': [40, 137],
  '25p': [40, 119],
  '24b': [43, 137],
  '24p': [43, 119],
  '23b': [42, 137],
  '23p': [42, 119],
  '22b': [37, 137],
  '22p': [37, 119],
  '21b': [61, 137],
  '21p': [61, 119],

  // Quadrant 3 (31-38)
  '38b': [80, 131],
  '38l': [84, 133],
  '37b': [62, 131],
  '37l': [63, 133],
  '36b': [67, 131],
  '36l': [61, 133],
  '35b': [43, 131],
  '35l': [44, 133],
  '34b': [38, 131],
  '34l': [40, 133],
  '33b': [39, 131],
  '33l': [37, 133],
  '32b': [37, 131],
  '32l': [35, 133],
  '31b': [42, 131],
  '31l': [44, 133],

  // Quadrant 4 (41-48)
  '48b': [64, 131],
  '48l': [68, 133],
  '47b': [62, 131],
  '47l': [63, 133],
  '46b': [67, 131],
  '46l': [62, 133],
  '45b': [43, 131],
  '45l': [43, 133],
  '44b': [37, 131],
  '44l': [40, 133],
  '43b': [39, 131],
  '43l': [36, 133],
  '42b': [38, 131],
  '42l': [35, 133],
  '41b': [43, 131],
  '41l': [46, 133],
};

// The site renders the background JPG (3248x652) inside a 787x162.5
// placeholder in an 806.67x166.56 box at (-9, 0) with object-fit: contain,
// which displays it at 806.67x161.93 with its top edge at y = 2.32.
// Our chart stretches that same JPG edge-to-edge over an 1800x240 viewBox,
// so site coordinates map with these factors.
const JPG_DISPLAY_WIDTH = 806.671875;
const JPG_DISPLAY_HEIGHT = (JPG_DISPLAY_WIDTH / 3248) * 652;
const JPG_OFFSET_X = -9;
const JPG_OFFSET_Y = (162.5 * 1.025 - JPG_DISPLAY_HEIGHT) / 2;
const X_SCALE = SVG_VIEWBOX_WIDTH / JPG_DISPLAY_WIDTH;
const Y_SCALE = SVG_VIEWBOX_HEIGHT / JPG_DISPLAY_HEIGHT;

// Which implant PNG suffix each chart view uses (b = buccal/vestibular,
// p = palatino, l = lingual), matching the site's marker ids.
const VIEW_SUFFIX: Record<ChartViewId, 'b' | 'p' | 'l'> = {
  'upper-svg-placeholder-01': 'b',
  'upper-svg-placeholder-02': 'p',
  'lower-svg-placeholder-01': 'l',
  'lower-svg-placeholder-02': 'b',
};

// Site `.implant-marker-colored`: 4px top/bottom fade on red/green implants.
const COLORED_MASK =
  'linear-gradient(to bottom, transparent, black 4px, black calc(100% - 4px), transparent)';

export function ImplantOverlay({ tooth, viewId, data }: ImplantOverlayProps) {
  const status = readNumber(data[`implant_${tooth}`]);
  if (!status || status < 1) return null;

  const suffix = VIEW_SUFFIX[viewId];
  const coord = SITE_IMPLANT_COORDS[`implant_${tooth}_${suffix}`];
  const size = IMPLANT_PNG_SIZES[`${tooth}${suffix}`];
  if (!coord || !size) return null;

  const folder = status === 2 ? 'r' : status === 3 ? 'g' : null;
  const quadrant = Math.floor(tooth / 10);
  const src = `/img/implants/${folder ? `${folder}/` : ''}${quadrant}/${tooth}${suffix}.png`;

  const width = size[0] * X_SCALE;
  const height = size[1] * Y_SCALE;
  const centerX = (coord.x - JPG_OFFSET_X) * X_SCALE;
  const centerY = (coord.y - JPG_OFFSET_Y) * Y_SCALE;

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute"
      style={{
        left: `${((centerX / SVG_VIEWBOX_WIDTH) * 100).toFixed(3)}%`,
        top: `${((centerY / SVG_VIEWBOX_HEIGHT) * 100).toFixed(3)}%`,
        width: `${((width / SVG_VIEWBOX_WIDTH) * 100).toFixed(3)}%`,
        height: `${((height / SVG_VIEWBOX_HEIGHT) * 100).toFixed(3)}%`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        ...(status > 1 ? { maskImage: COLORED_MASK, WebkitMaskImage: COLORED_MASK } : {}),
      }}
    />
  );
}
