// Trends: the five most improved units across all quarters for one domain (units with n >= minN in
// every quarter), and the latest score of every unit qualified in the latest quarter, the same units
// Raw Scores counts for that quarter. The line tooltip follows the hovered line.

import { TOOLTIP_STYLE, tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4796f631fd';
import { card, emptyState, selectControl } from '../../../shell/ui.js?v=08586281b3';
import { latestQualified, trendRows } from '../model.js?v=0ac35671df';

const LINE_COLORS = ['#16a34a', '#0059A5', '#d97706', '#009CDA', '#dc2626'];

export default {
  id: 'trends',
  title: 'Trends',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const domain = data.domains.find((d) => d.key === ctx.state.trendDomain) ?? data.domains[0];
    const rows = trendRows(data, domain.key);
    const latest = latestQualified(data, domain.key);
    const domainSelect = selectControl({
      id: 'rs-trend-domain',
      label: 'Domain',
      value: domain.key,
      options: data.domains.map((d) => ({ value: d.key, label: d.label })),
      onChange: (value) => {
        ctx.state.trendDomain = value;
        ctx.rerender();
      },
    });
    if (rows.length === 0 && latest.length === 0) {
      container.append(h('div', { class: 'page-controls' }, domainSelect),
        emptyState('activity', 'No qualified units', `No unit has n ≥ ${data.minN} in the latest quarter for this domain.`));
      return;
    }
    const lineEl = rows.length > 0 && h('div', { class: 'chart' });
    const barEl = latest.length > 0 && h('div', { class: 'chart', style: { height: `${Math.max(400, latest.length * 32 + 80)}px` } });
    container.append(
      h('div', { class: 'page-controls' }, domainSelect),
      card({ title: 'Top 5 Most Improved Units', icon: 'activity' },
        lineEl || emptyState('activity', 'No unit qualified in every quarter', `No unit has n ≥ ${data.minN} in every quarter for this domain.`)),
      card({ title: 'All Units Comparison', icon: 'square' },
        barEl || emptyState('activity', 'No qualified units', `No unit has n ≥ ${data.minN} in ${data.quarters.at(-1).id} for this domain.`)),
    );
    if (lineEl) ctx.chart(lineEl, lineOption(data, rows.slice(0, 5)));
    if (barEl) ctx.chart(barEl, barOption(data, latest, domain));
  },

  exports(data, ctx) {
    const domain = data.domains.find((d) => d.key === ctx.state.trendDomain) ?? data.domains[0];
    return {
      columns: [
        { key: 'domain', label: 'Domain' },
        { key: 'unit', label: 'Unit' },
        ...data.quarters.map((quarter, i) => ({ key: `q${i}`, label: quarter.id, decimals: 1 })),
        { key: 'change', label: 'Change', decimals: 1 },
      ],
      rows: trendRows(data, domain.key).map((row) => ({
        domain: domain.label,
        unit: row.unit,
        ...Object.fromEntries(row.scores.map((score, i) => [`q${i}`, score])),
        change: row.change,
      })),
    };
  },
};

function lineOption(data, top) {
  const quarters = data.quarters.map((quarter) => quarter.id);
  const last = quarters.length - 1;
  return {
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'item',
      formatter: (params) => {
        const row = top[params.seriesIndex];
        return tooltipContent(row.unit, [{
          color: params.color,
          label: quarters[params.dataIndex],
          value: `${fixed(params.value)}%`,
          note: `(${signed(row.change)} since ${quarters[0]})`,
          noteTone: row.change >= 0 ? 'green' : 'red',
        }]);
      },
    },
    legend: { bottom: 0, textStyle: { color: '#374151', fontSize: 12 }, itemWidth: 20, itemHeight: 3 },
    grid: { top: 20, right: 60, bottom: 50, left: 50 },
    xAxis: { type: 'category', data: quarters, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#374151', fontSize: 12 } },
    yAxis: {
      type: 'value',
      min: (extent) => Math.max(0, Math.floor((extent.min - 10) / 10) * 10),
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', formatter: '{value}%' },
    },
    series: top.map((row, i) => ({
      name: `${row.unit} (${signed(row.change)})`,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 12,
      lineStyle: { width: 3 },
      itemStyle: { color: LINE_COLORS[i] },
      data: row.scores,
      emphasis: { focus: 'series', lineStyle: { width: 5 }, itemStyle: { borderWidth: 3 } },
      label: {
        show: true,
        position: 'right',
        formatter: (params) => (params.dataIndex === last ? `${fixed(params.value)}%` : ''),
        color: LINE_COLORS[i],
        fontSize: 11,
        fontWeight: 600,
      },
    })),
  };
}

function barOption(data, latest, domain) {
  // Highest score at the top: ECharts draws a category axis from the bottom up.
  const sorted = [...latest].sort((a, b) => a.score - b.score);
  return {
    title: {
      text: `All Qualified Units - ${domain.label}`,
      subtext: `${data.quarters.at(-1).id}, units with n ≥ ${data.minN} in that quarter`,
      left: 'center',
      top: 5,
      itemGap: 8,
      textStyle: { color: '#374151', fontSize: 14, fontWeight: 600 },
      subtextStyle: { color: '#6b7280', fontSize: 12 },
    },
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: ([params]) => tooltipContent(params.name, [{ label: domain.label, value: `${fixed(params.value)}%` }]),
    },
    grid: { top: 50, right: 50, bottom: 20, left: 120 },
    xAxis: {
      type: 'value', min: 0, max: 100,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { color: '#6b7280', formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: sorted.map((item) => item.unit),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#374151', fontSize: 12, fontWeight: 500 },
    },
    series: [{
      type: 'bar',
      barWidth: 18,
      data: sorted.map((item) => ({ value: item.score, itemStyle: { color: barColor(item.score), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: (params) => `${fixed(params.value)}%`, color: '#374151', fontSize: 11 },
    }],
  };
}

function barColor(score) {
  if (score >= 85) return '#16a34a';
  if (score >= 75) return '#0059A5';
  if (score >= 65) return '#d97706';
  return '#dc2626';
}
