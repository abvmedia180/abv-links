// Axis styles shared by the Quiet at Night charts (v1's look: quarters slanted, scores in Plex Mono).

const MUTED = '#6b7280';

export const GRID_LINE = { lineStyle: { color: '#f3f4f6' } };

export function quarterAxis(quarters, fontSize = 11) {
  return {
    type: 'category',
    data: quarters,
    axisLabel: { fontSize, color: MUTED, rotate: 30 },
    axisLine: { lineStyle: { color: '#e5e7eb' } },
    axisTick: { show: false },
  };
}

export function scoreAxisLabel(fontSize = 11) {
  return { fontFamily: "'IBM Plex Mono', monospace", fontSize, color: MUTED };
}

// The 0 to 100 score axis of the unit and division trend charts.
export function scoreAxis() {
  return { type: 'value', min: 0, max: 100, axisLabel: scoreAxisLabel(), splitLine: GRID_LINE };
}
