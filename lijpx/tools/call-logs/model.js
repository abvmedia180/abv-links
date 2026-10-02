// Labels, color scales and the 24-hour heat map shared by the Handwritten Call Log Analysis pages.
// `data` is the payload from build/prep/call_logs.py. The color rules are v1's.

import { h } from '../../shell/dom.js?v=e03acf3e7a';
import { HOURS } from '../../shell/format.js?v=4974441338';

export const WEEK_ROWS = [6, 0, 1, 2, 3, 4, 5]; // Sunday first, as v1 showed the week
const HOUR_TICKS = Array.from({ length: 24 }, (_, hour) => `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`);
export const SHIFTS = {
  day: { label: 'Day', hours: '7a-3p', color: '#0059a5' },
  evening: { label: 'Evening', hours: '3p-11p', color: '#eb6834' },
  night: { label: 'Night', hours: '11p-7a', color: '#1baf7a' },
};
// Columns of the shift band above each heat map. Night runs 11p-7a; the 11p column is left unlabelled.
const SHIFT_BANDS = [['Night', 0, 7], ['Day', 7, 15], ['Evening', 15, 23], ['', 23, 24]];
const SHIFT_STARTS = new Set([7, 15, 23]);

// Volume is one blue hue; a separate orange band marks hot spots. Blending blue into orange turns brown.
export const RAMPS = {
  volume: ['#f4f8fc', '#dbeaf6', '#b3d2e9', '#7fb2d9', '#3f8cc4', '#0059a5'],
  hot: ['#f5a06a', '#eb6834', '#c0451a'],
  ratio: ['#2b7fba', '#9dc2e0', '#eef1f4', '#f8c8a8', '#eb6834'],
  completion: ['#c0451a', '#eb6834', '#f6c9a9', '#cfe0ef', '#0059a5'],
};
export const HOT_SPOT = 1.75; // a cell this many times the average hour switches to the orange band

const COARSE_POINTER = window.matchMedia('(pointer: coarse)').matches;

export function ramp(t, stops) {
  const clamped = Math.max(0, Math.min(1, t));
  const last = stops.length - 1;
  const i = Math.min(last - 1, Math.floor(clamped * last));
  const f = clamped * last - i;
  const [a, b] = [rgb(stops[i]), rgb(stops[i + 1])];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(', ')})`;
}

// White text on dark cells, dark text on light ones.
function textOn(color) {
  const [r, g, b] = color.match(/\d+/g).map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.56 ? '#ffffff' : '#25313f';
}

function gradient(stops) {
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Hours ranked by share marked complete, among hours with enough calls to judge.
export function closeOutHours(data, minCalls = 40) {
  const scored = data.hourly.map((hour, i) => ({ ...hour, hour: i })).filter((hour) => hour.calls >= minCalls);
  const byPct = [...scored].sort((a, b) => a.completePct - b.completePct);
  return { worst: byPct[0] ?? null, best: byPct.at(-1) ?? null };
}

// Average calls per day for each weekday, busiest first, over weekdays with at least five scanned days.
export function weekRank(data) {
  return data.grid.calls
    .map((row, day) => ({ day, days: data.grid.days[day], avg: row.reduce((sum, n) => sum + n, 0) / (data.grid.days[day] || 1) }))
    .filter((entry) => entry.days >= 5)
    .sort((a, b) => b.avg - a.avg);
}

export function shortNeed(data, label) {
  return data.needs.find((need) => need.label === label)?.short ?? label;
}

// A 24-hour heat map: a shift band, an hour row, then one row per entry with a sticky label.
// cell(row, hour) returns { text, background, thin }. onPick runs on click, tap, or Enter or Space on
// the focused cell; onHover only with a mouse, since on touch the tooltip would cover the grid (the
// pinned detail panel replaces it). The grid takes one Tab stop (the picked cell, else the first);
// the arrow keys, Home and End move between cells.
export function heatTable({ label, rows, cell, selected, onPick, onHover, onLeave, wideLabels = false }) {
  const head = [
    h('tr', { class: 'cl-shift-row' },
      h('th', { scope: 'col', class: 'cl-corner' }),
      SHIFT_BANDS.map(([name, from, to]) => h('th', { scope: 'colgroup', colspan: to - from, class: 'cl-shift' }, name))),
    h('tr', {},
      h('th', { scope: 'col', class: 'cl-corner' }),
      HOUR_TICKS.map((tick, hour) => h('th', { scope: 'col', class: `cl-hour${SHIFT_STARTS.has(hour) ? ' cl-shift-start' : ''}` }, tick))),
  ];
  const body = rows.map((row, r) => h('tr', {},
    h('th', { scope: 'row', class: 'cl-row-label', title: row.title }, row.label),
    HOURS.map((_, hour) => {
      const look = cell(row, hour);
      const classes = ['cl-cell'];
      if (SHIFT_STARTS.has(hour)) classes.push('cl-shift-start');
      if (look.thin) classes.push('cl-thin');
      if (selected?.(row, hour)) classes.push('cl-selected');
      return h('td', {
        class: classes.join(' '),
        style: look.thin ? null : { background: look.background, color: textOn(look.background) },
        dataset: { row: r, hour },
        tabindex: '-1',
      }, look.text);
    })));
  const target = (event) => {
    const td = event.target.closest('td.cl-cell');
    return td && { row: rows[Number(td.dataset.row)], hour: Number(td.dataset.hour), td };
  };
  const table = h('table', {
    class: `cl-heat${wideLabels ? ' cl-heat-wide-labels' : ''}`,
    'aria-label': label,
    onclick: (event) => {
      const hit = target(event);
      if (hit) onPick(hit);
    },
    onkeydown: (event) => {
      const hit = target(event);
      if (!hit) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPick(hit);
        return;
      }
      const [dr, dh] = KEY_MOVES[event.key]?.(hit.hour) ?? [];
      const next = dr == null ? null : table.querySelector(`td.cl-cell[data-row="${Number(hit.td.dataset.row) + dr}"][data-hour="${hit.hour + dh}"]`);
      if (!next) return;
      event.preventDefault();
      hit.td.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    },
    onmousemove: (event) => {
      const hit = target(event);
      if (hit && !COARSE_POINTER) onHover(event, hit);
      else onLeave();
    },
    onmouseleave: onLeave,
  }, h('thead', {}, head), h('tbody', {}, body));
  const start = table.querySelector('td.cl-selected') ?? table.querySelector('td.cl-cell');
  if (start) start.tabIndex = 0;
  return h('div', { class: 'cl-heat-wrap' }, table);
}

// Keyboard moves in a heat map, as [rows, hours] from the cell with focus at `hour`.
const KEY_MOVES = {
  ArrowLeft: () => [0, -1],
  ArrowRight: () => [0, 1],
  ArrowUp: () => [-1, 0],
  ArrowDown: () => [1, 0],
  Home: (hour) => [0, -hour],
  End: (hour) => [0, 23 - hour],
};

// A tooltip that follows the mouse over a heat map. It lives inside the page, so a re-render removes it.
export function hoverTip(container) {
  const tip = h('div', { class: 'cl-tip', role: 'tooltip', hidden: true });
  container.append(tip);
  return {
    show(event, content) {
      tip.replaceChildren(content);
      tip.hidden = false;
      const left = Math.max(6, Math.min(event.clientX + 14, window.innerWidth - tip.offsetWidth - 8));
      const below = event.clientY + 16;
      const top = below + tip.offsetHeight > window.innerHeight ? Math.max(6, event.clientY - tip.offsetHeight - 10) : below;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    },
    hide() {
      tip.hidden = true;
    },
  };
}

// The panel under a heat map: a hint until a cell is picked, then that cell's numbers. The hint does not print.
export function detailPanel() {
  const el = h('div', { class: 'cl-detail', 'aria-live': 'polite' });
  return {
    el,
    show(content, { hint = false } = {}) {
      el.classList.toggle('cl-detail-hint', hint);
      el.replaceChildren(...content);
    },
  };
}

// Content for the detail panel: a heading, a sentence, optional chips.
export function detailContent(title, text, chips = []) {
  const content = [h('h3', { class: 'cl-detail-title' }, title), h('p', {}, text)];
  if (chips.length > 0) {
    content.push(h('div', { class: 'cl-chips' }, chips.map(([label, value]) => h('span', { class: 'cl-chip' }, `${label} `, h('b', {}, value)))));
  }
  return content;
}

export function legend(...items) {
  return h('div', { class: 'cl-legend' }, items);
}

export function legendBar(stops, wide = true) {
  return h('span', { class: `cl-legend-bar${wide ? '' : ' cl-legend-bar-short'}`, style: { background: gradient(stops) } });
}
