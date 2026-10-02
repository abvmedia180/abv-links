// Overview: CFAM-wide results for the latest complete quarter, the key question's trend, the unit
// rankings and survey volume.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { append, h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4974441338';
import { card, emptyState, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import { BAR_COLOR, KEY, UNIT_COLORS, change, latestQuarters, percent, points, qualified, scoreAt, trendTone } from '../model.js?v=eb6dd377a5';

export default {
  id: 'overview',
  title: 'Overview',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const { curr, prev } = latestQuarters(data);
    if (!curr) {
      container.append(emptyState('activity', 'No complete quarter yet', 'The overview needs at least one full quarter of surveys.'));
      return;
    }
    const overall = scoreAt(data.overall, 'quarters', curr.id, KEY);
    const overallPrev = prev && scoreAt(data.overall, 'quarters', prev.id, KEY);
    const rows = unitRanking(data, curr, prev);
    const ranked = rows.filter((row) => qualified(row.curr, data));
    const best = ranked[0] ?? null;
    const lowest = ranked.length > 1 ? ranked.at(-1) : null;
    const hasLowN = data.quarters.some((quarter) => {
      const entry = scoreAt(data.overall, 'quarters', quarter.id, KEY);
      return entry && !qualified(entry, data);
    });
    const trendEl = h('div', { class: 'chart chart-trend' });
    const volumeEl = h('div', { class: 'chart' });
    append(container, [
      summary(data, curr, prev, overall, overallPrev, best, lowest),
      partialNote(data, curr),
      h('div', { class: 'kpi-row' },
        kpiCard({
          label: 'Overall Score',
          value: percent(overall),
          sub: prev ? `${curr.label} | ${points(change(overallPrev, overall))} vs ${prev.label}` : curr.label,
        }, ctx),
        kpiCard({ label: 'Total Surveys', count: overall?.n ?? 0, sub: curr.label }, ctx),
        kpiCard({ label: 'Highest Score', value: percent(best?.curr), sub: unitWithN(best) }, ctx),
        kpiCard({ label: 'Lowest Score', value: percent(lowest?.curr), sub: unitWithN(lowest) }, ctx),
        kpiCard({ label: 'Active Units', count: data.units.length, sub: `of ${data.totalUnits} total` }, ctx),
      ),
      card({ title: `Unit Rankings - ${curr.label}`, icon: 'award' },
        rankList(rows, data),
        h('p', { class: 'chart-note' },
          `${data.questions[KEY]}. Ranked: units with at least ${data.minN} surveys.${prev ? ` Change is in points vs ${prev.label}.` : ''}`)),
      card({ title: `CFAM Overall Trend (${data.questions[KEY]})`, icon: 'activity' },
        trendEl,
        hasLowN && h('p', { class: 'chart-note' }, `Hollow gray points: fewer than ${data.minN} surveys that quarter.`)),
      card({ title: 'Survey Volume by Unit (Quarterly)', icon: 'users' }, volumeEl),
    ]);
    ctx.chart(trendEl, trendOption(data));
    ctx.chart(volumeEl, volumeOption(data));
  },

  exports(data) {
    return {
      columns: [
        { key: 'quarter', label: 'Quarter' },
        { key: 'score', label: `${data.questions[KEY]} (CFAM)`, decimals: 1 },
        { key: 'n', label: 'Surveys', decimals: 0 },
        ...data.units.map((unit, i) => ({ key: `unit${i}`, label: `${unit.name} Surveys`, decimals: 0 })),
      ],
      rows: data.quarters.map((quarter) => {
        const entry = scoreAt(data.overall, 'quarters', quarter.id, KEY);
        return {
          quarter: quarter.label,
          score: entry?.score ?? null,
          n: entry?.n ?? 0,
          ...Object.fromEntries(data.units.map((unit, i) => [`unit${i}`, scoreAt(unit, 'quarters', quarter.id, KEY)?.n ?? 0])),
        };
      }),
    };
  },
};

function unitWithN(row) {
  return row ? `${row.name} (n=${row.curr.n})` : 'no qualified unit';
}

// Units ranked on the key question: qualified units by score, then units with too few surveys, then none.
function unitRanking(data, curr, prev) {
  const group = (row) => (qualified(row.curr, data) ? 0 : row.curr ? 1 : 2);
  return data.units
    .map((unit) => ({
      name: unit.name,
      curr: scoreAt(unit, 'quarters', curr.id, KEY),
      prev: prev && scoreAt(unit, 'quarters', prev.id, KEY),
    }))
    .sort((a, b) => group(a) - group(b) || (b.curr?.score ?? 0) - (a.curr?.score ?? 0));
}

// The question with the lowest CFAM-wide score in the quarter, among those with enough surveys.
function weakestQuestion(data, curr) {
  return data.questions
    .map((label, question) => ({ label, entry: scoreAt(data.overall, 'quarters', curr.id, question) }))
    .filter(({ entry }) => qualified(entry, data))
    .sort((a, b) => a.entry.score - b.entry.score)[0] ?? null;
}

function summary(data, curr, prev, overall, overallPrev, best, lowest) {
  const question = data.questions[KEY];
  const parts = [];
  if (overall) {
    parts.push('CFAM scored ', h('strong', {}, percent(overall)), ` on "${question}" in ${curr.label} (n=${overall.n})`);
    const delta = change(overallPrev, overall);
    if (delta == null) parts.push('. ');
    else if (delta === 0) parts.push(`, unchanged from ${prev.label}. `);
    else parts.push(`, ${delta > 0 ? 'up' : 'down'} `, h('strong', {}, `${fixed(Math.abs(delta))} points`), ` from ${prev.label}. `);
  } else {
    parts.push(`No "${question}" surveys in ${curr.label}. `);
  }
  if (best) parts.push(h('strong', {}, best.name), ` led with ${percent(best.curr)}. `);
  if (lowest) parts.push(h('strong', {}, lowest.name), ` had the lowest score at ${percent(lowest.curr)}. `);
  const weakest = weakestQuestion(data, curr);
  if (weakest) parts.push(`"${weakest.label}" was the lowest-scoring domain across CFAM at ${percent(weakest.entry)}.`);
  return h('section', { class: 'exec-summary' },
    h('h2', { class: 'summary-label' }, `Executive Summary - ${curr.label}`),
    h('p', { class: 'summary-text' }, parts));
}

// Quarters after the latest complete one hold only some months; say so instead of comparing them.
function partialNote(data, curr) {
  const partial = data.quarters.slice(data.quarters.indexOf(curr) + 1);
  if (partial.length === 0) return null;
  return h('p', { class: 'page-note' },
    `${partial.map((quarter) => quarter.label).join(', ')} is a partial quarter, so comparisons use the latest complete quarter, ${curr.label}. `,
    `Surveys: ${data.dataRange}.`);
}

function rankList(rows, data) {
  let rank = 0;
  return h('ol', { class: 'rank-list' }, rows.map((row) => {
    const counted = qualified(row.curr, data);
    if (counted) rank += 1;
    const delta = change(row.prev, row.curr);
    return h('li', { class: 'rank-item' },
      h('span', { class: 'rank-num' }, counted ? String(rank) : '-'),
      h('span', { class: 'rank-name' }, row.name, row.curr && !counted && h('span', { class: 'low-n' }, 'Low n')),
      h('span', { class: 'rank-bar-wrap' },
        row.curr && h('span', { class: `rank-bar${counted ? '' : ' rank-bar-low'}`, style: { width: `${row.curr.score}%` } })),
      h('span', { class: `rank-score${row.curr ? '' : ' rank-none'}` }, row.curr ? percent(row.curr) : 'No surveys'),
      h('span', { class: 'rank-n' }, row.curr ? `n=${row.curr.n}` : ''),
      h('span', { class: `rank-change ${trendTone(row.prev, row.curr, data)}` }, delta == null ? '--' : signed(delta)),
    );
  }));
}

function trendOption(data) {
  const question = data.questions[KEY];
  const series = data.quarters.map((quarter) => ({ quarter, entry: scoreAt(data.overall, 'quarters', quarter.id, KEY) }));
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      formatter: ([params]) => {
        const { quarter, entry } = series[params.dataIndex];
        return tooltipContent(quarter.label, entry
          ? [{ label: question, value: percent(entry) }, { label: 'Surveys', value: String(entry.n) }]
          : [{ label: question, value: 'No surveys' }]);
      },
    },
    grid: { top: 20, right: 20, bottom: 10, left: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: series.map(({ quarter }) => quarter.label),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#374151', fontSize: 11, rotate: 45 },
    },
    yAxis: {
      type: 'value',
      min: (extent) => Math.max(0, Math.floor((extent.min - 10) / 10) * 10),
      max: 100,
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', formatter: '{value}%' },
    },
    series: [{
      name: question,
      type: 'line',
      smooth: true,
      connectNulls: true,
      symbolSize: 8,
      lineStyle: { width: 3, color: BAR_COLOR },
      itemStyle: { color: BAR_COLOR },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(0, 89, 165, 0.15)' }, { offset: 1, color: 'rgba(0, 89, 165, 0)' }],
        },
      },
      data: series.map(({ entry }) => {
        if (!entry) return '-';
        if (qualified(entry, data)) return { value: entry.score, symbol: 'circle' };
        return { value: entry.score, symbol: 'emptyCircle', itemStyle: { color: '#9ca3af' } };
      }),
    }],
  };
}

function volumeOption(data) {
  const labels = data.quarters.map((quarter) => quarter.label);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const rows = params.filter((p) => p.value > 0).map((p) => ({ color: p.color, label: p.seriesName, value: String(p.value) }));
        const total = params.reduce((sum, p) => sum + p.value, 0);
        return tooltipContent(labels[params[0].dataIndex], [...rows, { label: 'Total', value: String(total) }]);
      },
    },
    legend: { bottom: 0, textStyle: { color: '#374151', fontSize: 12 } },
    grid: { top: 30, right: 20, bottom: 40, left: 10, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#374151', fontSize: 11, rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: 'Surveys',
      nameTextStyle: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280' },
    },
    series: data.units.map((unit, i) => ({
      name: unit.name,
      type: 'bar',
      stack: 'surveys',
      barMaxWidth: 28,
      itemStyle: { color: UNIT_COLORS[i], borderColor: '#ffffff', borderWidth: 1 },
      data: data.quarters.map((quarter) => scoreAt(unit, 'quarters', quarter.id, KEY)?.n ?? 0),
    })),
  };
}
