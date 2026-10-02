// Insights: CFAM-wide score by domain, year over year by domain, the biggest unit moves between the
// latest two complete quarters, each unit's key-question momentum, and the benchmark.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { append, h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed } from '../../../shell/format.js?v=4974441338';
import { card, emptyState, sectionHeader, selectControl } from '../../../shell/ui.js?v=08586281b3';
import {
  BAR_COLOR, BAR_LOW_N_COLOR, KEY, change, changeTone, isNarrow, latestQuarters, percent, points, qualified, scoreAt, scoreTd, shadeLegend, streak, streakText, trendTone,
} from '../model.js?v=eb6dd377a5';

const MOVER_COUNT = 10;

export default {
  id: 'insights',
  title: 'Insights',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const { curr, prev } = latestQuarters(data);
    if (!curr) {
      container.append(emptyState('activity', 'No complete quarter yet', 'Insights need at least one full quarter of surveys.'));
      return;
    }
    const domainEl = h('div', { class: 'chart', style: { height: `${data.questions.length * 44 + 40}px` } });
    const momentumWrap = h('div', { class: 'data-table-wrap momentum-wrap' }, momentumTable(data));
    const scrollHint = h('p', { class: 'scroll-hint' }, 'Latest quarters are on the right. Scroll sideways for earlier ones.');
    append(container, [
      yearControls(data, ctx),
      sectionHeader('Systemic Patterns', `All CFAM units · ${curr.label}`),
      card({ title: 'Average Score by Domain Across All Units', icon: 'clipboard' },
        domainEl,
        h('p', { class: 'chart-note' }, `Bars start at 0%. Faded bars: fewer than ${data.minN} surveys.`)),
      yearOverYear(data, ctx),
      movers(data, curr, prev),
      sectionHeader('Momentum Tracker', `${data.questions[KEY]} by quarter`),
      card({ title: 'Quarterly Score by Unit', icon: 'activity' },
        scrollHint,
        momentumWrap,
        shadeLegend(data),
        h('p', { class: 'chart-note' },
          `Streak: complete quarters in a row, up to ${curr.label}, that the score rose (Up) or fell (Down) by more than half a point. `
          + `Quarters with fewer than ${data.minN} surveys are skipped.`)),
      benchmark(data),
    ]);
    momentumWrap.scrollLeft = momentumWrap.scrollWidth;
    scrollHint.hidden = momentumWrap.scrollWidth <= momentumWrap.clientWidth;
    ctx.chart(domainEl, domainOption(data, curr, isNarrow(domainEl)));
  },

  exports(data) {
    const { curr } = latestQuarters(data);
    if (!curr) return null;
    return {
      columns: [
        { key: 'unit', label: 'Unit' },
        ...data.quarters.map((quarter, i) => ({ key: `q${i}`, label: quarter.label, decimals: 1 })),
        { key: 'streak', label: 'Streak' },
      ],
      rows: data.units.map((unit) => ({
        unit: unit.name,
        ...Object.fromEntries(data.quarters.map((quarter, i) => [`q${i}`, scoreAt(unit, 'quarters', quarter.id, KEY)?.score ?? null])),
        streak: streakText(streak(unit, data)),
      })),
    };
  },
};

// Year-over-year pairs of complete years, latest first. state.yoy holds the later year of the pair.
function selectedYears(data, state) {
  const index = data.years.indexOf(state.yoy);
  const later = index >= 1 ? index : data.years.length - 1;
  return later >= 1 ? { year: data.years[later], prior: data.years[later - 1] } : null;
}

function yearControls(data, ctx) {
  const years = selectedYears(data, ctx.state);
  if (!years) return null;
  return h('div', { class: 'page-controls' }, selectControl({
    id: 'cfam-yoy',
    label: 'Year over year',
    value: years.year,
    options: data.years.slice(1).reverse().map((year) => ({ value: year, label: `${year} vs ${data.years[data.years.indexOf(year) - 1]}` })),
    onChange: (value) => {
      ctx.state.yoy = value;
      ctx.rerender();
    },
  }));
}

function domainOption(data, curr, narrow) {
  // Highest score at the top: ECharts draws a category axis from the bottom up.
  const rows = data.questions
    .map((label, question) => ({ label, entry: scoreAt(data.overall, 'quarters', curr.id, question) }))
    .filter((row) => row.entry)
    .sort((a, b) => a.entry.score - b.entry.score);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => {
        const { label, entry } = rows[params.dataIndex];
        return tooltipContent(label, [{ label: curr.label, value: percent(entry) }, { label: 'Surveys', value: String(entry.n) }]);
      },
    },
    grid: { top: 10, right: 60, bottom: 10, left: 10, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: narrow ? 50 : 20,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.label),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#374151', fontSize: narrow ? 11 : 12, width: narrow ? 100 : 240, overflow: 'break' },
    },
    series: [{
      type: 'bar',
      barWidth: 22,
      data: rows.map(({ entry }) => ({
        value: entry.score,
        itemStyle: { color: qualified(entry, data) ? BAR_COLOR : BAR_LOW_N_COLOR, borderRadius: [0, 4, 4, 0] },
      })),
      label: { show: true, position: 'right', color: '#374151', fontSize: 12, fontWeight: 600, formatter: (p) => `${fixed(p.value)}%` },
    }],
  };
}

function yearOverYear(data, ctx) {
  const years = selectedYears(data, ctx.state);
  if (!years) return null;
  const { year, prior } = years;
  return [
    sectionHeader('Year over Year', `${year} vs ${prior} · All CFAM units`),
    h('div', { class: 'insight-grid' }, data.questions.map((label, question) => {
      const later = scoreAt(data.overall, 'years', year, question);
      const earlier = scoreAt(data.overall, 'years', prior, question);
      const delta = change(earlier, later);
      return h('div', { class: 'insight-item' },
        h('div', { class: 'insight-label' }, label),
        h('div', { class: 'insight-value' }, percent(later)),
        h('div', { class: 'insight-detail' }, delta == null
          ? 'Not enough data to compare'
          : [h('span', { class: `insight-change ${trendTone(earlier, later, data)}` }, points(delta)), ` vs ${prior} (${percent(earlier)})`]),
        h('div', { class: 'insight-n' }, `n=${later?.n ?? 0} in ${year}, n=${earlier?.n ?? 0} in ${prior}`));
    })),
  ];
}

// The largest score changes, either way, between the latest two complete quarters, for any unit and
// domain with at least minN surveys in both.
function movers(data, curr, prev) {
  if (!prev) return null;
  const rows = data.units
    .flatMap((unit) => data.questions.map((label, question) => ({
      name: unit.name,
      label,
      prev: scoreAt(unit, 'quarters', prev.id, question),
      curr: scoreAt(unit, 'quarters', curr.id, question),
    })))
    .filter((row) => qualified(row.prev, data) && qualified(row.curr, data))
    .map((row) => ({ ...row, delta: change(row.prev, row.curr) }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, MOVER_COUNT);
  return [
    sectionHeader('Biggest Movers', `${curr.label} vs ${prev.label}`),
    rows.length === 0
      ? h('p', { class: 'page-note' }, `No unit had ${data.minN} or more surveys on a domain in both quarters.`)
      : h('div', { class: 'focus-list' }, rows.map((row) => h('div', { class: `focus-item mover-${row.delta > 0 ? 'up' : row.delta < 0 ? 'down' : 'flat'}` },
        h('span', { class: 'focus-unit' }, row.name),
        h('span', { class: 'focus-domain' }, row.label),
        h('span', { class: 'focus-score' }, `${fixed(row.prev.score)}% → ${fixed(row.curr.score)}% (n=${row.curr.n})`),
        h('span', { class: `focus-trend ${trendTone(row.prev, row.curr, data)}` }, points(row.delta))))),
    h('p', { class: 'chart-note' }, `The ${MOVER_COUNT} largest changes, up or down, among units and domains with at least ${data.minN} surveys in both quarters.`),
  ];
}

function momentumTable(data) {
  return h('table', { class: 'data-table momentum-table' },
    h('thead', {}, h('tr', {},
      h('th', { scope: 'col' }, 'Unit'),
      data.quarters.map((quarter) => h('th', { scope: 'col', class: 'num' }, quarter.label)),
      h('th', { scope: 'col', class: 'num' }, 'Streak'))),
    h('tbody', {}, data.units.map((unit) => {
      const unitStreak = streak(unit, data);
      return h('tr', {},
        h('td', { class: 'name' }, unit.name),
        data.quarters.map((quarter) => scoreTd(scoreAt(unit, 'quarters', quarter.id, KEY), data)),
        h('td', { class: `num streak ${changeTone(unitStreak)}` }, streakText(unitStreak)));
    })));
}

// CFAM against the benchmark group, every domain, in the latest complete quarter both have surveys.
function benchmark(data) {
  const quarter = data.quarters.filter((q) => q.complete).reverse().find((q) => scoreAt(data.overall, 'quarters', q.id, KEY)
    && scoreAt(data.benchmark, 'quarters', q.id, KEY));
  const { name, short } = data.benchmark;
  if (!quarter) {
    return [sectionHeader('Benchmark', `CFAM vs ${name}`), h('p', { class: 'page-note' }, 'No quarter with surveys from both to compare.')];
  }
  const barRow = (label, entry, className) => h('div', { class: 'bench-bar-row' },
    h('span', { class: 'bench-bar-label' }, label),
    h('span', { class: 'bench-bar-track' },
      entry && h('span', { class: `bench-bar-fill ${className}`, style: { width: `${entry.score}%` } })),
    h('span', { class: 'bench-bar-val' }, entry ? `${percent(entry)} (n=${entry.n})` : 'no surveys'));
  return [
    sectionHeader('Benchmark', `CFAM vs ${name} · ${quarter.label}`),
    card({ title: `CFAM vs ${name} by Domain`, icon: 'building' },
      data.questions.map((label, question) => {
        const ours = scoreAt(data.overall, 'quarters', quarter.id, question);
        const theirs = scoreAt(data.benchmark, 'quarters', quarter.id, question);
        const gap = change(theirs, ours);
        return h('div', { class: 'bench-row' },
          h('div', { class: 'bench-label' }, label,
            gap != null && h('span', { class: `bench-gap ${trendTone(theirs, ours, data)}` }, `CFAM ${points(gap)}`)),
          h('div', { class: 'bench-bars' }, barRow('CFAM', ours, 'bench-ours'), barRow(short, theirs, 'bench-theirs')));
      }),
      h('p', { class: 'chart-note' }, `${name} is every unit in that group combined. Bars start at 0%.`)),
  ];
}
