// CFAM Dashboard: patient experience for the CFAM units, how each unit is doing, and a benchmark.
// Data: prepared by build/prep/cfam.py.

import insights from './pages/insights.js?v=bc0b2db765';
import overview from './pages/overview.js?v=6a32fc8348';
import performance from './pages/performance.js?v=b15e826afe';
import { KEY, latestQuarters, percent, scoreAt } from './model.js?v=eb6dd377a5';

export default {
  id: 'cfam',
  title: 'CFAM Dashboard',
  description: 'CFAM patient experience analytics. How each unit is doing and whether it is improving, cross-unit patterns, and a benchmark.',
  group: 'Dashboards',
  icon: 'activity',
  pages: [overview, performance, insights],

  dataAsOf: (data) => data.asOf,

  summary(data) {
    const { curr } = latestQuarters(data);
    if (!curr) return 'No complete quarter of data yet';
    return `${curr.label} | ${data.questions[KEY]} ${percent(scoreAt(data.overall, 'quarters', curr.id, KEY))} | ${data.units.length} active units`;
  },
};
