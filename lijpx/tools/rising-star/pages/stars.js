// Rising Stars: the three most improved units per domain for the selected quarter-over-quarter comparison.
// No KPI boxes on this page.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4796f631fd';
import { emptyState, sectionHeader } from '../../../shell/ui.js?v=08586281b3';
import { celebrateOnce } from '../celebrate.js?v=69342410b6';
import { PLACE_CLASSES, PLACES, comparisonControl, selectedComparison, topImprovers } from '../model.js?v=0ac35671df';

export default {
  id: 'stars',
  title: 'Rising Stars',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const comparison = selectedComparison(data, ctx.state);
    if (!comparison) {
      container.append(emptyState('star', 'No comparison data yet', 'Add more quarters to see Rising Star awards.'));
      return;
    }
    container.append(
      h('div', { class: 'page-controls' }, comparisonControl(data, ctx, comparison)),
      sectionHeader('Rising Star Awards', `${comparison.prev} vs ${comparison.curr}`),
      h('p', { class: 'sample-note' }, `Units must have a sample size of n ≥ ${data.minN} in both quarters to qualify.`),
      ...data.domains.map((domain) => podium(domain.label, comparison.rankings[domain.key] ?? [])),
    );
    celebrateOnce(ctx);
  },

  exports(data, ctx) {
    const comparison = selectedComparison(data, ctx.state);
    if (!comparison) return null;
    return {
      columns: [
        { key: 'domain', label: 'Domain' },
        { key: 'place', label: 'Place' },
        { key: 'unit', label: 'Unit' },
        { key: 'prev', label: comparison.prev, decimals: 1 },
        { key: 'curr', label: comparison.curr, decimals: 1 },
        { key: 'change', label: 'Improvement', decimals: 1 },
        { key: 'n', label: `n (${comparison.curr})`, decimals: 0 },
      ],
      rows: data.domains.flatMap((domain) => topImprovers(comparison.rankings[domain.key] ?? []).map((r, place) => ({
        domain: domain.label, place: PLACES[place], unit: r.unit, prev: r.prevScore, curr: r.currScore, change: r.delta, n: r.currN,
      }))),
    };
  },
};

function podium(label, rankings) {
  const winners = topImprovers(rankings);
  return h('section', { class: 'podium-section' },
    h('h3', { class: 'podium-domain-title' }, label),
    winners.length === 0
      ? h('p', { class: 'podium-empty' }, `No units with positive improvement (${rankings.length} qualified)`)
      : h('div', { class: 'podium-row' }, winners.map((r, place) => h('div', { class: `podium-card ${PLACE_CLASSES[place]}` },
        h('div', { class: 'podium-rank' }, PLACES[place]),
        h('div', { class: 'podium-info' },
          h('div', { class: 'podium-unit' }, r.unit),
          h('div', { class: 'podium-scores' }, `${fixed(r.prevScore)} → ${fixed(r.currScore)} (n=${r.currN})`)),
        h('div', { class: 'podium-change' },
          h('div', { class: 'podium-delta' }, signed(r.delta)),
          h('div', { class: 'podium-delta-label' }, 'improvement')),
      ))),
  );
}
