// Needs by Hour: for each need, how its calls spread over the day compared with all calls at that hour.
// The color is diverging on the log of the ratio, so 0.5x and 2x sit equally far from 1.0x, and cells
// with under 3 calls are hatched instead of colored.

import { tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { HOURS } from '../../../shell/format.js?v=4974441338';
import { card } from '../../../shell/ui.js?v=08586281b3';
import { RAMPS, detailContent, detailPanel, heatTable, hoverTip, legend, legendBar, ramp, shortNeed } from '../model.js?v=8664ca03f5';

const MIN_CALLS = 3; // fewer calls than this in a cell is too thin to read
const SHOW_FROM = 1.5; // print the ratio in cells this concentrated or more
const SCHEDULE_INDEX = 1.4; // a cell this concentrated, with SCHEDULE_CALLS or more, is worth planning around
const SCHEDULE_CALLS = 8;

export default {
  id: 'needs',
  title: 'Needs by Hour',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const pinned = data.needHour.some((need) => need.label === ctx.state.needCell?.label) ? ctx.state.needCell : null;
    const detail = detailPanel();
    const tip = hoverTip(container);
    const showDetail = (cell) => (cell ? detail.show(cellDetail(data, cell)) : detail.show(defaultDetail(), { hint: true }));
    const table = heatTable({
      label: 'Need concentration by hour',
      rows: data.needHour.map((need) => ({ need, label: shortNeed(data, need.label), title: need.label })),
      cell: ({ need }, hour) => look(need, hour),
      selected: ({ need }, hour) => pinned?.label === need.label && pinned.hour === hour,
      onPick: ({ row, hour, td }) => {
        ctx.state.needCell = { label: row.need.label, hour };
        table.querySelector('.cl-selected')?.classList.remove('cl-selected');
        td.classList.add('cl-selected');
        showDetail(ctx.state.needCell);
      },
      onHover: (event, { row, hour }) => tip.show(event, cellTip(data, row.need, hour)),
      onLeave: tip.hide,
      wideLabels: true,
    });
    showDetail(pinned);
    container.prepend(card({ title: 'What they call for, and when', icon: 'grid' },
      h('p', { class: 'cl-caption' },
        'Each row is one need spread across the 24 hours. Orange means that need lands ', h('strong', {}, 'more'),
        ' than that hour\'s overall volume would predict, blue means less, and 1.00× is exactly as expected. ',
        'Follow a row and look for the orange: that is the hour a scheduled round pays for itself.'),
      table,
      legend('0.5× rare for this hour', legendBar(RAMPS.ratio), '2× concentrated',
        h('span', { class: 'cl-legend-thin' }), `Hatched = under ${MIN_CALLS} calls, too thin to read. Number shown from ${SHOW_FROM}× up.`),
      detail.el));
  },

  exports(data) {
    return {
      columns: [
        { key: 'need', label: 'Need' },
        { key: 'calls', label: 'Calls', decimals: 0 },
        ...HOURS.map((label, hour) => ({ key: `h${hour}`, label, decimals: 2 })),
      ],
      rows: data.needHour.map((need) => ({
        need: need.label,
        calls: need.calls,
        ...Object.fromEntries(need.index.map((index, hour) => [`h${hour}`, need.hours[hour] >= MIN_CALLS ? index : null])),
      })),
    };
  },
};

function look(need, hour) {
  if (need.hours[hour] < MIN_CALLS) return { thin: true, text: '' };
  const index = need.index[hour];
  return {
    background: ramp(0.5 + Math.log2(index || 0.01) / 2, RAMPS.ratio),
    text: index >= SHOW_FROM ? index.toFixed(1) : '',
  };
}

function shareOf(need, hour) {
  return need.calls ? Math.round((100 * need.hours[hour]) / need.calls) : 0;
}

function cellTip(data, need, hour) {
  const short = shortNeed(data, need.label);
  return tooltipContent(`${need.label} at ${HOURS[hour]}`, [
    { label: `${need.hours[hour]} calls`, value: `${shareOf(need, hour)}% of ${short} calls` },
    { label: 'Against this hour\'s volume', value: `${need.index[hour].toFixed(2)}×` },
    need.hours[hour] < MIN_CALLS && { label: 'Too few to read into', value: '' },
  ].filter(Boolean));
}

function cellDetail(data, { label, hour }) {
  const need = data.needHour.find((entry) => entry.label === label);
  const calls = need.hours[hour];
  const index = need.index[hour];
  const strong = index >= SCHEDULE_INDEX && calls >= SCHEDULE_CALLS;
  return detailContent(`${need.label} at ${HOURS[hour]}`,
    `${calls} calls, ${index.toFixed(2)}× expected, ${shareOf(need, hour)}% of every ${shortNeed(data, need.label)} call in the record. `
    + (strong ? 'Strong enough to schedule against.' : 'Directional only at this volume.'));
}

function defaultDetail() {
  return detailContent('Read it row by row',
    'Follow one need across the day and look for the orange. That is the hour the unit gets asked for that thing more than '
    + 'sheer volume explains, which is where a scheduled round pays for itself. Tap or click a cell for its numbers.');
}
