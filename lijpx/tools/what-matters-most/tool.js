// What Matters Most: the patient-facing poster for the What Matters Most initiative.
// Data: prepared by build/prep/what_matters_most.py.

import poster from './pages/poster.js?v=c4cb96696e';

export default {
  id: 'what-matters-most',
  aliases: ['wmm'],
  title: 'What Matters Most',
  description: 'Campaign page for the What Matters Most initiative.',
  group: 'Resources',
  icon: 'heart',
  pages: [poster],

  dataAsOf: (data) => data.asOf,
};
