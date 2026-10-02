// Visitor Analysis: visitor volume at the hospital's entry points from security logs. Frozen at April 2026.
// Data: prepared by build/prep/visitors.py.

import { monthLabel, whole } from '../../shell/format.js?v=4796f631fd';
import destinations from './pages/destinations.js?v=fcb7f8aa90';
import hourly from './pages/hourly.js?v=982de6c26a';
import overnight from './pages/overnight.js?v=ea2b965e1d';
import overview from './pages/overview.js?v=108048ed2f';
import trends from './pages/trends.js?v=945f91d976';

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
