// Call Reasons: every call sorted by the kind of help it needed, the top needs, and a profile of each need.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { DAYS_SHORT, HOURS, whole } from '../../../shell/format.js?v=4974441338';
import { card } from '../../../shell/ui.js?v=08586281b3';
import { SHIFTS } from '../model.js?v=8664ca03f5';

const HOT_OVER_INDEX = 1.25; // over-index shown in orange from here
const NARROW_CHART = 520; // px; below this the bar chart uses short need names

export default {
  id: 'reasons',
  title: 'Call Reasons',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const preventable = data.buckets.filter((bucket) => bucket.preventable);
    const preventCalls = preventable.reduce((sum, bucket) => sum + bucket.calls, 0);
    const widest = Math.max(...data.buckets.map((bucket) => bucket.pct), 1);
    const chartEl = h('div', { class: 'chart', style: { height: `${data.needs.length * 26 + 30}px` } });
    container.append(
      card({ title: 'How much of this is rounding-preventable?', icon: 'activity' },
        h('p', { class: 'cl-caption' }, 'Every call sorted by the kind of help it needed.'),
        h('div', { class: 'cl-buckets' }, data.buckets.map((bucket) => h('div', { class: 'cl-bucket' },
          h('div', { class: 'cl-bucket-label' }, bucket.label, h('span', { class: 'cl-bucket-note' }, bucket.note)),
          h('div', { class: 'cl-bucket-track' },
            h('div', { class: 'cl-bucket-fill', style: { width: `${(100 * bucket.pct) / widest}%`, background: bucket.color } })),
          h('div', { class: 'cl-bucket-pct' }, `${bucket.pct}%`)))),
        h('p', { class: 'cl-callout' },
          `${preventable.map((bucket) => bucket.label).join(' plus ')} make up `,
          h('strong', {}, `${Math.round((100 * preventCalls) / data.calls)}%`),
          ` of all calls (${whole(preventCalls)} of ${whole(data.calls)}). These are the calls a stocked room and a timed round can pre-empt.`)),
      card({ title: 'Top need categories', icon: 'square' },
        h('p', { class: 'cl-caption' }, 'Calls per need; uncategorized one-off requests are left out.'),
        chartEl),
      card({ title: 'What patients call for: deep dive', icon: 'grid' },
        h('p', { class: 'cl-caption' },
          '"Over-index" is how much a need concentrates on one shift compared with calls in general: 1.4× means 40% more than expected.'),
        h('div', { class: 'data-table-wrap' }, h('table', { class: 'data-table cl-profiles' },
          h('thead', {}, h('tr', {},
            h('th', { scope: 'col' }, 'Need'),
            h('th', { scope: 'col', class: 'num' }, 'Calls'),
            h('th', { scope: 'col', class: 'num' }, '% of All'),
            h('th', { scope: 'col' }, 'Concentrates On'),
            h('th', { scope: 'col', class: 'num' }, 'Over-Index'),
            h('th', { scope: 'col' }, 'Peak Time'),
            h('th', { scope: 'col' }, 'Peak Day'),
            h('th', { scope: 'col' }, 'Typical Wording'))),
          h('tbody', {}, data.profiles.map((profile) => h('tr', {},
            h('td', { class: 'name' }, profile.label),
            h('td', { class: 'num' }, String(profile.calls)),
            h('td', { class: 'num' }, `${profile.pct}%`),
            h('td', {}, h('span', { class: `cl-pill cl-pill-${profile.shift}` }, SHIFTS[profile.shift].label)),
            h('td', { class: `num${profile.overIndex >= HOT_OVER_INDEX ? ' cl-hot' : ''}` }, `${profile.overIndex.toFixed(2)}×`),
            h('td', {}, profile.peakHour == null ? '--' : HOURS[profile.peakHour]),
            h('td', {}, profile.peakDay == null ? '--' : DAYS_SHORT[profile.peakDay]),
            h('td', { class: 'cl-wording' }, profile.wording.map((wording) => `“${wording}”`).join(', ')))))))),
    );
    ctx.chart(chartEl, needsOption(data, chartEl.clientWidth < NARROW_CHART));
  },

  exports(data) {
    return {
      columns: [
        { key: 'need', label: 'Need' },
        { key: 'calls', label: 'Calls', decimals: 0 },
        { key: 'pct', label: '% of All Calls', decimals: 0 },
        { key: 'shift', label: 'Concentrates On' },
        { key: 'overIndex', label: 'Over-Index', decimals: 2 },
        { key: 'peakTime', label: 'Peak Time' },
        { key: 'peakDay', label: 'Peak Day' },
        { key: 'wording', label: 'Typical Wording' },
      ],
      rows: data.profiles.map((profile) => ({
        need: profile.label,
        calls: profile.calls,
        pct: profile.pct,
        shift: SHIFTS[profile.shift].label,
        overIndex: profile.overIndex,
        peakTime: profile.peakHour == null ? null : HOURS[profile.peakHour],
        peakDay: profile.peakDay == null ? null : DAYS_SHORT[profile.peakDay],
        wording: profile.wording.join('; '),
      })),
    };
  },
};

// On a narrow chart the short need names leave room for the bars.
function needsOption(data, narrow) {
  // Largest at the top: a category axis is drawn from the bottom up.
  const needs = [...data.needs].reverse();
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{ label: 'Calls', value: whole(params.value) }]),
    },
    grid: { top: 10, right: 50, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'value', splitNumber: narrow ? 3 : 5, axisLine: AXIS_STYLE.line, splitLine: AXIS_STYLE.split, axisLabel: AXIS_STYLE.valueLabel },
    yAxis: { type: 'category', data: needs.map((need) => (narrow ? need.short : need.label)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    series: [{
      type: 'bar',
      barWidth: 16,
      data: needs.map((need) => need.calls),
      itemStyle: { color: '#0059a5', borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: '#374151', fontSize: 11 },
    }],
  };
}
