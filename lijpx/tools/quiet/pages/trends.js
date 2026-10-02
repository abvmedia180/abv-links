// Trends: quarterly scores for the units picked with the chips (to start, the five quietest and the
// five loudest in the latest complete quarter), and every unit's change from the first complete
// quarter to the latest. A partial quarter is charted under its label but left out of the changes.
// The active chips carry their line's color, so they double as the legend on screen and on paper.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4974441338';
import { card, emptyState } from '../../../shell/ui.js?v=08586281b3';
import { GRID_LINE, quarterAxis, scoreAxis, scoreAxisLabel } from '../chart-style.js?v=8c8fddad0c';
import { SITE_COLOR, accent, changeOverTime, completeQuarters, latestQuarter, siteAverage, unitsInDivision } from '../model.js?v=2a5c448782';

// One color per line, enough for every unit today; past the end the colors repeat on a dotted line.
const LINE_COLORS = [
  '#0059A5', '#009CDA', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#ea580c',
  '#4f46e5', '#059669', '#b91c1c', '#ca8a04', '#0284c7', '#9333ea', '#e11d48', '#0d9488', '#c2410c', '#6d28d9',
  '#be185d', '#0e7490', '#a16207', '#15803d', '#9f1239', '#1d4ed8', '#047857', '#7e22ce', '#b45309', '#334155',
];
const UP = '#16a34a';
const DOWN = '#dc2626';

const lineColor = (i) => LINE_COLORS[i % LINE_COLORS.length];
const lineType = (i) => (i < LINE_COLORS.length ? 'solid' : 'dotted');

export default {
  id: 'trends',
  title: 'Trends',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const selected = selectedUnits(data, ctx.state);
    const changes = movers(data);
    const [first, last] = span(data);
    const lineEl = h('div', { class: 'chart q-chart' });
    const moversEl = changes.length > 0 && h('div', { class: 'chart', style: { height: `${Math.max(340, changes.length * 24 + 40)}px` } });
    container.append(
      card({ title: 'Quarterly Quietness Trend' },
        presetBar(data, ctx),
        unitChips(data, ctx, selected),
        lineEl),
      card({ title: `Biggest Movers (${first} to ${last})` },
        moversEl || emptyState('activity', 'No movers yet', `No unit is scored in both ${first} and ${last}.`)),
    );
    ctx.chart(lineEl, lineOption(data, selected));
    if (moversEl) ctx.chart(moversEl, moversOption(changes, first, last));
  },

  exports(data, ctx) {
    const ids = data.quarters.map((quarter) => quarter.id);
    const [first, last] = span(data);
    const row = (unit, division, values, change) => ({
      unit, division, ...Object.fromEntries(values.map((value, i) => [`q${i}`, value])), change,
    });
    const site = ids.map((id) => siteAverage(data, id));
    const siteFirst = site[ids.indexOf(first)];
    const siteLast = site[ids.indexOf(last)];
    return {
      columns: [
        { key: 'unit', label: 'Unit' },
        { key: 'division', label: 'Division' },
        ...data.quarters.map((quarter, i) => ({ key: `q${i}`, label: quarter.label, decimals: 1 })),
        { key: 'change', label: `Change ${first} to ${last}`, decimals: 1 },
      ],
      rows: [
        row('Site Average', null, site, siteFirst != null && siteLast != null ? siteLast - siteFirst : null),
        ...selectedUnits(data, ctx.state).map((unit) => row(unit.name, unit.division,
          ids.map((id) => unit.scores[id]?.score ?? null), changeOverTime(data, unit))),
      ],
    };
  },
};

// The first and latest complete quarters, the span every change on this page covers.
function span(data) {
  const complete = completeQuarters(data);
  return [complete[0].id, complete.at(-1).id];
}

// The quick selections above the chips: v1's Top/Bottom 5, All Units, and one per division.
function presets(data) {
  return [
    { key: 'top-bottom', label: 'Top/Bottom 5', units: topAndBottom(data) },
    { key: 'all', label: 'All Units', units: data.units },
    ...data.divisions.map((division) => ({ key: division.name, label: division.name, units: unitsInDivision(data, division.name), division })),
  ];
}

function topAndBottom(data) {
  const latest = latestQuarter(data).id;
  const ranked = data.units.filter((unit) => unit.scores[latest]).sort((a, b) => b.scores[latest].score - a.scores[latest].score);
  return [...new Set([...ranked.slice(0, 5), ...ranked.slice(-5)])];
}

// Units on the chart, in the order they were added (which sets their colors).
function selectedUnits(data, state) {
  if (!state.trendUnits) return topAndBottom(data);
  return state.trendUnits.map((name) => data.units.find((unit) => unit.name === name)).filter(Boolean);
}

// A chip toggled by hand clears the preset; until anything is picked, Top/Bottom 5 is on.
function presetBar(data, ctx) {
  const current = ctx.state.trendUnits ? ctx.state.trendPreset : 'top-bottom';
  return h('div', { class: 'q-chip-bar' }, presets(data).map((preset, i) => h('button', {
    type: 'button',
    id: `q-preset-${i}`,
    class: 'q-chip',
    'aria-pressed': String(preset.key === current),
    style: preset.division ? { borderColor: `${accent(data, preset.division.name).bar}40` } : null,
    onclick: () => {
      ctx.state.trendPreset = preset.key;
      ctx.state.trendUnits = preset.units.map((unit) => unit.name);
      ctx.rerender();
    },
  }, preset.label)));
}

// One row of chips per division (units the data leaves without a division share an "Other" row).
function unitChips(data, ctx, selected) {
  const colorOf = new Map(selected.map((unit, i) => [unit.name, lineColor(i)]));
  const groups = data.divisions.map((division) => ({
    label: division.name, colors: accent(data, division.name), units: unitsInDivision(data, division.name),
  }));
  const unassigned = data.units.filter((unit) => !unit.division);
  if (unassigned.length > 0) groups.push({ label: 'Other', colors: accent(data, null), units: unassigned });

  const toggle = (unit) => {
    const names = selected.map((item) => item.name);
    ctx.state.trendUnits = names.includes(unit.name) ? names.filter((name) => name !== unit.name) : [...names, unit.name];
    ctx.state.trendPreset = null;
    ctx.rerender();
  };
  return h('div', { class: 'q-unit-chips' },
    h('div', { class: 'q-chip-key' }, h('span', { class: 'q-key-dash' }), 'Site Average'),
    groups.filter((group) => group.units.length > 0).map((group) => h('div', { class: 'q-chip-group' },
      h('span', { class: 'q-chip-group-label', style: { background: group.colors.bg, color: group.colors.text } }, group.label),
      group.units.map((unit) => {
        const color = colorOf.get(unit.name);
        return h('button', {
          type: 'button',
          id: `q-unit-${data.units.indexOf(unit)}`,
          class: 'q-unit-chip',
          'aria-pressed': String(Boolean(color)),
          onclick: () => toggle(unit),
        }, color && h('span', { class: 'q-chip-dot', style: { background: color } }), unit.name);
      }))),
  );
}

function lineOption(data, selected) {
  const ids = data.quarters.map((quarter) => quarter.id);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      formatter: (params) => tooltipContent(params[0].axisValue, params
        .filter((p) => p.value != null)
        .sort((a, b) => b.value - a.value)
        .map((p) => ({ color: p.color, label: p.seriesName, value: fixed(p.value) }))),
    },
    grid: { left: 10, right: 20, top: 20, bottom: 8, containLabel: true }, // room for long slanted quarter labels
    xAxis: quarterAxis(data.quarters.map((quarter) => quarter.label)),
    yAxis: scoreAxis(),
    series: [
      {
        name: 'Site Average',
        type: 'line',
        data: ids.map((id) => siteAverage(data, id)),
        lineStyle: { type: 'dashed', color: SITE_COLOR, width: 2 },
        itemStyle: { color: SITE_COLOR },
        symbol: 'none',
        z: 0,
      },
      ...selected.map((unit, i) => ({
        name: unit.name,
        type: 'line',
        data: ids.map((id) => unit.scores[id]?.score ?? null),
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: lineColor(i), type: lineType(i) },
        itemStyle: { color: lineColor(i) },
        emphasis: { focus: 'series' },
        connectNulls: true,
      })),
    ],
  };
}

// Units scored in both the first and the latest complete quarter, biggest gain first.
function movers(data) {
  return data.units
    .map((unit) => ({ unit: unit.name, change: changeOverTime(data, unit) }))
    .filter((item) => item.change != null)
    .sort((a, b) => b.change - a.change);
}

function moversOption(changes, first, last) {
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{
        color: params.value >= 0 ? UP : DOWN, label: `${first} to ${last}`, value: `${signed(params.value)} pts`,
      }]),
    },
    grid: { left: 100, right: 50, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      axisLabel: { ...scoreAxisLabel(), formatter: (value) => signed(value, 0) },
      splitLine: GRID_LINE,
    },
    yAxis: {
      type: 'category',
      data: changes.map((item) => item.unit),
      inverse: true,
      axisLabel: { fontSize: 10, color: '#1a1a2e', fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      name: 'Change',
      type: 'bar',
      barMaxWidth: 16,
      data: changes.map((item) => ({
        value: item.change,
        itemStyle: { color: item.change >= 0 ? UP : DOWN, borderRadius: item.change >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
        label: { color: item.change >= 0 ? '#15803d' : DOWN },
      })),
      label: {
        show: true,
        position: 'right',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10,
        fontWeight: 600,
        formatter: (params) => signed(params.value),
      },
    }],
  };
}
