// Furcation chart coordinates, ported verbatim from the reference site
// (periodontalchart-online.com, js/coordinates/furcation_chart_coordinates.js).
// Values are in the site's 790x162 SVG viewBox space; map them to app space
// with siteSvgXToApp / siteSvgYToApp. Note the reference has NO furcation
// entries for the upper second premolars (15/25) — the first premolars
// (14/24) carry mesial/distal palatal entries only, and their `_b` rows in
// the site's table are vestigial (no data-entry button exists for them).
export const FURCATION_CHART_COORDINATES: Record<string, Record<string, { x: number; y: number }>> = {
  // Upper buccal (upper-svg-placeholder-01)
  'upper-svg-placeholder-01': {
    'furcation_18_b': { x: 30.5, y: 95 },
    'furcation_17_b': { x: 83, y: 95 },
    'furcation_16_b': { x: 141, y: 95 },
    'furcation_14_b': { x: 233, y: 95 },
    'furcation_24_b': { x: 559, y: 95 },
    'furcation_26_b': { x: 651, y: 95 },
    'furcation_27_b': { x: 708.5, y: 95 },
    'furcation_28_b': { x: 761.5, y: 95 },
  },
  // Upper palatal (upper-svg-placeholder-02) — one marker per palatal root
  'upper-svg-placeholder-02': {
    'furcation_18_mp': { x: 48, y: 70 },
    'furcation_18_dp': { x: 8, y: 70 },
    'furcation_17_mp': { x: 100, y: 70 },
    'furcation_17_dp': { x: 61, y: 70 },
    'furcation_16_mp': { x: 162, y: 70 },
    'furcation_16_dp': { x: 116, y: 70 },
    'furcation_14_mp': { x: 246, y: 70 },
    'furcation_14_dp': { x: 221, y: 70 },
    'furcation_24_mp': { x: 546, y: 70 },
    'furcation_24_dp': { x: 571, y: 70 },
    'furcation_26_mp': { x: 629, y: 70 },
    'furcation_26_dp': { x: 677, y: 70 },
    'furcation_27_mp': { x: 693, y: 70 },
    'furcation_27_dp': { x: 732, y: 70 },
    'furcation_28_mp': { x: 745, y: 70 },
    'furcation_28_dp': { x: 784, y: 70 },
  },
  // Lower lingual (lower-svg-placeholder-01)
  'lower-svg-placeholder-01': {
    'furcation_48_l': { x: 38.5, y: 90 },
    'furcation_47_l': { x: 103, y: 90 },
    'furcation_46_l': { x: 164, y: 90 },
    'furcation_36_l': { x: 626.5, y: 90 },
    'furcation_37_l': { x: 688, y: 90 },
    'furcation_38_l': { x: 753.5, y: 90 },
  },
  // Lower buccal (lower-svg-placeholder-02)
  'lower-svg-placeholder-02': {
    'furcation_48_b': { x: 36, y: 80 },
    'furcation_47_b': { x: 99, y: 80 },
    'furcation_46_b': { x: 162.5, y: 80 },
    'furcation_36_b': { x: 628, y: 80 },
    'furcation_37_b': { x: 692.5, y: 80 },
    'furcation_38_b': { x: 755.5, y: 80 },
  },
};
