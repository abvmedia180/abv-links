// Overview: what the archive is, the headline numbers, three findings and the suggested plays.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { DAYS, DAYS_SHORT, HOURS, calendarDate, shortDate, whole } from '../../../shell/format.js?v=4796f631fd';
import { icon } from '../../../shell/icons.js?v=5a859aeff6';
import { card, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import { closeOutHours, weekRank } from '../model.js?v=a532a8c377';

export default {
  id: 'overview',
  title: 'Overview',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    container.append(
      archiveNote(data),
      h('div', { class: 'kpi-row cl-kpis' },
        kpiCard({ label: 'Total Calls', value: whole(data.calls), sub: 'call-light presses logged' }, ctx),
        kpiCard({ label: 'Days Logged', value: String(data.daysLogged), sub: 'days with scanned sheets' }, ctx),
        kpiCard({ label: 'Marked Complete', value: `${data.completePct}%`, sub: 'close-out box ticked' }, ctx),
        kpiCard({ label: 'Busiest Hour', value: HOURS[data.busiestHour], sub: 'all days combined' }, ctx),
        kpiCard({ label: 'Peak Day', value: shortDate(data.peakDay.date), sub: `${data.peakDay.calls} calls` }, ctx),
        kpiCard({ label: 'Top Need', value: data.topNeed, compact: true, sub: 'most frequent request' }, ctx),
      ),
      h('div', { class: 'cl-findings' }, findings(data)),
      card({ title: 'Suggested plays', icon: 'activity', className: 'cl-plays-card' },
        h('p', { class: 'cl-caption' },
          'Generated from the Needs by Hour grid, not written by hand: each names a need, the hour it spikes, and how far above ',
          'expected it runs. A spike needs at least 10 calls at 1.5 times expected; one play per need. Directional, not a staffing order.'),
        data.plays.length === 0
          ? h('p', { class: 'cl-caption' }, 'No need concentrates enough at a single hour to schedule against.')
          : h('ol', { class: 'cl-plays' }, data.plays.map((play) => h('li', {},
            h('span', { class: 'cl-play-badge' }, `${play.index.toFixed(1)}×`),
            h('div', {},
              h('p', { class: 'cl-play-text' }, play.text),
              h('p', { class: 'cl-play-why' }, `${play.need} runs ${play.index.toFixed(2)}× expected at ${HOURS[play.hour]}, ${play.calls} calls.`)))))),
      card({ title: 'About this data', icon: 'help' },
        h('p', { class: 'card-text' },
          `Source: the ${data.unit} digitized call-log workbook. ${data.lowConfidence.pct}% of rows (${whole(data.lowConfidence.rows)} of `,
          `${whole(data.calls)}) carry a low-confidence legibility note and are counted at equal weight, so read thin cells with care. `,
          'Need categories come from keywords in the handwritten request: treat them as strong directional patterns, not audit-grade counts. ',
          'A quiet hour can be a quiet hour or an unwritten sheet; everything here measures what was documented. ',
          'The 5- and 10-minute check columns are left out on purpose: too few rows fill them in to measure care.')),
    );
  },

  exports(data) {
    return {
      columns: [
        { key: 'need', label: 'Need' },
        { key: 'hour', label: 'Peak Hour' },
        { key: 'index', label: 'Times Expected', decimals: 2 },
        { key: 'calls', label: 'Calls at That Hour', decimals: 0 },
        { key: 'play', label: 'Suggested Play' },
      ],
      rows: data.plays.map((play) => ({ need: play.need, hour: HOURS[play.hour], index: play.index, calls: play.calls, play: play.text })),
    };
  },
};

function archiveNote(data) {
  return h('aside', { class: 'cl-archive' },
    icon('clipboard', { size: 18, className: 'cl-archive-icon' }),
    h('div', {},
      h('p', { class: 'cl-archive-title' },
        `One-time analysis of digitized handwritten call logs: ${data.unit}, ${calendarDate(data.firstDay)} to ${calendarDate(data.lastDay)}. Not updated.`),
      h('p', {}, `Gaps in the scans: ${data.coverageNote}. Patient names were redacted at the source; none are stored here.`)));
}

function findings(data) {
  const preventable = data.buckets.filter((bucket) => bucket.preventable);
  const preventCalls = preventable.reduce((sum, bucket) => sum + bucket.calls, 0);
  const preventPct = Math.round((100 * preventCalls) / data.calls);
  const ranked = weekRank(data);
  const [busiest, quietest] = [ranked[0], ranked.at(-1)];
  const hottest = data.grid.hottest[0];
  const { worst, best } = closeOutHours(data);
  const items = [
    finding('cl-finding-orange', `${preventPct}%`, 'of calls were rounding-preventable',
      `${whole(preventCalls)} of ${whole(data.calls)} calls were ${preventable.map((bucket) => bucket.label.toLowerCase()).join(' or ')}: `
      + 'the calls a stocked room and a purposeful round are meant to pre-empt.'),
  ];
  if (busiest && quietest && hottest) {
    items.push(finding('cl-finding-blue', `${busiest.avg.toFixed(1)} vs ${quietest.avg.toFixed(1)}`,
      `calls a day, ${DAYS[busiest.day]} against ${DAYS[quietest.day]}`,
      `The week is not flat. The single hottest hour is ${DAYS[hottest.day]} at ${HOURS[hottest.hour]}, ${hottest.avg.toFixed(2)} calls per `
      + `${DAYS_SHORT[hottest.day]}. Staffing built for an average day will miss it.`));
  }
  if (worst && best) {
    items.push(finding('cl-finding-red', `${worst.completePct}%`,
      `marked complete at ${HOURS[worst.hour]}, against ${best.completePct}% at ${HOURS[best.hour]}`,
      `A ${best.completePct - worst.completePct}-point close-out gap. Either those calls end unresolved or that shift is not `
      + 'documenting closure. Worth asking the unit which one it is.'));
  }
  return items;
}

function finding(className, figure, headline, detail) {
  return h('article', { class: `cl-finding ${className}` },
    h('p', { class: 'cl-finding-figure' }, figure),
    h('p', { class: 'cl-finding-headline' }, headline),
    h('p', { class: 'cl-finding-detail' }, detail));
}
