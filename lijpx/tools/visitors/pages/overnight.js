// Overnight: arrivals between 12 AM and 7 AM, hour by hour and month by month. Averages and shares
// follow the rule in model.js: each entry point over the days it has records.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { HOURS, monthLabel, whole } from '../../../shell/format.js?v=4796f631fd';
import { card, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import {
  COLORS, OVERNIGHT_HOURS, OVERNIGHT_LABEL, aggregate, filterControls, frozenNotice, monthAxis, percent, scopeLine, selection,
} from '../model.js?v=549548d47e';

export default {
  id: 'overnight',
  title: 'Overnight',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const sel = selection(data, ctx.state);
    const agg = aggregate(data, sel);
    const hourlyEl = h('div', { class: 'chart vis-chart-short' });
    const monthlyEl = h('div', { class: 'chart vis-chart-short' });
    container.append(
      frozenNotice(data),
      filterControls(data, ctx),
      scopeLine(data, sel),
      h('div', { class: 'kpi-row' },
        kpiCard({ label: 'Overnight Visitors', value: whole(agg.overnight), sub: `logged ${OVERNIGHT_LABEL}` }, ctx),
        kpiCard({ label: 'Overnight Share', value: `${percent(agg.overnightAverage, agg.dailyAverage)}%`, sub: 'of a day\'s visitors' }, ctx),
        kpiCard({ label: 'Average per Overnight Hour', value: (agg.overnightAverage / OVERNIGHT_HOURS).toFixed(1), sub: 'arrivals per hour, per logged day' }, ctx),
        kpiCard({
          label: 'Peak Hour, for Comparison',
          value: agg.hourlyAverage[agg.peakHour].toFixed(1),
          sub: `arrivals at ${HOURS[agg.peakHour]}, per logged day`,
        }, ctx),
      ),
      card({ title: `Overnight by hour (${OVERNIGHT_LABEL})`, icon: 'activity' },
        h('p', { class: 'vis-caption' }, 'Average arrivals in each overnight hour, per logged day.'),
        hourlyEl),
      card({ title: 'Overnight share by month', icon: 'square' },
        h('p', { class: 'vis-caption' }, `Share of each month's daily visitors arriving ${OVERNIGHT_LABEL}. A month with no logs leaves a gap.`),
        monthlyEl),
    );
    ctx.chart(hourlyEl, hourlyOption(agg));
    ctx.chart(monthlyEl, monthlyOption(agg));
  },

  exports(data, ctx) {
    const agg = aggregate(data, selection(data, ctx.state));
    return {
      columns: [
        { key: 'hour', label: 'Hour' },
        { key: 'visitors', label: 'Visitors', decimals: 0 },
        { key: 'average', label: 'Average per Day', decimals: 1 },
        { key: 'share', label: 'Share of Daily Visitors (%)', decimals: 2 },
      ],
      rows: HOURS.slice(0, OVERNIGHT_HOURS).map((hour, i) => ({
        hour,
        visitors: agg.hourly[i],
        average: agg.hourlyAverage[i],
        share: agg.dailyAverage ? (100 * agg.hourlyAverage[i]) / agg.dailyAverage : 0,
      })),
    };
  },
};

function hourlyOption(agg) {
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [
        { label: 'Average per day', value: params.value.toFixed(1) },
        { label: 'Total', value: whole(agg.hourly[params.dataIndex]) },
      ]),
    },
    grid: { top: 24, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: HOURS.slice(0, OVERNIGHT_HOURS), axisLine: AXIS_STYLE.line, axisLabel: { ...AXIS_STYLE.label, fontSize: 12 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: [{
      type: 'bar',
      barMaxWidth: 50,
      data: agg.hourlyAverage.slice(0, OVERNIGHT_HOURS),
      itemStyle: { color: COLORS.overnight, borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', color: '#374151', fontSize: 11, formatter: (params) => params.value.toFixed(1) },
    }],
  };
}

function monthlyOption(agg) {
  const axis = monthAxis(agg);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      formatter: ([params]) => {
        const { totals } = axis[params.dataIndex];
        if (!totals) return tooltipContent(params.name, [{ label: 'No logs this month', value: '' }]);
        return tooltipContent(params.name, [
          { color: COLORS.overnight, label: 'Overnight', value: `${params.value.toFixed(1)}%` },
          { label: 'Overnight visitors logged', value: `${whole(totals.overnight.reduce((sum, n) => sum + n, 0))} of ${whole(totals.total)}` },
        ]);
      },
    },
    grid: { top: 24, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: axis.map(({ month }) => monthLabel(month)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: { ...AXIS_STYLE.valueLabel, formatter: '{value}%' } },
    series: [{
      type: 'line',
      smooth: true,
      connectNulls: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: COLORS.overnight },
      itemStyle: { color: COLORS.overnight },
      areaStyle: { color: 'rgba(232, 119, 34, 0.12)' },
      data: axis.map(({ totals }) => (totals && totals.average ? (100 * totals.overnightAverage) / totals.average : null)),
    }],
  };
}
