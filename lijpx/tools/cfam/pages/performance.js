// Unit Performance: how each unit is doing on one domain and whether it is improving (latest complete
// quarter or year against the one before), each unit's lowest-scoring domain, and the score heat map.
// Replaces v1's chart of seven domain lines over twenty quarters.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { append, h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4796f631fd';
import { card, emptyState, sectionHeader, selectControl } from '../../../shell/ui.js?v=08586281b3';
import { BAR_COLOR, BAR_LOW_N_COLOR, change, comparison, isNarrow, percent, points, qualified, scoreAt, scoreTd, shadeLegend, trendTone } from '../model.js?v=6dd27ff358';

// The earlier period in gray, so the latest period carries the color. A bar with fewer than minN
// surveys uses the faded shade of its color.
const PREV_COLOR = '#c4ced9';
const PREV_LOW_N_COLOR = '#e6ebf0';

export default {
  id: 'performance',
  title: 'Unit Performance',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const cmp = comparison(data, ctx.state.compare);
    if (!cmp.curr || !cmp.prev) {
      container.append(emptyState('activity', 'Not enough data yet', 'Unit Performance needs two complete quarters.'));
      return;
    }
    const question = selectedQuestion(data, ctx.state);
    const rows = unitRows(data, cmp, question);
    const chartEl = h('div', { class: 'chart', style: { height: `${Math.max(240, rows.length * 64 + 60)}px` } });
    append(container, [
      h('div', { class: 'page-controls' }, compareControl(data, ctx, cmp), questionControl(data, ctx, question)),
      sectionHeader('Unit Scores', `${cmp.curr.label} vs ${cmp.prev.label}`),
      card({ title: `${data.questions[question]} by Unit`, icon: 'activity' },
        rows.length > 0 ? chartEl : emptyState('activity', 'No surveys', `No unit had surveys on this domain in ${cmp.prev.label} or ${cmp.curr.label}.`),
        h('p', { class: 'chart-note' },
          `Units with surveys in either period, sorted by their ${cmp.curr.label} score. Faded bars have fewer than ${data.minN} `
          + 'surveys and are listed last; read them with care. Bars start at 0%. The change after each latest bar is in points.')),
      focusAreas(data, cmp),
      heatMap(data, cmp),
    ]);
    if (rows.length > 0) ctx.chart(chartEl, barOption(data, cmp, rows, isNarrow(chartEl)));
  },

  exports(data, ctx) {
    const cmp = comparison(data, ctx.state.compare);
    if (!cmp.curr || !cmp.prev) return null;
    return {
      columns: [
        { key: 'unit', label: 'Unit' },
        { key: 'question', label: 'Domain' },
        { key: 'prev', label: `${cmp.prev.label} Score`, decimals: 1 },
        { key: 'prevN', label: `${cmp.prev.label} n`, decimals: 0 },
        { key: 'curr', label: `${cmp.curr.label} Score`, decimals: 1 },
        { key: 'currN', label: `${cmp.curr.label} n`, decimals: 0 },
        { key: 'change', label: 'Change', decimals: 1 },
      ],
      rows: data.units.flatMap((unit) => data.questions.map((label, question) => {
        const prev = scoreAt(unit, cmp.key, cmp.prev.id, question);
        const curr = scoreAt(unit, cmp.key, cmp.curr.id, question);
        return {
          unit: unit.name,
          question: label,
          prev: prev?.score ?? null,
          prevN: prev?.n ?? null,
          curr: curr?.score ?? null,
          currN: curr?.n ?? null,
          change: change(prev, curr),
        };
      }).filter((row) => row.prevN != null || row.currN != null)),
    };
  },
};

function selectedQuestion(data, state) {
  const question = Number(state.question);
  return Number.isInteger(question) && question >= 0 && question < data.questions.length ? question : 0;
}

function compareControl(data, ctx, cmp) {
  const choices = [comparison(data, 'quarter')];
  if (data.years.length >= 2) choices.push(comparison(data, 'year'));
  return selectControl({
    id: 'cfam-compare',
    label: 'Compare',
    value: cmp.mode,
    options: choices.map((choice) => ({ value: choice.mode, label: `${choice.curr.label} vs ${choice.prev.label}` })),
    onChange: (value) => {
      ctx.state.compare = value;
      ctx.rerender();
    },
  });
}

function questionControl(data, ctx, question) {
  return selectControl({
    id: 'cfam-question',
    label: 'Domain',
    value: String(question),
    options: data.questions.map((label, i) => ({ value: String(i), label })),
    onChange: (value) => {
      ctx.state.question = value;
      ctx.rerender();
    },
  });
}

// Units with surveys on the question in either period: enough surveys first, then too few, then
// none in the latest period; by latest score within each group.
function unitRows(data, cmp, question) {
  const group = (row) => (qualified(row.curr, data) ? 0 : row.curr ? 1 : 2);
  return data.units
    .map((unit) => {
      const prev = scoreAt(unit, cmp.key, cmp.prev.id, question);
      const curr = scoreAt(unit, cmp.key, cmp.curr.id, question);
      return { name: unit.name, prev, curr, delta: change(prev, curr) };
    })
    .filter((row) => row.prev || row.curr)
    .sort((a, b) => group(a) - group(b) || (b.curr ?? b.prev).score - (a.curr ?? a.prev).score);
}

// narrow: a phone-width chart, which gets shorter labels, wrapped unit names and fewer axis ticks.
function barOption(data, cmp, rows, narrow) {
  const ordered = [...rows].reverse(); // ECharts draws a category axis from the bottom up
  const scoreWithN = (entry) => {
    if (!entry) return 'no surveys';
    return narrow ? `${fixed(entry.score)}% n=${entry.n}` : `${fixed(entry.score)}% (n=${entry.n})`;
  };
  const bar = (entry, color, lowNColor) => (entry ? { value: entry.score, itemStyle: { color: qualified(entry, data) ? color : lowNColor } } : '-');
  const deltaStyle = (row) => {
    const tone = trendTone(row.prev, row.curr, data);
    return tone === 'tone-green' ? 'up' : tone === 'tone-red' ? 'down' : 'flat';
  };
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const row = ordered[params[0].dataIndex];
        return tooltipContent(row.name, [
          { color: PREV_COLOR, label: cmp.prev.label, value: scoreWithN(row.prev) },
          { color: BAR_COLOR, label: cmp.curr.label, value: scoreWithN(row.curr) },
          { label: 'Change', value: points(row.delta) },
        ]);
      },
    },
    legend: { top: 0, textStyle: { color: '#374151', fontSize: 12 } },
    grid: { top: 36, right: narrow ? 112 : 150, bottom: 10, left: 10, containLabel: true },
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
      data: ordered.map((row) => row.name),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#374151', fontSize: narrow ? 11 : 12, fontWeight: 500, width: narrow ? 72 : 200, overflow: 'break' },
    },
    series: [
      {
        name: cmp.prev.label,
        type: 'bar',
        barWidth: 14,
        barGap: '25%',
        itemStyle: { color: PREV_COLOR, borderRadius: [0, 4, 4, 0] },
        data: ordered.map((row) => bar(row.prev, PREV_COLOR, PREV_LOW_N_COLOR)),
        label: { show: true, position: 'right', color: '#6b7280', fontSize: 11, formatter: (p) => scoreWithN(ordered[p.dataIndex].prev) },
      },
      {
        name: cmp.curr.label,
        type: 'bar',
        barWidth: 14,
        itemStyle: { color: BAR_COLOR, borderRadius: [0, 4, 4, 0] },
        data: ordered.map((row) => bar(row.curr, BAR_COLOR, BAR_LOW_N_COLOR)),
        label: {
          show: true,
          position: 'right',
          formatter: (p) => {
            const row = ordered[p.dataIndex];
            const delta = row.delta == null ? '' : `  {${deltaStyle(row)}|${signed(row.delta)}}`;
            return `{value|${scoreWithN(row.curr)}}${delta}`;
          },
          rich: {
            value: { color: '#1a1a2e', fontSize: 11, fontWeight: 600 },
            up: { color: '#15803d', fontSize: 11, fontWeight: 700 },
            down: { color: '#dc2626', fontSize: 11, fontWeight: 700 },
            flat: { color: '#6b7280', fontSize: 11, fontWeight: 700 },
          },
        },
      },
    ],
  };
}

// Each unit's lowest-scoring domain in the latest period, among domains with enough surveys.
function focusAreas(data, cmp) {
  const rows = data.units
    .map((unit) => {
      const candidates = data.questions
        .map((label, question) => ({
          label,
          prev: scoreAt(unit, cmp.key, cmp.prev.id, question),
          curr: scoreAt(unit, cmp.key, cmp.curr.id, question),
        }))
        .filter((candidate) => qualified(candidate.curr, data));
      if (candidates.length === 0) return null;
      return { name: unit.name, ...candidates.reduce((low, candidate) => (candidate.curr.score < low.curr.score ? candidate : low)) };
    })
    .filter(Boolean)
    .sort((a, b) => a.curr.score - b.curr.score);
  return [
    sectionHeader('Focus Areas', `Lowest-scoring domain per unit · ${cmp.curr.label}`),
    rows.length === 0
      ? h('p', { class: 'page-note' }, `No unit had ${data.minN} or more surveys on any domain in ${cmp.curr.label}.`)
      : h('div', { class: 'focus-list' }, rows.map((row) => {
        const delta = change(row.prev, row.curr);
        return h('div', { class: 'focus-item' },
          h('span', { class: 'focus-unit' }, row.name),
          h('span', { class: 'focus-domain' }, row.label),
          h('span', { class: 'focus-score' }, `${percent(row.curr)} (n=${row.curr.n})`),
          h('span', { class: `focus-trend ${trendTone(row.prev, row.curr, data)}` },
            delta == null ? `no ${cmp.prev.label} surveys` : `${points(delta)} vs ${cmp.prev.label}`));
      })),
    h('p', { class: 'chart-note' }, `Only domains with at least ${data.minN} surveys in ${cmp.curr.label} count. Units without any are left out.`),
  ];
}

function heatMap(data, cmp) {
  return [
    sectionHeader('Score Heat Map', cmp.curr.label),
    card({ title: 'Every Domain by Unit', icon: 'grid' },
      h('div', { class: 'data-table-wrap' }, h('table', { class: 'data-table heat-table' },
        h('thead', {}, h('tr', {},
          h('th', { scope: 'col' }, 'Unit'),
          data.questions.map((label) => h('th', { scope: 'col', class: 'num' }, label)),
          h('th', { scope: 'col', class: 'num' }, 'Surveys'))),
        h('tbody', {}, data.units.map((unit) => {
          const entries = data.questions.map((_, question) => scoreAt(unit, cmp.key, cmp.curr.id, question));
          const surveys = Math.max(0, ...entries.map((entry) => entry?.n ?? 0));
          return h('tr', {},
            h('td', { class: 'name' }, unit.name),
            entries.map((entry) => scoreTd(entry, data)),
            h('td', { class: 'num n-cell' }, surveys > 0 ? String(surveys) : '--'));
        })))),
      shadeLegend(data)),
  ];
}
