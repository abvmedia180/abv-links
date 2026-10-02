// Visitor Analysis: visitor volume at the hospital's entry points from security logs. Frozen at April 2026.
// Data: prepared by build/prep/visitors.py.

import { monthLabel, whole } from '../../shell/format.js?v=4974441338';
import destinations from './pages/destinations.js?v=f047e055cb';
import hourly from './pages/hourly.js?v=743c896a2a';
import overnight from './pages/overnight.js?v=d1dde059d1';
import overview from './pages/overview.js?v=9b7ccade9d';
import trends from './pages/trends.js?v=eb0e15ae3a';

export default {
  id: 'visitors',
  title: 'Visitor Analysis',
  description: 'Visitor volume by entry point from security logs: busiest hours and days, monthly trends, overnight arrivals and where visitors go. Frozen at April 2026; not updated.',
  group: 'Past Analyses',
  icon: 'users',
  pages: [overview, hourly, trends, overnight, destinations],

  dataAsOf: (data) => data.asOf,

  summary(data) {
    const total = data.days.flatMap((day) => day.counts.filter(Boolean).flat()).reduce((sum, n) => sum + n, 0);
    const [first, last] = [data.days[0].date, data.days.at(-1).date];
    return `${whole(total)} visitors | ${monthLabel(first.slice(0, 7))} to ${monthLabel(last.slice(0, 7))} | not updated`;
  },
};
