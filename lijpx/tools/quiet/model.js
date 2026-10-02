// Quiet at Night calculations shared by the pages. `data` is the payload from build/prep/quiet.py,
// which already left out every unit's quarter with fewer than data.minN responses.

import { append, h } from '../../shell/dom.js?v=e03acf3e7a';
import { selectControl } from '../../shell/ui.js?v=08586281b3';

// A score below this is flagged on the Snapshot page.
export const ALERT_BELOW = 50;
export const SITE_COLOR = '#9ca3af';

// Division colors by the accent the prep step assigns: badge background, badge text, chart line and bar.
const ACCENTS = {
  blue: { bg: '#dbeafe', text: '#1e40af', bar: '#3b82f6' },
  amber: { bg: '#fef3c7', text: '#92400e', bar: '#f59e0b' },
  green: { bg: '#dcfce7', text: '#166534', bar: '#22c55e' },
  pink: { bg: '#fce7f3', text: '#9d174d', bar: '#ec4899' },
  violet: { bg: '#ede9fe', text: '#5b21b6', bar: '#8b5cf6' },
  gray: { bg: '#f3f4f6', text: '#4b5563', bar: '#9ca3af' },
};

export function accent(data, divisionName) {
  return ACCENTS[data.divisions.find((d) => d.name === divisionName)?.accent] ?? ACCENTS.gray;
}

export function divisionBadge(data, divisionName, className = 'q-div-badge') {
  const colors = accent(data, divisionName);
  return h('span', { class: className, style: { background: colors.bg, color: colors.text } }, divisionName);
}

// Quarters the data covers in full. A partial quarter (one or two months, labelled with them) can be
// picked and is charted, but the pages never open on it or compare against it, as in CFAM.
export function completeQuarters(data) {
  const complete = data.quarters.filter((q) => q.complete);
  return complete.length > 0 ? complete : data.quarters;
}

export function latestQuarter(data) {
  return completeQuarters(data).at(-1);
}

// The quarter picked on the Snapshot or Divisions page, else the latest complete one.
export function selectedQuarter(data, state) {
  return data.quarters.find((q) => q.id === state.quarter) ?? latestQuarter(data);
}

export function quarterControl(data, ctx, quarter) {
  return selectControl({
    id: 'q-quarter',
    label: 'Quarter',
    value: quarter.id,
    options: [...data.quarters].reverse().map((q) => ({ value: q.id, label: q.label })),
    onChange: (value) => {
      ctx.state.quarter = value;
      ctx.rerender();
    },
  });
}

// The complete quarter before `quarter`, which its changes are measured against.
export function previousQuarter(data, quarter) {
  return data.quarters.slice(0, data.quarters.indexOf(quarter)).filter((q) => q.complete).at(-1) ?? null;
}

// The change between a unit's first and latest complete quarters, or null unless both are scored.
export function changeOverTime(data, unit) {
  const complete = completeQuarters(data);
  const [first, last] = [unit.scores[complete[0].id], unit.scores[complete.at(-1).id]];
  return first && last ? last.score - first.score : null;
}

export function unitsInDivision(data, divisionName) {
  return data.units.filter((unit) => unit.division === divisionName);
}

// Response-weighted average of the units scored in a quarter: { score, n }, or null when none is.
function weightedAverage(units, quarterId) {
  let total = 0;
  let n = 0;
  for (const unit of units) {
    const entry = unit.scores[quarterId];
    if (entry) {
      total += entry.score * entry.n;
      n += entry.n;
    }
  }
  return n > 0 ? { score: total / n, n } : null;
}

export function siteAverage(data, quarterId) {
  return weightedAverage(data.units, quarterId)?.score ?? null;
}

export function divisionAverage(data, divisionName, quarterId) {
  return weightedAverage(unitsInDivision(data, divisionName), quarterId);
}

// Units scored in the quarter, highest first, with the change from the previous quarter when both are scored.
export function quarterRanking(data, quarter) {
  const previous = previousQuarter(data, quarter);
  return data.units
    .filter((unit) => unit.scores[quarter.id])
    .map((unit) => {
      const { score, n } = unit.scores[quarter.id];
      const before = previous && unit.scores[previous.id];
      return { unit: unit.name, division: unit.division, score, n, delta: before ? score - before.score : null };
    })
    .sort((a, b) => b.score - a.score);
}

// Each division scored in the quarter, quietest first, with its scored units, quietest first.
export function divisionRanking(data, quarter) {
  return data.divisions
    .map((division) => ({ division, average: divisionAverage(data, division.name, quarter.id) }))
    .filter(({ average }) => average)
    .map(({ division, average }) => ({
      name: division.name,
      score: average.score,
      n: average.n,
      units: unitsInDivision(data, division.name)
        .filter((unit) => unit.scores[quarter.id])
        .map((unit) => ({ unit: unit.name, ...unit.scores[quarter.id] }))
        .sort((a, b) => b.score - a.score),
    }))
    .sort((a, b) => b.score - a.score);
}

// Text color band for a score, as on v1: 65 and up, 50 to 65, 40 to 50, under 40.
export function scoreBand(score) {
  if (score >= 65) return 'band-high';
  if (score >= ALERT_BELOW) return 'band-mid';
  if (score >= 40) return 'band-low';
  return 'band-alert';
}

// Green for a rise, red for a fall, judged on the one decimal the pages show, so -0.03 reads 0.0 in green.
export function trendTone(delta) {
  return Math.round(delta * 10) / 10 >= 0 ? 'tone-green' : 'tone-red';
}

// The quarter and the months it covers, printed under the controls so a printout names its period,
// and what a partial quarter means for the comparison.
export function quarterNote(data, quarter) {
  const parts = [`${quarter.id} (${quarter.range}${quarter.complete ? '' : ' only, a partial quarter'})`, `units with at least ${data.minN} responses`];
  const previous = previousQuarter(data, quarter);
  if (!quarter.complete && previous) parts.push(`changes are against ${previous.id}, the last complete quarter`);
  const partial = data.quarters.filter((q) => !q.complete && q !== quarter);
  if (partial.length > 0) parts.push(`${partial.map((q) => `${q.id} holds ${q.range} only`).join(', ')}; pick it above to see it`);
  return h('p', { class: 'q-note' }, parts.join(' · '));
}

// v1's KPI look: a colored bar across the top of the shell's KPI card, plus optional extra lines.
export function accented(kpi, tone, ...extra) {
  kpi.classList.add('q-kpi', `q-kpi-${tone}`);
  return append(kpi, extra);
}
