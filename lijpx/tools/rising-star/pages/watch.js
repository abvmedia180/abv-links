// Watch List: the three largest declines per domain for the selected comparison.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed } from '../../../shell/format.js?v=4974441338';
import { card, emptyState, kpiCard } from '../../../shell/ui.js?v=08586281b3';
import { biggestDeclines, comparisonControl, selectedComparison } from '../model.js?v=0ac35671df';

export default {
  id: 'watch',
  title: 'Watch List',
  printOrientation: 'portrait',

  render(container, data, ctx) {
    const comparison = selectedComparison(data, ctx.state);
    if (!comparison) {
      container.append(emptyState('alert-triangle', 'No comparison data yet', 'Add more quarters to see the Watch List.'));
      return;
    }
    const declining = new Set();
    let worst = null;
    for (const domain of data.domains) {
      for (const ranking of comparison.rankings[domain.key] ?? []) {
        if (ranking.delta >= 0) continue;
        declining.add(ranking.unit);
        if (!worst || ranking.delta < worst.ranking.delta) worst = { ranking, domain };
      }
    }
    container.append(
      h('div', { class: 'page-controls' }, comparisonControl(data, ctx, comparison)),
      h('div', { class: 'kpi-row' },
        kpiCard({ label: 'Needs Attention', value: worst?.ranking.unit ?? '--', tone: 'red', compact: true, sub: 'largest decline' }, ctx),
        kpiCard({ label: 'Declining Units', count: declining.size, tone: 'red', sub: 'across all domains' }, ctx),
        kpiCard({
          label: 'Biggest Drop',
          count: worst ? Math.abs(worst.ranking.delta) : 0,
          decimals: 1,
          tone: 'red',
          sub: worst ? `${worst.ranking.unit} - ${worst.domain.label}` : 'no declines',
        }, ctx),
        kpiCard({ label: 'Comparison Period', value: `${comparison.prev} vs ${comparison.curr}`, compact: true, sub: 'quarter over quarter' }, ctx),
      ),
      card({ title: 'Watch List', icon: 'alert-triangle', className: 'watch-explainer' },
        h('p', { class: 'card-text' },
          'Units that ', h('strong', {}, 'declined'),
          ' the most in each HCAHPS domain compared to the previous quarter. These units need attention and support. ',
          `Only units with at least ${data.minN} surveys (n ≥ ${data.minN}) in both quarters are included.`)),
      ...data.domains.map((domain) => declineSection(domain.label, comparison.rankings[domain.key] ?? [])),
    );
  },

  exports(data, ctx) {
    const comparison = selectedComparison(data, ctx.state);
    if (!comparison) return null;
    return {
      columns: [
        { key: 'domain', label: 'Domain' },
        { key: 'rank', label: 'Rank', decimals: 0 },
        { key: 'unit', label: 'Unit' },
        { key: 'prev', label: comparison.prev, decimals: 1 },
        { key: 'curr', label: comparison.curr, decimals: 1 },
        { key: 'change', label: 'Change', decimals: 1 },
        { key: 'n', label: `n (${comparison.curr})`, decimals: 0 },
      ],
      rows: data.domains.flatMap((domain) => biggestDeclines(comparison.rankings[domain.key] ?? []).map((r, i) => ({
        domain: domain.label, rank: i + 1, unit: r.unit, prev: r.prevScore, curr: r.currScore, change: r.delta, n: r.currN,
      }))),
    };
  },
};

function declineSection(label, rankings) {
  const declines = biggestDeclines(rankings);
  return h('section', { class: 'podium-section' },
    h('h3', { class: 'podium-domain-title' }, label),
    declines.length === 0
      ? h('p', { class: 'podium-empty tone-green' }, 'No declining units: all units improved or held steady')
      : h('div', { class: 'podium-row' }, declines.map((r, i) => h('div', { class: 'watch-card' },
        h('div', { class: 'watch-rank' }, String(i + 1)),
        h('div', { class: 'podium-info' },
          h('div', { class: 'podium-unit' }, r.unit),
          h('div', { class: 'podium-scores' }, `${fixed(r.prevScore)} → ${fixed(r.currScore)} (n=${r.currN})`)),
        h('div', { class: 'podium-change' },
          h('div', { class: 'podium-delta tone-red' }, fixed(r.delta)),
          h('div', { class: 'podium-delta-label' }, 'decline')),
      ))),
  );
}
