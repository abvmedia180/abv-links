// Overview: headline numbers, key takeaways worked out from the data, each entry point's daily
// average, and visitors by day. Averages follow the rule in model.js: each entry point over the
// days it has records, and combined figures built weekday by weekday.

import { AXIS_STYLE, TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { DAYS, HOURS, monthLabel, shortDate, whole } from '../../../shell/format.js?v=4796f631fd';
import { card, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import {
  LEGEND, OVERNIGHT_HOURS, OVERNIGHT_LABEL,
  aggregate, averageDay, daysInMonth, filterControls, frozenNotice, isNarrow, months, percent, scopeLine, selection, thousands,
} from '../model.js?v=549548d47e';

export default {
  id: 'overview',
  title: 'Overview',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const sel = selection(data, ctx.state);
    const agg = aggregate(data, sel);
    const rows = entryRows(data, sel, agg);
    const entryEl = h('div', { class: 'chart vis-chart-short' });
    const dailyEl = h('div', { class: 'chart vis-chart' });
    container.append(
      frozenNotice(data),
      filterControls(data, ctx),
      scopeLine(data, sel),
      h('div', { class: 'kpi-row' },
        kpiCard({ label: 'Total Visitors', value: whole(agg.total), sub: `logged on ${agg.days} days` }, ctx),
        kpiCard({
          label: 'Daily Average',
          value: whole(agg.dailyAverage),
          sub: sel.entry == null ? 'visitors a day, each entry point weekday by weekday over its logged days' : 'visitors per logged day',
        }, ctx),
        kpiCard({ label: 'Peak Hour', value: HOURS[agg.peakHour], sub: `${agg.hourlyAverage[agg.peakHour].toFixed(1)} arrivals in that hour, on average` }, ctx),
        kpiCard({ label: 'Overnight Share', value: `${percent(agg.overnightAverage, agg.dailyAverage)}%`, sub: `of a day's visitors, ${OVERNIGHT_LABEL}` }, ctx),
      ),
      card({ title: 'Key takeaways', icon: 'activity', className: 'vis-takeaways' },
        h('p', { class: 'vis-caption' }, 'Worked out from the logs for the selection above, so they change with the filters.'),
        h('ul', {}, takeaways(data, sel, agg).map((line) => h('li', {}, line)))),
      card({ title: 'Daily average by entry point', icon: 'square' },
        h('p', { class: 'vis-caption' }, 'Visitors per day, each entry point over the days it has records.'),
        entryEl),
      card({ title: 'Entry point totals', icon: 'grid', className: 'vis-keep' },
        h('div', { class: 'data-table-wrap' }, h('table', { class: 'data-table' },
          h('thead', {}, h('tr', {},
            h('th', { scope: 'col' }, 'Entry Point'),
            h('th', { scope: 'col', class: 'num' }, 'Visitors'),
            h('th', { scope: 'col', class: 'num' }, 'Days Logged'),
            h('th', { scope: 'col', class: 'num' }, 'Daily Average'),
            h('th', { scope: 'col', class: 'num' }, 'Share'))),
          h('tbody', {}, rows.map((row) => h('tr', {},
            h('td', { class: 'name' }, h('span', { class: 'vis-swatch', style: { background: row.color } }), row.entry),
            h('td', { class: 'num' }, whole(row.visitors)),
            h('td', { class: 'num' }, String(row.days)),
            h('td', { class: 'num' }, row.daily == null ? '--' : whole(row.daily)),
            h('td', { class: 'num' }, row.share == null ? '--' : `${row.share.toFixed(1)}%`)))))),
        h('p', { class: 'vis-caption' },
          'Daily Average is the entry point\'s visitors over the days it has records. Share is its part of the combined daily '
          + 'average, which counts each entry point weekday by weekday, so one that is seldom logged on weekends adds only its '
          + 'weekend visitors to weekends.')),
      card({ title: 'Daily volume by entry point', icon: 'activity' },
        h('p', { class: 'vis-caption' }, 'Visitors each logged day, stacked by entry point. Pick a month above to look closer.'),
        dailyEl),
    );
    ctx.chart(entryEl, entryOption(rows, isNarrow(entryEl)));
    ctx.chart(dailyEl, dailyOption(data, sel, agg));
  },

  exports(data, ctx) {
    const sel = selection(data, ctx.state);
    return {
      columns: [
        { key: 'entry', label: 'Entry Point' },
        { key: 'visitors', label: 'Visitors', decimals: 0 },
        { key: 'days', label: 'Days Logged', decimals: 0 },
        { key: 'daily', label: 'Daily Average', decimals: 1 },
        { key: 'share', label: 'Share of Daily Average (%)', decimals: 1 },
      ],
      rows: entryRows(data, sel, aggregate(data, sel)).map(({ entry, visitors, days, daily, share }) => ({ entry, visitors, days, daily, share })),
    };
  },
};

function entryRows(data, sel, agg) {
  return sel.entries.map((i) => ({
    entry: data.entries[i].name,
    color: data.entries[i].color,
    visitors: agg.byEntry[i],
    days: agg.logged[i],
    daily: agg.entryAverage[i],
    share: agg.entryAverage[i] == null || !agg.dailyAverage ? null : (100 * agg.entryPartOfDay[i]) / agg.dailyAverage,
  }));
}

// Plain-language findings computed from the current selection; a finding that the filters make
// meaningless (the busiest day when one day is chosen) is left out.
function takeaways(data, sel, agg) {
  const lines = [];
  if (agg.days === 0) return ['No logged days match these filters.'];
  const weekdays = agg.weekdayAverage.map((avg, dow) => ({ dow, avg })).filter((entry) => entry.avg != null).sort((a, b) => b.avg - a.avg);
  if (weekdays.length > 1) {
    const [busiest, quietest] = [weekdays[0], weekdays.at(-1)];
    lines.push(`${DAYS[busiest.dow]} is the busiest day, ${whole(busiest.avg)} visitors on average; `
      + `${DAYS[quietest.dow]} is the quietest, ${whole(quietest.avg)}.`);
  }
  let peak = { dow: 0, hour: 0, avg: -1 };
  agg.weekdayHourAverage.forEach((hours, dow) => hours?.forEach((avg, hour) => {
    if (avg > peak.avg) peak = { dow, hour, avg };
  }));
  lines.push(`Visitors peak at ${HOURS[agg.peakHour]}, ${agg.hourlyAverage[agg.peakHour].toFixed(1)} an hour on average. `
    + `The busiest single hour of the week is ${DAYS[peak.dow]} at ${HOURS[peak.hour]}, ${peak.avg.toFixed(1)} on average.`);
  if (sel.entry == null) {
    const [top, ...rest] = entryRows(data, sel, agg).filter((row) => row.share != null).sort((a, b) => b.share - a.share);
    lines.push(`${top.entry} takes ${top.share.toFixed(0)}% of an average day's visitors`
      + `${rest.length > 0 ? `; ${rest.map((row) => `${row.entry} ${row.share.toFixed(0)}%`).join(', ')}` : ''}.`);
  }
  const overnight = agg.hourlyAverage.slice(0, OVERNIGHT_HOURS).map((avg, hour) => ({ hour, avg }));
  const low = overnight.reduce((a, b) => (b.avg < a.avg ? b : a));
  const high = overnight.reduce((a, b) => (b.avg > a.avg ? b : a));
  lines.push(`${percent(agg.overnightAverage, agg.dailyAverage)}% of an average day's visitors arrive overnight (${OVERNIGHT_LABEL}), from `
    + `${low.avg.toFixed(1)} an hour at ${HOURS[low.hour]} to ${high.avg.toFixed(1)} an hour at ${HOURS[high.hour]}.`);
  if (!sel.month) {
    const complete = months(data)
      .filter((month) => data.days.filter((day) => day.date.startsWith(month)).length === daysInMonth(month))
      .map((month) => agg.months.get(month))
      .filter(Boolean);
    const [first, last] = [complete[0], complete.at(-1)];
    // Only entry points logged in both months, each over the days it was logged, so a gap in one
    // entry point's logs does not read as a drop in visitors.
    const both = complete.length > 1 ? sel.entries.filter((i) => first.logged[i] > 0 && last.logged[i] > 0) : [];
    if (both.length > 0) {
      const rate = (month) => averageDay(month.group, both).total;
      const [before, after] = [rate(first), rate(last)];
      const change = ((after - before) / before) * 100;
      const left = sel.entries.filter((i) => !both.includes(i)).map((i) => data.entries[i].name);
      lines.push(`Visitors per logged day went from ${whole(before)} in ${monthLabel(first.month)} to ${whole(after)} in `
        + `${monthLabel(last.month)} (${change > 0 ? '+' : ''}${change.toFixed(0)}%), comparing the first and last fully logged months`
        + `${left.length > 0 ? ` without ${left.join(', ')} (no records in one of them)` : ''}.`);
    }
  }
  return lines;
}

function entryOption(entryRowsShown, narrow) {
  // Largest at the top: a category axis is drawn from the bottom up.
  const rows = entryRowsShown.filter((row) => row.daily != null).sort((a, b) => a.daily - b.daily);
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => {
        const row = rows[params.dataIndex];
        return tooltipContent(row.entry, [
          { color: row.color, label: 'Daily average', value: whole(row.daily) },
          { label: 'Visitors', value: whole(row.visitors) },
          { label: 'Days logged', value: String(row.days) },
          { label: 'Share', value: row.share == null ? '--' : `${row.share.toFixed(1)}%` },
        ]);
      },
    },
    grid: { top: 10, right: 70, bottom: 10, left: 10, containLabel: true },
    xAxis: { type: 'value', splitNumber: narrow ? 3 : 5, axisLine: AXIS_STYLE.line, splitLine: AXIS_STYLE.split, axisLabel: { ...AXIS_STYLE.valueLabel, formatter: thousands } },
    yAxis: { type: 'category', data: rows.map((row) => row.entry), axisLine: AXIS_STYLE.line, axisLabel: { ...AXIS_STYLE.label, fontSize: 12 } },
    series: [{
      type: 'bar',
      barMaxWidth: 36,
      data: rows.map((row) => ({ value: row.daily, itemStyle: { color: row.color, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', color: '#374151', fontSize: 11, formatter: (params) => whole(params.value) },
    }],
  };
}

function dailyOption(data, sel, agg) {
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => tooltipContent(`${params[0].name}: ${whole(agg.daily[params[0].dataIndex].total)} visitors`,
        params.map((p) => ({ color: p.color, label: p.seriesName, value: p.value == null ? 'no records' : whole(p.value) }))),
    },
    legend: LEGEND,
    grid: { top: 16, right: 16, bottom: 36, left: 10, containLabel: true },
    xAxis: { type: 'category', data: agg.daily.map((day) => shortDate(day.date)), axisLine: AXIS_STYLE.line, axisLabel: AXIS_STYLE.label },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: AXIS_STYLE.split, axisLabel: { ...AXIS_STYLE.valueLabel, formatter: thousands } },
    series: sel.entries.map((i) => ({
      name: data.entries[i].name,
      type: 'bar',
      stack: 'visitors',
      barCategoryGap: '15%',
      data: agg.daily.map((day) => day.byEntry[i]),
      itemStyle: { color: data.entries[i].color },
    })),
  };
}
