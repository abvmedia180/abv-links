// Raw Scores: every unit's Top Box score per domain for one quarter or one year, as a heat map.
// No KPI boxes; the qualified unit count sits in the section header.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed } from '../../../shell/format.js?v=4974441338';
import { card, sectionHeader, selectControl } from '../../../shell/ui.js?v=08586281b3';

export default {
  id: 'raw',
  title: 'Raw Scores',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const { mode, period } = selectedPeriod(data, ctx.state);
    const units = unitNames(period);
    const qualified = units.filter((unit) => period.units[unit].n >= data.minN).length;
    const periods = mode === 'year' ? data.years : data.quarters;
    container.append(
      h('div', { class: 'page-controls' },
        selectControl({
          id: 'rs-raw-mode',
          label: 'View by',
          value: mode,
          options: [{ value: 'quarter', label: 'Quarter' }, { value: 'year', label: 'Year' }],
          onChange: (value) => {
            ctx.state.rawMode = value;
            ctx.rerender();
          },
        }),
        selectControl({
          id: 'rs-raw-period',
          label: mode === 'year' ? 'Year' : 'Quarter',
          value: period.id,
          options: periods.map((p) => ({ value: p.id, label: `${p.id} (${p.range})` })),
          onChange: (value) => {
            ctx.state[mode === 'year' ? 'rawYear' : 'rawQuarter'] = value;
            ctx.rerender();
          },
        })),
      sectionHeader('HCAHPS Top Box Scores', `${period.id} · ${qualified} of ${units.length} units qualified (n ≥ ${data.minN})`),
      card({ title: 'HCAHPS Top Box Scores by Unit', icon: 'grid' },
        h('div', { class: 'data-table-wrap' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {},
            h('th', { scope: 'col' }, 'Unit'),
            h('th', { scope: 'col', class: 'num' }, 'n'),
            data.domains.map((domain) => h('th', { scope: 'col', class: 'num' }, domain.label)))),
          h('tbody', {}, units.map((unit) => scoreRow(unit, period.units[unit], data))),
        ))),
    );
  },

  exports(data, ctx) {
    const { period } = selectedPeriod(data, ctx.state);
    return {
      columns: [
        { key: 'unit', label: 'Unit' },
        { key: 'n', label: 'n', decimals: 0 },
        ...data.domains.map((domain) => ({ key: domain.key, label: domain.label, decimals: 1 })),
      ],
      rows: unitNames(period).map((unit) => {
        const { n, scores } = period.units[unit];
        return { unit, n, ...Object.fromEntries(data.domains.map((domain) => [domain.key, scores[domain.key]?.score ?? null])) };
      }),
    };
  },
};

function selectedPeriod(data, state) {
  const mode = state.rawMode === 'year' ? 'year' : 'quarter';
  const periods = mode === 'year' ? data.years : data.quarters;
  const wanted = mode === 'year' ? state.rawYear : state.rawQuarter;
  return { mode, period: periods.find((p) => p.id === wanted) ?? periods.at(-1) };
}

function unitNames(period) {
  return Object.keys(period.units).sort();
}

function scoreRow(unit, scores, data) {
  const qualified = scores.n >= data.minN;
  return h('tr', {},
    h('td', { class: 'name' }, unit),
    h('td', { class: `num n-cell${qualified ? '' : ' n-low'}` }, String(scores.n)),
    data.domains.map((domain) => {
      const value = scores.scores[domain.key];
      if (!value) return h('td', { class: 'num empty' }, '--');
      return h('td', { class: `num${qualified ? ` ${heatClass(value.score)}` : ''}` }, fixed(value.score));
    }),
  );
}

function heatClass(score) {
  if (score >= 85) return 'heat-high';
  if (score >= 75) return 'heat-mid-high';
  if (score >= 65) return 'heat-mid';
  if (score >= 55) return 'heat-mid-low';
  return 'heat-low';
}
