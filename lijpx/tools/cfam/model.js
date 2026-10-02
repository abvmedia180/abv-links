// CFAM calculations shared by the pages. `data` is the payload from build/prep/cfam.py.
// A score is { score, n }, or null when there were no surveys on that question in that period.

import { h } from '../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../shell/format.js?v=4796f631fd';

// The key question (likelihood to recommend) is first in data.questions; build/prep/cfam.py checks it.
export const KEY = 0;

// Bars: the primary blue, and its faded shade for a score with fewer than minN surveys.
export const BAR_COLOR = '#0059A5';
export const BAR_LOW_N_COLOR = '#a6c1dd';

// v1's unit colors, in v1's order, given by each unit's place in data.units.
export const UNIT_COLORS = ['#0059A5', '#009CDA', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d'];

// Below this width a horizontal bar chart wraps its category labels and thins its value axis.
const NARROW_CHART_PX = 560;

export function isNarrow(chartEl) {
  return chartEl.clientWidth < NARROW_CHART_PX;
}

// The latest quarter the export fully covers, and the complete quarter before it.
export function latestQuarters(data) {
  const complete = data.quarters.filter((quarter) => quarter.complete);
  return { curr: complete.at(-1) ?? null, prev: complete.at(-2) ?? null };
}

// The latest two complete quarters (mode 'quarter') or years (mode 'year').
export function comparison(data, mode) {
  if (mode === 'year' && data.years.length >= 2) {
    const [prev, curr] = data.years.slice(-2);
    return { mode, key: 'years', prev: { id: prev, label: prev }, curr: { id: curr, label: curr } };
  }
  const { prev, curr } = latestQuarters(data);
  return { mode: 'quarter', key: 'quarters', prev, curr };
}

// entity: data.overall or one of data.units. key: 'quarters' or 'years'.
export function scoreAt(entity, key, periodId, question) {
  return entity[key][periodId]?.[question] ?? null;
}

export function qualified(entry, data) {
  return Boolean(entry) && entry.n >= data.minN;
}

// Change in points, rounded to the one decimal every page shows, so a change under 0.05 is 0 and
// never reads "+0.0" or gets a color.
export function change(prev, curr) {
  return prev && curr ? Math.round((curr.score - prev.score) * 10) / 10 : null;
}

export function percent(entry) {
  return entry ? `${fixed(entry.score)}%` : '--';
}

export function points(value) {
  return value == null ? '--' : `${signed(value)} pts`;
}

export function changeTone(value) {
  if (!value) return '';
  return value > 0 ? 'tone-green' : 'tone-red';
}

// The tone for a change between two scores: colored only when both have at least minN surveys,
// so a swing on a handful of surveys stays gray.
export function trendTone(prev, curr, data) {
  return qualified(prev, data) && qualified(curr, data) ? changeTone(change(prev, curr)) : '';
}

// Heat map shading: one blue, linear from 60% (lightest) to 100% (darkest). The shade follows the
// score itself; there are no good or bad bands. tool.css draws the same scale in the legend.
function shade(score) {
  const t = Math.min(Math.max((score - 60) / 40, 0), 1);
  return `rgba(0, 89, 165, ${(0.04 + t * 0.46).toFixed(3)})`;
}

export function shadeLegend(data) {
  return h('div', { class: 'shade-legend' },
    h('span', {}, '60% or lower'),
    h('span', { class: 'shade-scale', 'aria-hidden': 'true' }),
    h('span', {}, '100%'),
    h('span', { class: 'shade-legend-note' }, `Unshaded: fewer than ${data.minN} surveys.`),
  );
}

// One score as a table cell: shaded when it has at least minN surveys, otherwise plain with its n.
export function scoreTd(entry, data) {
  if (!entry) return h('td', { class: 'num empty' }, '--');
  if (!qualified(entry, data)) {
    return h('td', { class: 'num low-n-cell', title: `n=${entry.n}` }, fixed(entry.score), h('span', { class: 'cell-n' }, `n=${entry.n}`));
  }
  return h('td', { class: 'num heat-cell', title: `n=${entry.n}`, style: { background: shade(entry.score) } }, fixed(entry.score));
}

// Quarters in a row, up to the latest complete quarter, that the key question's score rose (a
// positive count) or fell (negative) by more than half a point. Quarters under minN surveys are skipped.
export function streak(unit, data) {
  const scores = data.quarters
    .filter((quarter) => quarter.complete)
    .map((quarter) => scoreAt(unit, 'quarters', quarter.id, KEY))
    .filter((entry) => qualified(entry, data))
    .map((entry) => entry.score);
  let count = 0;
  let direction = 0;
  for (let i = scores.length - 1; i > 0; i -= 1) {
    const diff = scores[i] - scores[i - 1];
    const step = diff > 0.5 ? 1 : diff < -0.5 ? -1 : 0;
    if (step === 0 || (direction !== 0 && step !== direction)) break;
    direction = step;
    count += 1;
  }
  return count * direction;
}

export function streakText(value) {
  if (value === 0) return 'None';
  return `${value > 0 ? 'Up' : 'Down'} ${Math.abs(value)}`;
}
