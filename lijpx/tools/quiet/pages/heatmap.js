// Heatmap: every unit's score in every quarter, grouped by division (quietest in the latest complete
// quarter first), with the site and division averages and each row's change from its first scored
// complete quarter to its last. A partial quarter is shown, labelled, but left out of the trend.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4974441338';
import { completeQuarters, divisionAverage, latestQuarter, siteAverage, trendTone, unitsInDivision } from '../model.js?v=2a5c448782';

export default {
  id: 'heatmap',
  title: 'Heatmap',
  printOrientation: 'landscape',

  render(container, data) {
    container.append(
      h('p', { class: 'q-note' },
        `A score shows when a unit has at least ${data.minN} responses in the quarter; -- means fewer. `
        + 'Trend is the change from the first scored complete quarter to the last; a partial quarter is labelled with its months and left out of it.'),
      h('div', { class: 'data-table-wrap q-heatmap-wrap' }, h('table', { class: 'data-table q-heatmap' },
        h('thead', {}, h('tr', {},
          h('th', { scope: 'col' }, 'Unit'),
          data.quarters.map((quarter) => h('th', { scope: 'col', class: 'num' }, quarter.label)),
          h('th', { scope: 'col', class: 'num' }, 'Trend'))),
        h('tbody', {}, heatmapRows(data).map((row) => rowElement(row, data))),
      )),
    );
  },

  exports(data) {
    return {
      columns: [
        { key: 'unit', label: 'Unit' },
        { key: 'division', label: 'Division' },
        ...data.quarters.map((quarter, i) => ({ key: `q${i}`, label: quarter.label, decimals: 1 })),
        { key: 'trend', label: 'Trend', decimals: 1 },
      ],
      rows: heatmapRows(data)
        .filter((row) => row.kind !== 'division')
        .map((row) => ({
          unit: row.label,
          division: row.division,
          ...Object.fromEntries(row.values.map((value, i) => [`q${i}`, value])),
          trend: row.trend,
        })),
    };
  },
};

// The rows of the table in order: site average, then per division a heading row, its units and its
// average, then units without a division under "Other" (they count toward the site average too).
function heatmapRows(data) {
  const ids = data.quarters.map((quarter) => quarter.id);
  const counted = new Set(completeQuarters(data).map((quarter) => quarter.id));
  const inTrend = ids.map((id) => counted.has(id));
  const latest = latestQuarter(data).id;
  const scoreRow = (kind, label, division, values) => ({ kind, label, division, values, trend: trend(values, inTrend) });
  const unitRows = (units, division) => units
    .sort((a, b) => (b.scores[latest]?.score ?? -1) - (a.scores[latest]?.score ?? -1))
    .map((unit) => scoreRow('unit', unit.name, division, ids.map((id) => unit.scores[id]?.score ?? null)));
  const rows = [scoreRow('site', 'Site Average', null, ids.map((id) => siteAverage(data, id)))];
  for (const division of data.divisions) {
    const units = unitsInDivision(data, division.name);
    if (units.length === 0) continue;
    rows.push({ kind: 'division', label: division.name }, ...unitRows(units, division.name));
    rows.push(scoreRow('average', `${division.name} Avg`, division.name,
      ids.map((id) => divisionAverage(data, division.name, id)?.score ?? null)));
  }
  const unassigned = data.units.filter((unit) => !unit.division);
  if (unassigned.length > 0) rows.push({ kind: 'division', label: 'Other' }, ...unitRows(unassigned, null));
  return rows;
}

function trend(values, inTrend) {
  const scored = values.filter((value, i) => value != null && inTrend[i]);
  return scored.length > 0 ? scored.at(-1) - scored[0] : null;
}

function rowElement(row, data) {
  if (row.kind === 'division') {
    return h('tr', { class: 'q-hm-div-row' }, h('td', { colspan: data.quarters.length + 2 }, row.label));
  }
  return h('tr', { class: row.kind === 'unit' ? null : `q-hm-avg-row q-hm-${row.kind}` },
    h('td', { class: 'name' }, row.label),
    row.values.map((value) => (value == null
      ? h('td', { class: 'num empty' }, '--')
      : h('td', { class: 'num' }, h('span', { class: `q-hm-cell ${heatClass(value)}` }, fixed(value))))),
    h('td', { class: 'num' }, row.trend == null
      ? '--'
      : h('span', { class: `q-hm-trend ${trendTone(row.trend)}` }, signed(row.trend))),
  );
}

function heatClass(score) {
  if (score >= 70) return 'hm-6';
  if (score >= 60) return 'hm-5';
  if (score >= 50) return 'hm-4';
  if (score >= 40) return 'hm-3';
  if (score >= 30) return 'hm-2';
  return 'hm-1';
}
