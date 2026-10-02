// Rising Star Award (HCAHPS Hero): HCAHPS Top Box improvement by unit, quarter over quarter.
// Data: prepared by build/prep/rising_star.py.

import fame from './pages/fame.js?v=6f9ceeb1da';
import highlights from './pages/highlights.js?v=e6f50a8ea3';
import raw from './pages/raw.js?v=2898a58cc0';
import stars from './pages/stars.js?v=1d30826d17';
import trends from './pages/trends.js?v=9b7f3da054';
import watch from './pages/watch.js?v=2b6ba7db8f';
import { topImprovers } from './model.js?v=0ac35671df';

export default {
  id: 'rising-star',
  aliases: ['risingstar'],
  title: 'Rising Star Award',
  description: "Track HCAHPS Top Box improvement by unit across quarters. See who's rising, who's leading, and celebrate the wins.",
  group: 'Dashboards',
  icon: 'star',
  pages: [stars, trends, fame, watch, raw, highlights],

  dataAsOf: (data) => data.asOf,

  summary(data) {
    const latest = data.comparisons.at(-1);
    if (!latest) return 'Add more quarter data to see comparisons';
    const winners = new Set(data.domains.flatMap((domain) => topImprovers(latest.rankings[domain.key] ?? []).slice(0, 1).map((r) => r.unit)));
    return `${latest.prev} vs ${latest.curr} | ${winners.size} winning units across ${data.domains.length} domains`;
  },
};
