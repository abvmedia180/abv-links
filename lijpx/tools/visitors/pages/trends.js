// Trends: average daily visitors by month and entry point, weekly totals, and the shape of the week.
// Months are compared as averages per logged day because several months are only partly logged;
// every average follows the rule in model.js, each entry point over the days it has records.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { DAYS, DAYS_SHORT, monthLabel, shortDate, whole } from '../../../shell/format.js?v=4974441338';
import { card } from '../../../shell/ui.js?v=08586281b3';
import {
  COLORS, LEGEND, aggregate, daysLabel, filterControls, frozenNotice, monthAxis, scopeLine, selection, thousands, weekdayDays,
} from '../model.js?v=42f6854b8c';

export default {
  id: 'trends',
  title: 'Trends',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const sel = selection(data, ctx.state);
    const agg = aggregate(data, sel);
    const monthlyEl = h('div', { class: 'chart vis-chart' });
    const weeklyEl = h('div', { class: 'chart vis-chart' });
    const weekdayEl = h('div', { class: 'chart vis-chart-short' });
    container.append(
      frozenNotice(data),
      filterControls(data, ctx),
      scopeLine(data, sel),
      card({ title: 'Monthly trend', icon: 'activity' },
        h('p', { class: 'vis-caption' },
          'Average visitors per day, for each entry point over the days it was logged. Averages, not totals, so a partly logged '
          + 'month is not mistaken for a quiet one; a month with no logs for an entry point leaves a gap.'),
        monthlyEl),
      card({ title: 'Weekly trend', icon: 'square' },
        h('p', { class: 'vis-caption' },
          'Visitors each week (Monday to Sunday), labelled by the first logged day. These are totals: a week with fewer logged days, '
          + 'or without one entry point\'s logs, counts fewer visitors.'),
        weeklyEl),
      card({ title: 'Day of week', icon: 'square' },
        h('p', { class: 'vis-caption' }, 'Average visitors per day, each entry point over its logged days. Weekends in light blue.'),
        weekdayEl),
    );
    ctx.chart(monthlyEl, monthlyOption(data, sel, agg));
    ctx.chart(weeklyEl, weeklyOption(agg));
    ctx.chart(weekdayEl, weekdayOption(agg, sel));
  },

  // One row per month: the figures the monthly chart plots, and for several entry points each one's
  // own days, visitors and average.
  exports(data, ctx) {
    const sel = selection(data, ctx.state);
    const agg = aggregate(data, sel);
    const each = sel.entries.length > 1 ? sel.entries : [];
    return {
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'days', label: daysLabel(sel), decimals: 0 },
        { key: 'total', label: 'Visitors', decimals: 0 },
        { key: 'average', label: 'Average per Day', decimals: 1 },
        ...each.flatMap((i) => [
          { key: `days${i}`, label: `${data.entries[i].name} Days Logged`, decimals: 0 },
          { key: `total${i}`, label: `${data.entries[i].name} Visitors`, decimals: 0 },
          { key: `average${i}`, label: `${data.entries[i].name} per Day`, decimals: 1 },
        ]),
      ],
      rows: [...agg.months.values()].map((month) => ({
        month: monthLabel(month.month),
        days: month.days,
        total: month.total,
        average: month.average,
        ...Object.fromEntries(each.flatMap((i) => [
          [`days${i}`, month.logged[i]],
          [`total${i}`, month.byEntry[i]],
          [`average${i}`, month.entryAverage[i]],
        ])),
      })),
    };
  },
};

function monthlyOption(data, sel, agg) {
  const axis = monthAxis(agg);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      formatter: (params) => {
        const { totals } = axis[params[0].dataIndex];
        if (!totals) return tooltipContent(params[0].name, [{ label: 'No logs this month', value: '' }]);
        return tooltipContent(params[0].name, params.map((p) => ({
          color: p.color,
          label: p.seriesName,
          value: p.value == null ? 'no logs' : `${p.value.toFixed(0)} a day`,
          note: `${totals.logged[sel.entries[p.seriesIndex]]} days`,
        })));
      },
    },
    legend: LEGEND,
    grid: { top: 16, right: 16, bottom: 36, left: 10, containLabel: true },
    xAxis: { type: 'category', data: axis.map(({ month }) => monthLabel(month)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: sel.entries.map((i) => ({
      name: data.entries[i].name,
      type: 'line',
      smooth: true,
      connectNulls: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: data.entries[i].color },
      itemStyle: { color: data.entries[i].color },
      data: axis.map(({ totals }) => totals?.entryAverage[i] ?? null),
    })),
  };
}

function weeklyOption(agg) {
  const weeks = [...agg.weeks.values()];
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(`Week of ${params.name}`, [
        { label: 'Visitors', value: whole(params.value) },
        { label: 'Days logged', value: String(weeks[params.dataIndex].days) },
      ]),
    },
    grid: { top: 24, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: weeks.map((week) => shortDate(week.first)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: { ...AXIS_STYLE.valueLabel, formatter: thousands } },
    series: [{
      type: 'bar',
      barMaxWidth: 20,
      data: weeks.map((week) => week.total),
      itemStyle: { color: COLORS.primary, borderRadius: [3, 3, 0, 0] },
    }],
  };
}

function weekdayOption(agg, sel) {
  const shown = DAYS.map((_, dow) => dow).filter((dow) => agg.weekdayAverage[dow] != null);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(DAYS[shown[params.dataIndex]], [
        { label: 'Average per day', value: whole(params.value) },
        { label: sel.entry == null ? 'Days with records' : 'Days logged', value: String(weekdayDays(agg, sel, shown[params.dataIndex])) },
      ]),
    },
    grid: { top: 24, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: shown.map((dow) => DAYS_SHORT[dow]), axisLine: AXIS_STYLE.line, axisLabel: { ...AXIS_STYLE.label, fontSize: 12 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: [{
      type: 'bar',
      barMaxWidth: 50,
      data: shown.map((dow) => ({
        value: agg.weekdayAverage[dow],
        itemStyle: { color: dow >= 5 ? COLORS.weekend : COLORS.primary, borderRadius: [3, 3, 0, 0] },
      })),
      label: { show: true, position: 'top', color: '#374151', fontSize: 11, formatter: (params) => whole(params.value) },
    }],
  };
}
