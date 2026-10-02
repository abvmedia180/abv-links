// Hourly Analysis: average arrivals in each hour of the day, and by day of week and hour. Averages
// follow the rule in model.js: each entry point over the days it has records.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { DAYS, DAYS_SHORT, HOURS, whole } from '../../../shell/format.js?v=4974441338';
import { card } from '../../../shell/ui.js?v=08586281b3';
import {
  COLORS, OVERNIGHT_HOURS, OVERNIGHT_LABEL, aggregate, daysLabel, filterControls, frozenNotice, isNarrow, scopeLine, selection,
  weekdayDays,
} from '../model.js?v=42f6854b8c';

// v1's heat map scale, low to high.
const HEAT_COLORS = ['#e8f5e9', '#a5d6a7', '#fff9c4', '#ffcc80', '#ef9a9a', '#e53935', '#b71c1c'];
const WEEK_ROWS = [6, 0, 1, 2, 3, 4, 5]; // Sunday at the top

export default {
  id: 'hourly',
  title: 'Hourly Analysis',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const sel = selection(data, ctx.state);
    const agg = aggregate(data, sel);
    const hourlyEl = h('div', { class: 'chart vis-chart' });
    const heatEl = h('div', { class: 'chart vis-chart-tall' });
    container.append(
      frozenNotice(data),
      filterControls(data, ctx),
      scopeLine(data, sel),
      card({ title: 'Visitors by hour of day', icon: 'activity' },
        h('p', { class: 'vis-caption' }, `Average arrivals in each hour, per logged day. Overnight hours (${OVERNIGHT_LABEL}) in orange.`),
        hourlyEl),
      card({ title: 'Day of week by hour', icon: 'grid' },
        h('p', { class: 'vis-caption' }, 'Average arrivals in each hour on each day of the week, per logged day. Darker means busier.'),
        heatEl),
    );
    ctx.chart(hourlyEl, hourlyOption(agg));
    ctx.chart(heatEl, heatOption(agg, sel, isNarrow(heatEl)));
  },

  exports(data, ctx) {
    const sel = selection(data, ctx.state);
    const agg = aggregate(data, sel);
    const row = (day, logged, values) => ({ day, logged, ...Object.fromEntries(values.map((value, hour) => [`h${hour}`, value])) });
    return {
      columns: [
        { key: 'day', label: 'Day' },
        { key: 'logged', label: daysLabel(sel), decimals: 0 },
        ...HOURS.map((label, hour) => ({ key: `h${hour}`, label, decimals: 1 })),
      ],
      rows: [
        ...rowsShown(agg).map((dow) => row(DAYS[dow], weekdayDays(agg, sel, dow), agg.weekdayHourAverage[dow])),
        row('All days', agg.days, agg.hourlyAverage),
      ],
    };
  },
};

function rowsShown(agg) {
  return WEEK_ROWS.filter((dow) => agg.weekdayHourAverage[dow] != null);
}

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
    grid: { top: 16, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: HOURS, axisLine: AXIS_STYLE.line, axisTick: { alignWithLabel: true }, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: [{
      type: 'bar',
      barMaxWidth: 30,
      data: agg.hourlyAverage.map((value, hour) => ({
        value,
        itemStyle: { color: hour < OVERNIGHT_HOURS ? COLORS.overnight : COLORS.primary, borderRadius: [3, 3, 0, 0] },
      })),
    }],
  };
}

function heatOption(agg, sel, narrow) {
  // A category axis is drawn from the bottom up, so the rows are reversed to put Sunday on top.
  const rows = rowsShown(agg).reverse();
  const values = rows.flatMap((dow, row) => agg.weekdayHourAverage[dow].map((avg, hour) => [hour, row, avg]));
  const max = Math.max(1, ...values.map((value) => value[2]));
  // The top of the scale is dark red; numbers on it are white.
  const cells = values.map((value) => ({ value, label: { color: value[2] / max > 0.72 ? '#ffffff' : '#1a1a2e' } }));
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      formatter: (params) => tooltipContent(`${DAYS[rows[params.value[1]]]} ${HOURS[params.value[0]]}`, [
        { label: 'Average arrivals', value: params.value[2].toFixed(1) },
        { label: sel.entry == null ? 'Days with records' : 'Days logged', value: String(weekdayDays(agg, sel, rows[params.value[1]])) },
      ]),
    },
    grid: { top: 10, right: narrow ? 8 : 70, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: HOURS, axisLine: AXIS_STYLE.line, splitArea: { show: true }, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'category', data: rows.map((dow) => DAYS_SHORT[dow]), axisLine: AXIS_STYLE.line, axisLabel: { ...AXIS_STYLE.label, fontSize: 12 } },
    visualMap: {
      min: 0,
      max,
      show: !narrow,
      calculable: true,
      orient: 'vertical',
      right: 0,
      top: 'center',
      itemHeight: 180,
      inRange: { color: HEAT_COLORS },
      textStyle: { color: '#646b77' },
      formatter: (value) => value.toFixed(0),
    },
    series: [{
      type: 'heatmap',
      data: cells,
      label: { show: !narrow, fontSize: 9, formatter: (params) => (params.value[2] >= 0.5 ? params.value[2].toFixed(0) : '') },
      itemStyle: { borderColor: '#ffffff', borderWidth: 1 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0, 0, 0, 0.3)' } },
    }],
  };
}
