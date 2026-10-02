// Divisions: each division's response-weighted average for one quarter (the latest complete one
// unless another is picked) with its units, and every division's average across all quarters.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed } from '../../../shell/format.js?v=4796f631fd';
import { card, emptyState, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import { quarterAxis, scoreAxis } from '../chart-style.js?v=8c8fddad0c';
import {
  SITE_COLOR, accent, accented, divisionAverage, divisionBadge, divisionRanking, quarterControl, quarterNote,
  scoreBand, selectedQuarter, siteAverage,
} from '../model.js?v=2a5c448782';

export default {
  id: 'divisions',
  title: 'Divisions',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const quarter = selectedQuarter(data, ctx.state);
    const controls = h('div', { class: 'page-controls' }, quarterControl(data, ctx, quarter));
    const ranking = divisionRanking(data, quarter);
    if (ranking.length === 0) {
      container.append(controls, emptyState('moon', 'No scored divisions', `No division has a unit with at least ${data.minN} responses in ${quarter.id}.`));
      return;
    }
    const best = ranking[0];
    const worst = ranking.at(-1);
    const chartEl = h('div', { class: 'chart q-chart' });
    container.append(
      controls,
      quarterNote(data, quarter),
      h('div', { class: 'kpi-row' },
        accented(kpiCard({ label: 'Quietest Division', count: best.score, decimals: 1, sub: best.name }, ctx), 'green'),
        accented(kpiCard({ label: 'Needs Improvement', count: worst.score, decimals: 1, sub: worst.name }, ctx), 'red'),
        accented(kpiCard({ label: 'Site Average', count: siteAverage(data, quarter.id), decimals: 1, sub: quarter.label }, ctx), 'blue'),
        accented(kpiCard({ label: 'Division Spread', count: best.score - worst.score, decimals: 1, sub: 'Best to worst gap' }, ctx), 'gold'),
      ),
      card({ title: 'Division Trend' }, chartEl),
      h('div', { class: 'q-div-grid' }, ranking.map((division) => divisionCard(division, data))),
    );
    ctx.chart(chartEl, trendOption(data));
  },

  exports(data, ctx) {
    const quarter = selectedQuarter(data, ctx.state);
    const ranking = divisionRanking(data, quarter);
    if (ranking.length === 0) return null;
    return {
      columns: [
        { key: 'division', label: 'Division' },
        { key: 'unit', label: 'Unit' },
        { key: 'score', label: `${quarter.label} Score`, decimals: 1 },
        { key: 'n', label: 'n', decimals: 0 },
      ],
      rows: ranking.flatMap((division) => [
        { division: division.name, unit: 'Division Average', score: division.score, n: division.n },
        ...division.units.map((unit) => ({ division: division.name, unit: unit.unit, score: unit.score, n: unit.n })),
      ]),
    };
  },
};

function divisionCard(division, data) {
  const { bar } = accent(data, division.name);
  return h('article', { class: 'q-div-card' },
    h('div', { class: 'q-div-card-head' },
      divisionBadge(data, division.name),
      h('div', { class: `q-div-score ${scoreBand(division.score)}` }, fixed(division.score))),
    division.units.map((unit) => h('div', { class: 'q-div-unit-row' },
      h('div', { class: 'q-div-unit-name' }, unit.unit),
      h('div', { class: 'q-div-unit-bar' },
        h('div', { class: 'q-div-unit-bar-fill', style: { width: `${Math.max(unit.score, 2)}%`, background: bar } })),
      h('div', { class: `q-div-unit-val ${scoreBand(unit.score)}` }, fixed(unit.score)),
    )),
  );
}

function trendOption(data) {
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
    // One scrolling row, so on a phone the legend never wraps onto the quarter labels.
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11, color: '#374151' }, itemWidth: 16, itemHeight: 10, itemGap: 16 },
    grid: { left: 10, right: 20, top: 20, bottom: 34, containLabel: true }, // room for the slanted labels and the legend
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
      ...data.divisions.map((division) => {
        const color = accent(data, division.name).bar;
        return {
          name: division.name,
          type: 'line',
          data: ids.map((id) => divisionAverage(data, division.name, id)?.score ?? null),
          smooth: 0.3,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 3, color },
          itemStyle: { color },
          emphasis: { focus: 'series' },
          connectNulls: true,
        };
      }),
    ],
  };
}
