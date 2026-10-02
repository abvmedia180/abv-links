// Snapshot: one quarter at a glance, the latest complete one unless another is picked. The site
// average and its trend, the five quietest and five loudest units, and every unit below 50.
// Changes are against the previous complete quarter.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4974441338';
import { icon } from '../../../shell/icons.js?v=5a859aeff6';
import { card, emptyState, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import { GRID_LINE, quarterAxis, scoreAxisLabel } from '../chart-style.js?v=8c8fddad0c';
import {
  ALERT_BELOW, accented, divisionBadge, previousQuarter, quarterControl, quarterNote, quarterRanking,
  scoreBand, selectedQuarter, siteAverage, trendTone,
} from '../model.js?v=2a5c448782';

const SITE_LINE = '#0059A5';

export default {
  id: 'snapshot',
  title: 'Snapshot',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const quarter = selectedQuarter(data, ctx.state);
    const controls = h('div', { class: 'page-controls' }, quarterControl(data, ctx, quarter));
    const ranking = quarterRanking(data, quarter);
    if (ranking.length === 0) {
      container.append(controls, emptyState('moon', 'No scored units', `No unit has at least ${data.minN} responses in ${quarter.id}.`));
      return;
    }
    const previous = previousQuarter(data, quarter);
    const site = siteAverage(data, quarter.id);
    const previousSite = previous && siteAverage(data, previous.id);
    const top = ranking[0];
    const bottom = ranking.at(-1);
    const below = ranking.filter((row) => row.score < ALERT_BELOW);
    const ranked = ranking.map((row, i) => ({ row, rank: i + 1 }));
    const trendEl = h('div', { class: 'chart q-chart-sm' });
    container.append(
      controls,
      quarterNote(data, quarter),
      h('div', { class: 'kpi-row q-kpi-row-5' },
        accented(kpiCard({ label: 'Site Average', count: site, decimals: 1, sub: quarter.label }, ctx), 'blue',
          previousSite != null && h('div', { class: `q-kpi-delta ${trendTone(site - previousSite)}` },
            `${signed(site - previousSite)} vs ${previous.id}`)),
        accented(kpiCard({ label: 'Quietest', count: top.score, decimals: 1, sub: top.unit }, ctx), 'green'),
        accented(kpiCard({ label: 'Needs Work', count: bottom.score, decimals: 1, sub: bottom.unit }, ctx), 'red'),
        accented(kpiCard({ label: `Below ${ALERT_BELOW}`, count: below.length, sub: `of ${ranking.length} units` }, ctx),
          below.length > 0 ? 'gold' : 'accent'),
        accented(kpiCard({
          label: 'Improving',
          count: ranking.filter((row) => Math.round(row.delta * 10) / 10 > 0).length,
          sub: previous ? `up on ${previous.id}` : 'QoQ improvement',
        }, ctx), 'accent'),
      ),
      card({ title: 'Site Average Trend (Quarterly)' }, trendEl),
      h('div', { class: 'q-rank-grid' },
        rankColumn('Top 5 Quietest', 'top', ranked.slice(0, 5), data),
        rankColumn('Bottom 5', 'bottom', ranked.slice(-5).reverse(), data)),
      alerts(below),
    );
    ctx.chart(trendEl, siteTrendOption(data));
  },

  exports(data, ctx) {
    const quarter = selectedQuarter(data, ctx.state);
    const ranking = quarterRanking(data, quarter);
    if (ranking.length === 0) return null;
    const previous = previousQuarter(data, quarter);
    return {
      columns: [
        { key: 'rank', label: 'Rank', decimals: 0 },
        { key: 'unit', label: 'Unit' },
        { key: 'division', label: 'Division' },
        { key: 'score', label: `${quarter.label} Score`, decimals: 1 },
        { key: 'n', label: 'n', decimals: 0 },
        { key: 'change', label: previous ? `Change vs ${previous.id}` : 'Change', decimals: 1 },
      ],
      rows: ranking.map((row, i) => ({
        rank: i + 1, unit: row.unit, division: row.division, score: row.score, n: row.n, change: row.delta,
      })),
    };
  },
};

// Bottom 5 lists the loudest unit first, under its real rank.
function rankColumn(title, kind, items, data) {
  return h('section', { class: `q-rank-col ${kind}` },
    h('h3', { class: 'q-rank-heading' }, title),
    items.map(({ row, rank }) => h('div', { class: 'q-rank-item' },
      h('div', { class: `q-rank-pos${kind === 'top' && rank <= 3 ? ` place-${rank}` : ''}` }, String(rank)),
      h('div', { class: 'q-rank-info' },
        h('div', { class: 'q-rank-name' }, row.unit),
        row.division && divisionBadge(data, row.division, 'q-rank-div')),
      row.delta == null
        ? h('div', { class: 'q-rank-trend q-flat' }, '--')
        : h('div', { class: `q-rank-trend ${trendTone(row.delta)}` }, signed(row.delta)),
      h('div', { class: `q-rank-score ${scoreBand(row.score)}` }, fixed(row.score)),
    )));
}

function alerts(below) {
  if (below.length === 0) return h('p', { class: 'q-all-clear' }, `All units at ${ALERT_BELOW} or above this quarter`);
  return h('section', { class: 'q-alerts' },
    h('h3', { class: 'q-section-title' }, icon('alert-triangle', { size: 16 }), `Units Below ${ALERT_BELOW} - Needs Attention`),
    h('div', { class: 'q-alert-list' }, below.map((row) => h('div', { class: `q-alert ${scoreBand(row.score)}` },
      h('strong', {}, row.unit), ` ${fixed(row.score)} (n=${row.n})`))),
  );
}

function siteTrendOption(data) {
  const quarters = data.quarters.map((quarter) => quarter.id);
  const labels = data.quarters.map((quarter) => quarter.label);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      formatter: ([params]) => tooltipContent(params.name, [
        { color: SITE_LINE, label: 'Site Average', value: params.value == null ? '--' : fixed(params.value) },
      ]),
    },
    grid: { left: 10, right: 20, top: 16, bottom: 8, containLabel: true }, // room for long slanted quarter labels
    xAxis: quarterAxis(labels, 10),
    yAxis: {
      type: 'value',
      min: (extent) => Math.min(30, Math.floor(extent.min / 10) * 10),
      max: (extent) => Math.max(80, Math.ceil(extent.max / 10) * 10),
      axisLabel: scoreAxisLabel(10),
      splitLine: GRID_LINE,
    },
    series: [{
      name: 'Site Average',
      type: 'line',
      data: quarters.map((id) => siteAverage(data, id)),
      smooth: 0.3,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3, color: SITE_LINE },
      itemStyle: { color: SITE_LINE },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(0, 89, 165, 0.15)' }, { offset: 1, color: 'rgba(0, 89, 165, 0)' }],
        },
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#dc2626', width: 1 },
        label: { formatter: `${ALERT_BELOW} threshold`, position: 'insideEndTop', fontSize: 10, color: '#dc2626' },
        data: [{ yAxis: ALERT_BELOW }],
      },
    }],
  };
}
