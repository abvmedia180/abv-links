// Hall of Fame: every medal a unit has earned across all comparison periods.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { signed } from '../../../shell/format.js?v=4796f631fd';
import { card, emptyState, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import { PLACE_TONES, PLACES, medalTable, topPerformers } from '../model.js?v=0ac35671df';

const MEDAL_NAMES = ['First', 'Second', 'Third'];

export default {
  id: 'fame',
  title: 'Hall of Fame',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const table = medalTable(data);
    if (table.length === 0) {
      container.append(emptyState('award', 'No awards yet', 'Awards appear after comparing two quarters.'));
      return;
    }
    const leaders = topPerformers(table);
    const tied = leaders.length > 1;
    container.append(
      h('div', { class: 'kpi-row' },
        kpiCard({
          label: tied ? 'Top Performers, tied' : 'Top Performer',
          value: leaders.map((entry) => entry.unit).join(', '),
          tone: 'green',
          compact: true,
          sub: `${leaders[0].medals[0]} First Place finishes${tied ? ' each' : ''}`,
        }, ctx),
        kpiCard({ label: 'Total Awards', count: table.reduce((sum, entry) => sum + entry.awards.length, 0), sub: 'across all periods' }, ctx),
        kpiCard({ label: 'Units Recognized', count: table.length, sub: 'units with awards' }, ctx),
        kpiCard({ label: 'Periods Tracked', count: data.comparisons.length, sub: 'quarter comparisons' }, ctx),
      ),
      card({ title: 'How It Works', icon: 'help' },
        h('p', { class: 'card-text' },
          'Each quarter, units are ranked by how much they ', h('strong', {}, 'improved'),
          ' in each HCAHPS domain compared to the previous quarter. The top 3 most improved units in each domain earn a medal: ',
          h('span', { class: 'medal tone-green' }, '1st Place'), ', ',
          h('span', { class: 'medal tone-gold' }, '2nd Place'), ', and ',
          h('span', { class: 'medal tone-bronze' }, '3rd Place'),
          `. Units must have at least ${data.minN} surveys (n ≥ ${data.minN}) in both quarters to qualify. `,
          'This page tracks all medals earned across every comparison period. The Top Performer has the most first places; ',
          'a tie goes to the most second places, then third places, and units still tied share the title.')),
      h('div', { class: 'hof-grid' }, table.map((entry) => unitCard(entry, leaders.includes(entry)))),
    );
  },

  exports(data) {
    const table = medalTable(data);
    return {
      columns: [
        { key: 'unit', label: 'Unit' },
        { key: 'comparison', label: 'Comparison' },
        { key: 'domain', label: 'Domain' },
        { key: 'place', label: 'Place' },
        { key: 'prev', label: 'Previous', decimals: 1 },
        { key: 'curr', label: 'Current', decimals: 1 },
        { key: 'change', label: 'Improvement', decimals: 1 },
      ],
      rows: table.flatMap((entry) => entry.awards.map(({ comparison, domain, place, ranking }) => ({
        unit: entry.unit,
        comparison: `${comparison.prev} vs ${comparison.curr}`,
        domain: domain.label,
        place: PLACES[place],
        prev: ranking.prevScore,
        curr: ranking.currScore,
        change: ranking.delta,
      }))),
    };
  },
};

function unitCard(entry, isTop) {
  const medals = entry.medals
    .map((count, place) => count > 0 && h('span', { class: `medal tone-${PLACE_TONES[place]}` }, `${count} ${MEDAL_NAMES[place]}`))
    .filter(Boolean);
  return h('article', { class: 'hof-card' },
    h('h3', { class: 'hof-unit' }, entry.unit, isTop && h('span', { class: 'hof-badge' }, 'TOP PERFORMER')),
    h('div', { class: 'hof-wins' }, medals.flatMap((medal, i) => (i === 0 ? [medal] : [' · ', medal]))),
    h('div', { class: 'hof-details' }, entry.awards.map(({ domain, place, ranking }) => h('div', { class: 'hof-award' },
      h('span', { class: `hof-place tone-${PLACE_TONES[place]}` }, PLACES[place]),
      ` ${domain.label} `,
      h('span', { class: 'hof-change' }, `(${signed(ranking.delta)})`),
    ))),
  );
}
