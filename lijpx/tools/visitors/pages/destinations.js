// Destinations: where visitors said they were going. The source lists destinations over every logged
// day without a date breakdown, so only the entry point filter applies here.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { whole } from '../../../shell/format.js?v=4796f631fd';
import { card } from '../../../shell/ui.js?v=08586281b3';
import { COLORS, filterControls, frozenNotice, isNarrow, scopeLine, selection, thousands } from '../model.js?v=549548d47e';

const CHART_ROWS = 25;

export default {
  id: 'destinations',
  title: 'Destinations',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const sel = selection(data, ctx.state);
    const list = listed(data, sel);
    const shown = list.items.slice(0, CHART_ROWS);
    const chartEl = h('div', { class: 'chart', style: { height: `${shown.length * 20 + 40}px` } });
    container.append(
      frozenNotice(data),
      filterControls(data, ctx, { dates: false }),
      scopeLine(data, sel, { dates: false }),
      h('p', { class: 'vis-note' },
        `${data.destinations.note} ${whole(data.destinations.records)} visit records name a destination. `,
        'The month and day filters do not apply on this page.'),
      card({ title: `Top ${shown.length} destinations`, icon: 'square' },
        h('p', { class: 'vis-caption' },
          `The ${shown.length} most visited destinations ${list.scope}.`, list.split && ' Hover a bar for where those visitors came in.'),
        chartEl),
      card({ title: 'All listed destinations', icon: 'grid' },
        h('p', { class: 'vis-caption' }, `The ${list.items.length} destinations the logs list ${list.scope}, with each one's share of that list.`),
        h('div', { class: 'data-table-wrap' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {},
            h('th', { scope: 'col' }, 'Destination'),
            h('th', { scope: 'col', class: 'num' }, 'Visitors'),
            h('th', { scope: 'col', class: 'num' }, 'Share of Listed'),
            list.split && data.entries.map((entry) => h('th', { scope: 'col', class: 'num' }, `From ${entry.short}`)))),
          h('tbody', {}, list.items.map((item) => h('tr', {},
            h('td', { class: 'name' }, item.unit),
            h('td', { class: 'num' }, whole(item.count)),
            h('td', { class: 'num' }, `${((100 * item.count) / list.total).toFixed(1)}%`),
            list.split && item.byEntry.map((n) => h('td', { class: 'num' }, n ? whole(n) : '--'))))))),
        list.split && h('p', { class: 'vis-legend' }, data.entries.map((entry) => `${entry.short} = ${entry.name}`).join(' · '))),
    );
    ctx.chart(chartEl, chartOption(data, list, shown, isNarrow(chartEl)));
  },

  exports(data, ctx) {
    const list = listed(data, selection(data, ctx.state));
    return {
      columns: [
        { key: 'unit', label: 'Destination' },
        { key: 'count', label: 'Visitors', decimals: 0 },
        { key: 'share', label: 'Share of Listed (%)', decimals: 1 },
        ...(list.split ? data.entries.map((entry, i) => ({ key: `e${i}`, label: `From ${entry.name}`, decimals: 0 })) : []),
      ],
      rows: list.items.map((item) => ({
        unit: item.unit,
        count: item.count,
        share: (100 * item.count) / list.total,
        ...(list.split ? Object.fromEntries(item.byEntry.map((n, i) => [`e${i}`, n])) : {}),
      })),
    };
  },
};

// All entry points: the overall top list, with each destination's split by entry point.
// One entry point: that entry point's own top list.
function listed(data, sel) {
  const { destinations } = data;
  const items = sel.entry == null ? destinations.top : destinations.byEntry[sel.entry];
  return {
    items,
    split: sel.entry == null,
    total: items.reduce((sum, item) => sum + item.count, 0),
    scope: sel.entry == null ? 'across all entry points' : `for visitors entering through ${data.entries[sel.entry].name}`,
  };
}

function chartOption(data, list, shown, narrow) {
  // Largest at the top: a category axis is drawn from the bottom up.
  const rows = [...shown].reverse();
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => {
        const item = rows[params.dataIndex];
        const origins = list.split
          ? data.entries
            .map((entry, i) => ({ entry, n: item.byEntry[i] }))
            .filter(({ n }) => n > 0)
            .sort((a, b) => b.n - a.n)
            .map(({ entry, n }) => ({ color: entry.color, label: entry.name, value: whole(n), note: `${((100 * n) / item.count).toFixed(1)}%` }))
          : [];
        return tooltipContent(item.unit, [{ label: 'Visitors', value: whole(item.count) }, ...origins]);
      },
    },
    grid: { top: 10, right: 60, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'value', splitNumber: narrow ? 3 : 5, axisLine: AXIS_STYLE.line, splitLine: AXIS_STYLE.split, axisLabel: { ...AXIS_STYLE.valueLabel, formatter: thousands } },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.unit),
      axisLine: AXIS_STYLE.line,
      axisLabel: { ...AXIS_STYLE.label, width: 170, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 16,
      data: rows.map((item) => item.count),
      itemStyle: { color: COLORS.primary, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#374151', fontSize: 10, formatter: (params) => whole(params.value) },
    }],
  };
}
