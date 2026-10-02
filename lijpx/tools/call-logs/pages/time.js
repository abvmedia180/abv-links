// Over Time: calls per day across the whole record, and calls by month and by shift.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { monthLabel, shortDate, whole } from '../../../shell/format.js?v=4974441338';
import { card } from '../../../shell/ui.js?v=08586281b3';
import { SHIFTS } from '../model.js?v=8664ca03f5';

const DAY_MS = 24 * 60 * 60 * 1000;

export default {
  id: 'time',
  title: 'Over Time',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const dailyEl = h('div', { class: 'chart cl-chart' });
    const monthsEl = h('div', { class: 'chart cl-chart' });
    const shiftsEl = h('div', { class: 'chart cl-chart' });
    container.append(
      card({ title: 'Calls per day', icon: 'activity' },
        h('p', { class: 'cl-caption' }, 'Every calendar day in the record. An empty stretch is days with no scanned sheets.'),
        dailyEl),
      card({ title: 'Calls by month', icon: 'square' },
        h('p', { class: 'cl-caption' }, `Partial months reflect the scans, not the unit: ${data.coverageNote}.`),
        monthsEl),
      card({ title: 'Calls by shift', icon: 'square' },
        h('p', { class: 'cl-caption' }, 'Handwritten shift labels standardized into three shifts.'),
        shiftsEl),
    );
    ctx.chart(dailyEl, dailyOption(data));
    ctx.chart(monthsEl, monthsOption(data));
    ctx.chart(shiftsEl, shiftsOption(data));
  },

  exports(data) {
    return {
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'calls', label: 'Calls', decimals: 0 },
        ...Object.entries(SHIFTS).map(([key, shift]) => ({ key, label: `${shift.label} Shift Calls`, decimals: 0 })),
        { key: 'complete', label: '% Marked Complete', decimals: 0 },
      ],
      rows: data.months.map((month) => ({
        month: monthLabel(month.month),
        calls: month.calls,
        day: month.day,
        evening: month.evening,
        night: month.night,
        complete: month.completePct,
      })),
    };
  },
};

// Every date from the first to the last log, with null where nothing was scanned.
function calendar(data) {
  const counts = new Map(data.daily.map((day) => [day.date, day.calls]));
  const days = [];
  for (let t = Date.parse(`${data.firstDay}T00:00:00Z`); t <= Date.parse(`${data.lastDay}T00:00:00Z`); t += DAY_MS) {
    const iso = new Date(t).toISOString().slice(0, 10);
    days.push({ label: shortDate(iso), calls: counts.get(iso) ?? null });
  }
  return days;
}

function dailyOption(data) {
  const days = calendar(data);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{ label: 'Calls', value: params.value == null ? 'no scans' : whole(params.value) }]),
    },
    grid: { top: 20, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: days.map((day) => day.label), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: [{
      type: 'bar',
      barCategoryGap: '20%',
      data: days.map((day) => day.calls),
      itemStyle: { color: '#0059a5' },
    }],
  };
}

function monthsOption(data) {
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{ label: 'Calls', value: whole(params.value) }]),
    },
    grid: { top: 24, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'category', data: data.months.map((month) => monthLabel(month.month)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: [{
      type: 'bar',
      barMaxWidth: 60,
      data: data.months.map((month) => month.calls),
      itemStyle: { color: '#0059a5', borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', color: '#374151', fontSize: 11 },
    }],
  };
}

function shiftsOption(data) {
  const shifts = Object.entries(SHIFTS);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => tooltipContent(params[0].name, params.map((p) => ({ color: p.color, label: p.seriesName, value: whole(p.value) }))),
    },
    legend: { type: 'scroll', bottom: 0, itemWidth: 14, itemGap: 10, textStyle: { color: '#374151', fontSize: 11 } },
    grid: { top: 20, right: 16, bottom: 36, left: 10, containLabel: true },
    xAxis: { type: 'category', data: data.months.map((month) => monthLabel(month.month)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: shifts.map(([key, shift]) => ({
      name: `${shift.label} (${shift.hours})`,
      type: 'bar',
      stack: 'shifts',
      barMaxWidth: 60,
      data: data.months.map((month) => month[key]),
      itemStyle: { color: shift.color },
    })),
  };
}
