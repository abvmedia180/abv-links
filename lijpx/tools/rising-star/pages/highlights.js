// HCAHPS Hero: the most improved unit per division on Likelihood to Recommend, full year over full
// year. A unit qualifies with n >= minN in both years; a division where no qualifying unit improved
// names no winner.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { fixed, signed } from '../../../shell/format.js?v=4974441338';
import { icon } from '../../../shell/icons.js?v=5a859aeff6';
import { emptyState } from '../../../shell/ui.js?v=08586281b3';
import { rankedDivisions } from '../model.js?v=0ac35671df';

// The progress bar under each winner is full at a 40 point gain.
const FULL_BAR_GAIN = 40;

export default {
  id: 'highlights',
  title: 'LTR Year over Year',
  printOrientation: 'portrait',

  render(container, data) {
    const hl = data.highlights;
    const divisions = rankedDivisions(hl);
    if (divisions.length === 0) {
      container.append(emptyState('alert-triangle', 'No highlights data', 'No division has a unit with enough surveys.'));
      return;
    }
    container.append(
      h('header', { class: 'highlights-header' },
        h('h2', {}, 'HCAHPS Hero'),
        h('p', {}, `Likelihood to Recommend: Most Improved Unit per Division (${hl.prevLabel} vs ${hl.currLabel}, n ≥ ${hl.minN} in both years)`)),
      h('div', { class: 'highlights-grid' }, divisions.map((division) => divisionCard(division, hl))),
      h('p', { class: 'highlights-footer' }, `${hl.metric} · Full Year Top Box Scores · Minimum n = ${hl.minN} in each year`),
    );
  },

  exports(data) {
    const hl = data.highlights;
    return {
      columns: [
        { key: 'division', label: 'Division' },
        { key: 'rank', label: 'Rank', decimals: 0 },
        { key: 'unit', label: 'Unit' },
        { key: 'prevScore', label: `${hl.prevLabel} Score`, decimals: 1 },
        { key: 'prevN', label: `${hl.prevLabel} n`, decimals: 0 },
        { key: 'currScore', label: `${hl.currLabel} Score`, decimals: 1 },
        { key: 'currN', label: `${hl.currLabel} n`, decimals: 0 },
        { key: 'change', label: 'Change', decimals: 1 },
      ],
      rows: rankedDivisions(hl).flatMap((division) => division.ranked.map((unit, i) => ({
        division: division.name,
        rank: i + 1,
        unit: unit.label,
        prevScore: unit.prevScore,
        prevN: unit.prevN,
        currScore: unit.currScore,
        currN: unit.currN,
        change: unit.delta,
      }))),
    };
  },
};

function divisionCard(division, hl) {
  const count = division.ranked.length;
  const [best] = division.ranked;
  const winner = best.delta > 0 ? best : null;
  const rest = winner ? division.ranked.slice(1) : division.ranked;
  return h('article', { class: `highlight-card accent-${division.accent}` },
    h('div', { class: 'highlight-card-header' },
      h('div', { class: 'highlight-div-icon' }, icon(division.icon)),
      h('div', {},
        h('h3', { class: 'highlight-div-name' }, division.name),
        h('div', { class: 'highlight-div-count' }, `${count} unit${count === 1 ? '' : 's'}`))),
    winner ? winnerBlock(winner, hl) : h('div', { class: 'highlight-winner' },
      h('div', { class: 'highlight-winner-info' },
        h('div', { class: 'highlight-unit-name' }, 'No unit improved'),
        h('div', { class: 'highlight-n-row' }, `No qualifying unit scored higher in ${hl.currLabel} than in ${hl.prevLabel}.`))),
    rest.length > 0 && h('div', { class: 'highlight-roster' }, rest.map((unit, i) => h('div', { class: 'highlight-roster-row' },
      h('span', { class: 'highlight-roster-rank' }, String(i + (winner ? 2 : 1))),
      h('span', { class: 'highlight-roster-unit' }, unit.label),
      h('span', { class: 'highlight-roster-scores' }, `${fixed(unit.prevScore)} → ${fixed(unit.currScore)}`),
      h('span', { class: `highlight-roster-delta ${unit.delta > 0 ? 'tone-green' : unit.delta < 0 ? 'tone-red' : ''}` }, signed(unit.delta)),
      h('span', { class: 'highlight-roster-n' }, `n=${unit.currN}`),
    ))),
  );
}

function winnerBlock(winner, hl) {
  const barWidth = Math.min(Math.max((winner.delta / FULL_BAR_GAIN) * 100, 5), 100);
  return [
    h('div', { class: 'highlight-winner' },
      h('div', { class: 'highlight-trophy' }, icon('award', { size: 24 })),
      h('div', { class: 'highlight-winner-info' },
        h('div', { class: 'highlight-unit-name' }, winner.label),
        h('div', { class: 'highlight-score-row' },
          `${fixed(winner.prevScore)}%`, h('span', { class: 'arrow' }, '→'), `${fixed(winner.currScore)}%`),
        h('div', { class: 'highlight-n-row' }, `n: ${winner.prevN} (${hl.prevLabel}) → ${winner.currN} (${hl.currLabel})`)),
      h('div', { class: 'highlight-delta' },
        h('div', { class: 'highlight-delta-value' }, signed(winner.delta)),
        h('div', { class: 'highlight-delta-label' }, 'pts gain'))),
    h('div', { class: 'highlight-bar' }, h('div', { class: 'highlight-bar-fill', style: { width: `${barWidth}%` } })),
  ];
}
