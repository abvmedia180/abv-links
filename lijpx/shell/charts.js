// ECharts lifecycle for the current page: create, resize with the window, refit for print, dispose.
// Tools never call echarts.init themselves; they call ctx.chart(el, option).

import { h } from './dom.js?v=e03acf3e7a';

let echarts = null;
let loading = null;
let sizedForPaper = false;
const charts = new Set();

// print.css hides .chart-tooltip: hideTip (in fitChartsForPrint) only hides it 100 ms later, after the paper layout.
export const TOOLTIP_STYLE = {
  className: 'chart-tooltip',
  backgroundColor: '#ffffff',
  borderColor: '#e5e7eb',
  padding: [12, 16],
  textStyle: { color: '#1a1a2e', fontSize: 13 },
};

// Axis pieces in the hub's colors: axis line, category labels, value labels, grid lines.
export const AXIS_STYLE = {
  line: { lineStyle: { color: '#e5e7eb' } },
  label: { color: '#374151', fontSize: 11 },
  valueLabel: { color: '#6b7280', fontSize: 11 },
  split: { lineStyle: { color: '#f3f4f6' } },
};

export function loadECharts() {
  loading ??= import('../vendor/echarts-5.5.0/echarts.esm.min.js?v=971816189b').then((module) => { echarts = module; });
  return loading;
}

export function createChart(el, option, { reducedMotion }) {
  const chart = echarts.init(el);
  chart.setOption({ animation: !reducedMotion, aria: { enabled: true }, ...option });
  charts.add(chart);
  return chart;
}

export function disposeCharts() {
  for (const chart of charts) chart.dispose();
  charts.clear();
}

export function resizeCharts() {
  if (sizedForPaper) return; // keep the paper size until printing ends
  for (const chart of charts) chart.resize();
}

// Re-render every chart at the width it will have on paper. `printableWidth` is the page width
// inside the margins; `page` is the element the tool renders into, which spans that width in print.
// A chart keeps the same insets inside `page` on screen and on paper, so its print width is the
// printable width minus those insets.
export function fitChartsForPrint(printableWidth, page) {
  const pageStyle = getComputedStyle(page);
  const pageWidth = page.clientWidth - parseFloat(pageStyle.paddingLeft) - parseFloat(pageStyle.paddingRight);
  sizedForPaper = true;
  for (const chart of charts) {
    const el = chart.getDom();
    const width = Math.floor(printableWidth - (pageWidth - el.clientWidth));
    chart.dispatchAction({ type: 'hideTip' });
    chart.resize({ width, height: el.clientHeight });
    chart.getZr().flush();
  }
}

export function restoreChartsAfterPrint() {
  sizedForPaper = false;
  for (const chart of charts) {
    chart.resize({ width: 'auto', height: 'auto' }); // an explicit size sticks until reset to 'auto'
    chart.getZr().flush();
  }
}

// Tooltip content as DOM nodes. ECharts would insert a formatter's string with innerHTML, and its
// default markers carry inline styles that the site's Content-Security-Policy blocks.
export function tooltipContent(title, rows) {
  return h('div', { class: 'chart-tip' },
    h('div', { class: 'chart-tip-title' }, title),
    rows.map(({ color, label, value, note, noteTone }) => h('div', { class: 'chart-tip-row' },
      color && h('span', { class: 'chart-tip-dot', style: { background: color } }),
      h('span', { class: 'chart-tip-label' }, label),
      h('span', { class: 'chart-tip-value' }, value),
      note && h('span', { class: `chart-tip-note${noteTone ? ` tone-${noteTone}` : ''}` }, note),
    )),
  );
}
