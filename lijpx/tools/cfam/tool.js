// CFAM Dashboard: patient experience for the CFAM units, how each unit is doing, and a benchmark.
// Data: prepared by build/prep/cfam.py.

import insights from './pages/insights.js?v=2d49b33931';
import overview from './pages/overview.js?v=b38882e587';
import performance from './pages/performance.js?v=9c71d6a26b';
import { KEY, latestQuarters, percent, scoreAt } from './model.js?v=6dd27ff358';

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
