// Filters, totals, averages and the frozen-data notice shared by the Visitor Analysis pages. `data`
// is the payload from build/prep/visitors.py: one entry per logged day with 24 hourly counts per
// entry point, or null where that entry point has no records for the day.

import { h } from '../../shell/dom.js?v=e03acf3e7a';
import { DAYS, calendarDate, monthLabel } from '../../shell/format.js?v=4974441338';
import { icon } from '../../shell/icons.js?v=5a859aeff6';
import { selectControl } from '../../shell/ui.js?v=08586281b3';

export const OVERNIGHT_HOURS = 7; // 12 AM up to 7 AM, the hours the source pipeline counts as overnight
export const OVERNIGHT_LABEL = '12 AM to 7 AM';
export const COLORS = { primary: '#0059a5', overnight: '#e87722', weekend: '#6acdec' };

const DAY_FILTERS = [
  { value: 'all', label: 'All days', days: [0, 1, 2, 3, 4, 5, 6] },
  { value: 'weekdays', label: 'Weekdays', days: [0, 1, 2, 3, 4] },
  { value: 'weekends', label: 'Weekends', days: [5, 6] },
  ...DAYS.map((day, i) => ({ value: String(i), label: `${day}s`, days: [i] })),
];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_INDEX = Array.from({ length: 24 }, (_, hour) => hour);

export const thousands = (value) => (value >= 1000 ? `${value / 1000}k` : String(value));
export const percent = (part, total, decimals = 1) => (total > 0 ? ((100 * part) / total).toFixed(decimals) : (0).toFixed(decimals));
export const sum = (values) => values.reduce((total, n) => total + n, 0);
const weekday = (iso) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday is 0

export function months(data) {
  return [...new Set(data.days.map((day) => day.date.slice(0, 7)))];
}

// The entry point, month and days chosen in the page controls, shared by every page.
export function selection(data, state) {
  const entry = data.entries[Number(state.entry)] ? Number(state.entry) : null;
  return {
    entry,
    entries: entry == null ? data.entries.map((_, i) => i) : [entry],
    month: months(data).includes(state.month) ? state.month : null,
    dayFilter: DAY_FILTERS.find((filter) => filter.value === state.days) ?? DAY_FILTERS[0],
  };
}

// Totals and averages over the selected days and entry points.
//
// The one rule (docs/DESIGN.md, Visitor Analysis): a day without records for an entry point is
// missing, not zero. An entry point's own average is its visitors over the days it has records in
// the selection. A combined figure for several entry points (the daily average, the average hour,
// the overnight share, each entry point's share) is built weekday by weekday: for each weekday,
// each entry point's visitors over its own logged days of that weekday, added up; then the
// weekdays are averaged, each weighted by its days with any records in the selection. So an entry
// point closed on weekends adds its weekend visitors to weekends, not its weekday average. With one
// entry point selected this is simply its visitors over its logged days. Totals count the visitors
// logged. Arrays indexed by entry point have one slot per entry point; unselected ones stay empty.
export function aggregate(data, sel) {
  const entries = data.entries.map(() => ({ days: 0, total: 0, weekdayDays: zeros(7) }));
  const group = newGroup(data.entries.length);
  const result = { days: 0, total: 0, hourly: zeros(24), weekdayDays: zeros(7), daily: [], months: new Map(), weeks: new Map() };
  for (const day of data.days) {
    const dow = weekday(day.date);
    if ((sel.month && !day.date.startsWith(sel.month)) || !sel.dayFilter.days.includes(dow)) continue;
    const logged = sel.entries.filter((i) => day.counts[i]);
    if (logged.length === 0) continue; // no selected entry point has records this day
    const byEntry = data.entries.map((_, i) => (logged.includes(i) ? sum(day.counts[i]) : null));
    const total = sum(logged.map((i) => byEntry[i]));
    const month = monthTotals(result, data, day.date.slice(0, 7));
    addDay(group, dow, logged, day.counts);
    addDay(month.group, dow, logged, day.counts);
    for (const i of logged) {
      entries[i].days += 1;
      entries[i].total += byEntry[i];
      entries[i].weekdayDays[dow] += 1;
      day.counts[i].forEach((n, hour) => { result.hourly[hour] += n; });
      month.logged[i] += 1;
      month.byEntry[i] += byEntry[i];
    }
    result.days += 1;
    result.total += total;
    result.weekdayDays[dow] += 1;
    result.daily.push({ date: day.date, byEntry, total });
    month.days += 1;
    month.total += total;

    const monday = new Date(Date.parse(`${day.date}T00:00:00Z`) - dow * DAY_MS).toISOString().slice(0, 10);
    if (!result.weeks.has(monday)) result.weeks.set(monday, { first: day.date, days: 0, total: 0 });
    const week = result.weeks.get(monday);
    week.days += 1;
    week.total += total;
  }

  const combined = averageDay(group, sel.entries);
  result.logged = entries.map((entry) => entry.days);
  result.byEntry = entries.map((entry) => entry.total);
  result.entryAverage = entries.map((entry) => (entry.days ? entry.total / entry.days : null));
  result.entryPartOfDay = combined.byEntry; // each entry point's part of the combined daily average
  result.dailyAverage = combined.total;
  result.hourlyAverage = combined.hourly;
  result.overnight = sum(result.hourly.slice(0, OVERNIGHT_HOURS));
  result.overnightAverage = sum(combined.hourly.slice(0, OVERNIGHT_HOURS));
  result.peakHour = combined.hourly.indexOf(Math.max(...combined.hourly));
  result.weekdayLogged = entries.map((entry) => entry.weekdayDays);
  result.weekdayHourAverage = DAYS.map((_, dow) => weekdayHours(group, sel.entries, dow));
  result.weekdayAverage = result.weekdayHourAverage.map((hours) => (hours ? sum(hours) : null));
  for (const month of result.months.values()) {
    const monthDay = averageDay(month.group, sel.entries);
    month.entryAverage = month.byEntry.map((n, i) => (month.logged[i] ? n / month.logged[i] : null));
    month.average = monthDay.total;
    month.overnightAverage = sum(monthDay.hourly.slice(0, OVERNIGHT_HOURS));
  }
  return result;
}

function zeros(length) {
  return Array(length).fill(0);
}

// Running totals for a group of days (the selection, or one month of it): days with any records per
// weekday, and per entry point and weekday, its logged days and its visitors by hour.
function newGroup(entryCount) {
  return {
    weekdayDays: zeros(7),
    cells: Array.from({ length: entryCount }, () => DAYS.map(() => ({ days: 0, hourly: zeros(24) }))),
  };
}

function addDay(group, dow, logged, counts) {
  group.weekdayDays[dow] += 1;
  for (const i of logged) {
    const cell = group.cells[i][dow];
    cell.days += 1;
    counts[i].forEach((n, hour) => { cell.hourly[hour] += n; });
  }
}

// One weekday's average hours: each entry point's visitors over its logged days of that weekday,
// added up across `entryIndexes`; null when none of them has records on that weekday.
function weekdayHours(group, entryIndexes, dow) {
  const open = entryIndexes.filter((i) => group.cells[i][dow].days > 0);
  if (open.length === 0) return null;
  return HOUR_INDEX.map((hour) => sum(open.map((i) => group.cells[i][dow].hourly[hour] / group.cells[i][dow].days)));
}

// The combined average day of a group: the weekdays' average hours, each weekday weighted by its
// days with any records. byEntry holds each entry point's part of the total, in visitors.
export function averageDay(group, entryIndexes) {
  const days = sum(group.weekdayDays);
  const weight = (dow) => (days ? group.weekdayDays[dow] / days : 0);
  const entryDay = (i, dow, hour) => (group.cells[i][dow].days ? group.cells[i][dow].hourly[hour] / group.cells[i][dow].days : 0);
  const byEntryHour = group.cells.map((_, i) => (entryIndexes.includes(i)
    ? HOUR_INDEX.map((hour) => sum(DAYS.map((_d, dow) => weight(dow) * entryDay(i, dow, hour))))
    : null));
  const hourly = HOUR_INDEX.map((hour) => sum(entryIndexes.map((i) => byEntryHour[i][hour])));
  return { hourly, total: sum(hourly), byEntry: byEntryHour.map((hours) => (hours ? sum(hours) : null)) };
}

function monthTotals(result, data, month) {
  if (!result.months.has(month)) {
    const perEntry = () => data.entries.map(() => 0);
    result.months.set(month, { month, days: 0, total: 0, byEntry: perEntry(), logged: perEntry(), group: newGroup(data.entries.length) });
  }
  return result.months.get(month);
}

// Days behind a figure: the entry point's own logged days when one is selected, else days with any records.
export function daysLabel(sel) {
  return sel.entry == null ? 'Days with Any Records' : 'Days Logged';
}

export function weekdayDays(agg, sel, dow) {
  return sel.entry == null ? agg.weekdayDays[dow] : agg.weekdayLogged[sel.entry][dow];
}

// Every month from the first to the last month in the selection, with null for months that have no logs.
export function monthAxis(agg) {
  const shown = [...agg.months.keys()];
  const axis = [];
  for (let month = shown[0]; month && month <= shown.at(-1); month = nextMonth(month)) axis.push(month);
  return axis.map((month) => ({ month, totals: agg.months.get(month) ?? null }));
}

function nextMonth(month) {
  const [year, m] = month.split('-').map(Number);
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`;
}

export function daysInMonth(month) {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

export function filterControls(data, ctx, { dates = true } = {}) {
  const sel = selection(data, ctx.state);
  const set = (key) => (value) => {
    ctx.state[key] = value;
    ctx.rerender();
  };
  return h('div', { class: 'page-controls' },
    selectControl({
      id: 'vis-entry',
      label: 'Entry',
      value: sel.entry == null ? 'all' : String(sel.entry),
      options: [{ value: 'all', label: 'All entry points' }, ...data.entries.map((entry, i) => ({ value: String(i), label: entry.name }))],
      onChange: set('entry'),
    }),
    dates && selectControl({
      id: 'vis-month',
      label: 'Month',
      value: sel.month ?? 'all',
      options: [{ value: 'all', label: 'All months' }, ...months(data).map((month) => ({ value: month, label: monthLabel(month) }))],
      onChange: set('month'),
    }),
    dates && selectControl({
      id: 'vis-days',
      label: 'Days',
      value: sel.dayFilter.value,
      options: DAY_FILTERS.map(({ value, label }) => ({ value, label })),
      onChange: set('days'),
    }));
}

// What the page is showing, in words. The controls do not print; this line does.
export function scopeLine(data, sel, { dates = true } = {}) {
  const parts = [sel.entry == null ? 'All entry points' : data.entries[sel.entry].name];
  if (dates) {
    parts.push(sel.month ? monthLabel(sel.month) : 'all months', sel.dayFilter.value === 'all' ? 'all days' : sel.dayFilter.label.toLowerCase());
  } else {
    parts.push('every logged day');
  }
  return h('p', { class: 'vis-scope' }, h('strong', {}, 'Showing: '), parts.join(' · '));
}

// The notice at the top of every page: the analysis is frozen, where the logs have gaps, and how
// many days each entry point was logged, since its averages use only those days.
export function frozenNotice(data) {
  const first = data.days[0].date;
  const last = data.days.at(-1).date;
  const gaps = [
    ...data.missingMonths.map((month) => ({ month, pct: 0 })),
    ...data.partialMonths.map((month) => ({ month: month.month, pct: Math.round((100 * month.days) / month.daysInMonth) })),
  ].sort((a, b) => a.month.localeCompare(b.month));
  const weekendDays = data.days.filter((day) => weekday(day.date) >= 5).length;
  const coverage = data.entries.flatMap((entry, i) => {
    const { days, last: entryLast, weekendDays: entryWeekends } = data.coverage[i];
    if (days === data.days.length) return [];
    const parts = [`records on ${days} of ${data.days.length} days`];
    if (entryLast < last) parts.push(`none after ${calendarDate(entryLast)}`);
    if (entryWeekends === 0) parts.push('weekdays only');
    else if (entryWeekends < weekendDays) parts.push(`${entryWeekends} of ${weekendDays} weekend days`);
    return [`${entry.name}: ${parts.join(', ')}`];
  });
  return h('aside', { class: 'vis-frozen' },
    icon('alert-circle', { size: 18, className: 'vis-frozen-icon' }),
    h('div', {},
      h('p', { class: 'vis-frozen-title' },
        `Frozen analysis: security visitor logs from ${calendarDate(first)} to ${calendarDate(last)}, prepared ${calendarDate(data.prepared)}. Not updated.`),
      gaps.length > 0 && h('p', {},
        'Months with missing days (share of days logged): ',
        gaps.map(({ month, pct }) => h('span', { class: `vis-gap ${gapClass(pct)}` }, `${monthLabel(month)}: ${pct}%`))),
      data.excludedDays > 0 && h('p', {}, `${data.excludedDays} more days with incomplete logs are left out of every chart.`),
      coverage.length > 0 && h('p', {}, `${coverage.join('. ')}. An entry point's averages use only the days it has records.`)));
}

function gapClass(pct) {
  if (pct === 0) return 'vis-gap-0';
  if (pct <= 50) return 'vis-gap-50';
  if (pct <= 75) return 'vis-gap-75';
  return 'vis-gap-90';
}

// One row; on a phone the entries page sideways instead of wrapping into the axis labels.
export const LEGEND = { type: 'scroll', bottom: 0, itemWidth: 14, itemGap: 12, textStyle: { color: '#374151', fontSize: 11 } };

// Charts narrower than this (a phone) drop detail that would not fit.
export const isNarrow = (el) => el.clientWidth < 520;
