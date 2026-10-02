// Calls by Hour: volume for each hour of the day, and the share of those calls marked complete.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { HOURS, whole } from '../../../shell/format.js?v=4796f631fd';
import { card } from '../../../shell/ui.js?v=08586281b3';

const COMPLETE_TARGET = 80; // bars under this share of calls marked complete turn orange
const BLUE = '#0059a5';
const ORANGE = '#eb6834';

export default {
  id: 'hours',
  title: 'Calls by Hour',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const volumeEl = h('div', { class: 'chart cl-chart' });
    const completionEl = h('div', { class: 'chart cl-chart' });
    container.append(
      card({ title: 'Calls by hour of day', icon: 'activity' },
        h('p', { class: 'cl-caption' }, 'All months combined.'),
        volumeEl),
      card({ title: 'Calls marked complete, by hour', icon: 'square' },
        h('p', { class: 'cl-caption' },
          'The close-out box on the paper form. A dip means calls closing out unresolved or a shift not documenting closure; both are worth knowing.'),
        h('div', { class: 'cl-key' },
          h('span', {}, h('i', { class: 'cl-key-swatch', style: { background: BLUE } }), `${COMPLETE_TARGET}% or better`),
          h('span', {}, h('i', { class: 'cl-key-swatch', style: { background: ORANGE } }), `under ${COMPLETE_TARGET}%`),
          h('span', {}, h('i', { class: 'cl-key-line' }), `unit average ${data.completePct}%`)),
        completionEl),
    );
    ctx.chart(volumeEl, volumeOption(data));
    ctx.chart(completionEl, completionOption(data));
  },

  exports(data) {
    return {
      columns: [
        { key: 'hour', label: 'Hour' },
        { key: 'calls', label: 'Calls', decimals: 0 },
        { key: 'complete', label: '% Marked Complete', decimals: 0 },
      ],
      rows: data.hourly.map((hour, i) => ({ hour: HOURS[i], calls: hour.calls, complete: hour.calls ? hour.completePct : null })),
    };
  },
};

function hourAxis() {
  return { type: 'category', data: HOURS, axisLine: AXIS_STYLE.line, axisTick: { alignWithLabel: true }, axisLabel: AXIS_STYLE.label };
}

function volumeOption(data) {
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{ label: 'Calls', value: whole(params.value) }]),
    },
    grid: { top: 20, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: hourAxis(),
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    series: [{ type: 'bar', data: data.hourly.map((hour) => hour.calls), itemStyle: { color: BLUE, borderRadius: [3, 3, 0, 0] } }],
  };
}

function completionOption(data) {
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{
        label: 'Marked complete',
        value: `${params.value}%`,
        note: `of ${whole(data.hourly[params.dataIndex].calls)} calls`,
      }]),
    },
    grid: { top: 20, right: 16, bottom: 10, left: 10, containLabel: true },
    xAxis: hourAxis(),
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: { ...AXIS_STYLE.valueLabel, formatter: '{value}%' },
    },
    series: [{
      type: 'bar',
      data: data.hourly.map((hour) => ({
        value: hour.completePct,
        itemStyle: { color: hour.completePct < COMPLETE_TARGET ? ORANGE : BLUE, borderRadius: [3, 3, 0, 0] },
      })),
      markLine: {
        silent: true,
        symbol: 'none',
        label: { show: false },
        lineStyle: { color: '#0a2240', type: 'dashed', width: 1.4 },
        data: [{ yAxis: data.completePct }],
      },
    }],
  };
}
