// Quiet at Night: Press Ganey quietness scores by unit and division, quarter by quarter.
// Data: prepared by build/prep/quiet.py.

import { fixed } from '../../shell/format.js?v=4796f631fd';
import divisions from './pages/divisions.js?v=700aeaa25c';
import heatmap from './pages/heatmap.js?v=6522c1f967';
import snapshot from './pages/snapshot.js?v=fbdffbd638';
import trends from './pages/trends.js?v=11cbcdb614';
import { latestQuarter, siteAverage } from './model.js?v=2a5c448782';

export default {
  id: 'quiet',
  title: 'Quiet at Night',
  description: 'Deep dive into quietness scores by unit. Rankings, a quarterly heat map, trends, and division performance.',
  group: 'Dashboards',
  icon: 'moon',
  pages: [snapshot, heatmap, trends, divisions],

  dataAsOf: (data) => data.asOf,

  summary(data) {
    const latest = latestQuarter(data);
    const site = siteAverage(data, latest.id);
    if (site == null) return `${latest.id} | No unit has enough responses yet`;
    const scored = data.units.filter((unit) => unit.scores[latest.id]).length;
    return `${latest.id} | Site average ${fixed(site)} | ${scored} units scored`;
  },
};
