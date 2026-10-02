// When Calls Land: day of week by hour. Every cell is an average per day of that weekday, never a
// raw count, because some weekdays have fewer scanned days than others.

import { tooltipContent } from '../../../shell/charts.js?v=72034d3cd0';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { DAYS, DAYS_SHORT, HOURS } from '../../../shell/format.js?v=4796f631fd';
import { card, selectControl } from '../../../shell/ui.js?v=08586281b3';
import {
  HOT_SPOT, RAMPS, WEEK_ROWS, detailContent, detailPanel, heatTable, hoverTip, legend, legendBar, ramp, shortNeed,
} from '../model.js?v=a532a8c377';

const MODES = [
  { value: 'volume', label: 'Volume' },
  { value: 'need', label: 'One need' },
  { value: 'completion', label: 'Completion' },
];
const MIN_COMPLETION_CALLS = 5; // fewer calls than this in a cell is too thin to score completion

export default {
  id: 'week',
  title: 'When Calls Land',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const view = selectedView(data, ctx.state);
    const scale = scaleOf(view.values);
    const pinned = ctx.state.weekCell ?? null;
    const detail = detailPanel();
    const tip = hoverTip(container);
    const showDetail = (cell) => (cell ? detail.show(cellDetail(data, cell)) : detail.show(defaultDetail(data), { hint: true }));
    const table = heatTable({
      label: 'Calls by day of week and hour',
      rows: WEEK_ROWS.map((day) => ({ day, label: DAYS_SHORT[day], title: DAYS[day] })),
      cell: ({ day }, hour) => look(view, scale, view.values[day][hour]),
      selected: ({ day }, hour) => pinned?.day === day && pinned.hour === hour,
      onPick: ({ row, hour, td }) => {
        ctx.state.weekCell = { day: row.day, hour };
        table.querySelector('.cl-selected')?.classList.remove('cl-selected');
        td.classList.add('cl-selected');
        showDetail(ctx.state.weekCell);
      },
      onHover: (event, { row, hour }) => tip.show(event, cellTip(data, view, row.day, hour)),
      onLeave: tip.hide,
    });
    showDetail(pinned);
    container.prepend(
      h('div', { class: 'page-controls' },
        selectControl({
          id: 'cl-week-mode',
          label: 'Color by',
          value: view.mode,
          options: MODES,
          onChange: (value) => {
            ctx.state.weekMode = value;
            ctx.rerender();
          },
        }),
        view.mode === 'need' && selectControl({
          id: 'cl-week-need',
          label: 'Need',
          value: view.need.label,
          options: data.grid.needs.map((need) => ({ value: need.label, label: need.label })),
          onChange: (value) => {
            ctx.state.weekNeed = value;
            ctx.rerender();
          },
        })),
      card({ title: 'When the calls land: day of week by hour', icon: 'grid' },
        h('p', { class: 'cl-caption' },
          'Color is the ', h('strong', {}, 'average per day of that weekday'), ', not the raw count, so a weekday with fewer scanned days ',
          'does not look unfairly quiet. Hover a cell, or tap it on a phone, to see what those patients asked for.'),
        h('p', { class: 'cl-showing' }, view.description),
        table,
        legendFor(view, scale),
        detail.el),
    );
  },

  exports(data, ctx) {
    const view = selectedView(data, ctx.state);
    return {
      columns: [
        { key: 'day', label: 'Day' },
        { key: 'measure', label: 'Measure' },
        { key: 'days', label: 'Scanned Days', decimals: 0 },
        ...HOURS.map((label, hour) => ({ key: `h${hour}`, label, decimals: view.mode === 'completion' ? 0 : 2 })),
      ],
      rows: WEEK_ROWS.map((day) => ({
        day: DAYS[day],
        measure: view.description,
        days: data.grid.days[day],
        ...Object.fromEntries(view.values[day].map((value, hour) => [`h${hour}`, value])),
      })),
    };
  },
};

function selectedView(data, state) {
  const mode = MODES.some((m) => m.value === state.weekMode) ? state.weekMode : 'volume';
  const perDay = (counts) => counts.map((row, day) => row.map((n) => n / (data.grid.days[day] || 1)));
  if (mode === 'completion') {
    return {
      mode,
      description: 'Percent of calls marked complete',
      values: data.grid.calls.map((row, day) => row.map((n, hour) => (n >= MIN_COMPLETION_CALLS ? (100 * data.grid.complete[day][hour]) / n : null))),
    };
  }
  if (mode === 'need') {
    const need = data.grid.needs.find((n) => n.label === state.weekNeed) ?? data.grid.needs[0];
    return { mode, need, description: `${need.label}: calls per day`, values: perDay(need.cells) };
  }
  return { mode, description: 'All calls: calls per day', values: perDay(data.grid.calls) };
}

function scaleOf(values) {
  const scored = values.flat().filter((v) => v != null);
  const mean = scored.reduce((sum, v) => sum + v, 0) / (scored.length || 1);
  return {
    max: Math.max(...scored, 0) || 1,
    hot: mean * HOT_SPOT,
    floor: Math.min(Math.floor(Math.min(...scored, 100) / 10) * 10, 60),
  };
}

function look(view, scale, value) {
  if (value == null) return { thin: true, text: '' };
  if (view.mode === 'completion') {
    return { background: ramp((value - scale.floor) / ((100 - scale.floor) || 1), RAMPS.completion), text: String(Math.round(value)) };
  }
  if (scale.hot > 0 && value >= scale.hot) {
    return { background: ramp((value - scale.hot) / ((scale.max - scale.hot) || 1), RAMPS.hot), text: value.toFixed(1) };
  }
  return { background: ramp(scale.hot > 0 ? value / scale.hot : 0, RAMPS.volume), text: value >= 0.1 ? value.toFixed(1) : '' };
}

function legendFor(view, scale) {
  if (view.mode === 'completion') {
    return legend(`${scale.floor}%`, legendBar(RAMPS.completion), '100% marked complete',
      h('span', { class: 'cl-legend-thin' }), `Hatched = under ${MIN_COMPLETION_CALLS} calls, too thin to score`);
  }
  const base = view.mode === 'need' ? 'this need\'s average hour' : 'the unit\'s average hour';
  return legend('quiet', legendBar(RAMPS.volume), 'busy', legendBar(RAMPS.hot, false),
    h('span', {}, h('strong', {}, 'hot spot'), `: ${scale.hot.toFixed(1)}+ calls a day, ${HOT_SPOT}× ${base}`));
}

function cellStats(data, day, hour) {
  const calls = data.grid.calls[day][hour];
  const days = data.grid.days[day] || 1;
  const needs = data.grid.needs
    .map((need) => ({ need, calls: need.cells[day][hour] }))
    .filter((entry) => entry.calls > 0)
    .sort((a, b) => b.calls - a.calls);
  const named = needs.reduce((sum, entry) => sum + entry.calls, 0);
  return {
    calls,
    days,
    avg: calls / days,
    completePct: calls ? Math.round((100 * data.grid.complete[day][hour]) / calls) : null,
    needs,
    other: calls - named,
  };
}

function cellTip(data, view, day, hour) {
  const stats = cellStats(data, day, hour);
  const rows = [{ label: `${stats.calls} calls over ${stats.days} days`, value: `${stats.avg.toFixed(1)} per ${DAYS_SHORT[day]}` }];
  if (view.mode === 'need') {
    const count = view.need.cells[day][hour];
    rows.push({ label: shortNeed(data, view.need.label), value: String(count), note: stats.calls ? `${Math.round((100 * count) / stats.calls)}% of calls` : '' });
  }
  if (stats.completePct != null) rows.push({ label: 'Marked complete', value: `${stats.completePct}%` });
  if (stats.needs.length > 0) {
    rows.push({ label: stats.needs.slice(0, 4).map((entry) => `${shortNeed(data, entry.need.label)} ${entry.calls}`).join(' · '), value: '' });
  }
  return tooltipContent(`${DAYS_SHORT[day]} ${HOURS[hour]}`, rows);
}

function cellDetail(data, { day, hour }) {
  const stats = cellStats(data, day, hour);
  const relative = data.grid.avgCell ? stats.avg / data.grid.avgCell : 0;
  const plural = stats.days === 1 ? '' : 's';
  const text = `${stats.calls} calls across ${stats.days} scanned ${DAYS[day]}${plural}: ${stats.avg.toFixed(1)} per ${DAYS_SHORT[day]}`
    + `${relative ? `, ${relative.toFixed(1)}× the unit's average hour` : ''}.`
    + `${stats.completePct != null ? ` ${stats.completePct}% marked complete.` : ''}`
    + `${stats.calls === 0 ? ' Nothing logged in this hour.' : ''}`;
  const chips = stats.needs.slice(0, 6).map((entry) => [shortNeed(data, entry.need.label), String(entry.calls)]);
  if (stats.needs.length > 0 && stats.other > 0) chips.push(['other', String(stats.other)]);
  return detailContent(`${DAYS[day]} at ${HOURS[hour]}`, text, chips);
}

function defaultDetail(data) {
  const hottest = data.grid.hottest[0];
  return detailContent('Hover or tap any cell',
    'You get the call count, the average for that weekday, the completion rate, and what those patients asked for.'
    + (hottest ? ` Hottest cell: ${DAYS[hottest.day]} at ${HOURS[hottest.hour]}, ${hottest.avg.toFixed(2)} calls per `
      + `${DAYS_SHORT[hottest.day]}, ${hottest.calls} in total.` : ''));
}
