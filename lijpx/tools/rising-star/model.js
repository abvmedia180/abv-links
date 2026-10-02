// Rising Star calculations shared by the pages. `data` is the payload from build/prep/rising_star.py.

import { selectControl } from '../../shell/ui.js?v=08586281b3';

export const PLACES = ['1st', '2nd', '3rd'];
export const PLACE_CLASSES = ['gold', 'silver', 'bronze'];
export const PLACE_TONES = ['green', 'gold', 'bronze'];

// The comparison picked on the Rising Stars or Watch List page, else the latest one.
export function selectedComparison(data, state) {
  return data.comparisons.find((c) => c.id === state.comparison) ?? data.comparisons.at(-1) ?? null;
}

export function comparisonControl(data, ctx, comparison) {
  return selectControl({
    id: 'rs-comparison',
    label: 'Comparison',
    value: comparison.id,
    options: data.comparisons.map((c) => ({ value: c.id, label: `${c.prev} vs ${c.curr}` })),
    onChange: (value) => {
      ctx.state.comparison = value;
      ctx.rerender();
    },
  });
}

// Rankings arrive sorted by change, largest first.
export function topImprovers(rankings) {
  return rankings.filter((r) => r.delta > 0).slice(0, 3);
}

export function biggestDeclines(rankings) {
  return rankings.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
}

// Every medal across every comparison, grouped by unit: most 1st places first, then 2nd, then 3rd,
// then by name (for display order only; see topPerformers).
export function medalTable(data) {
  const units = new Map();
  for (const comparison of data.comparisons) {
    for (const domain of data.domains) {
      topImprovers(comparison.rankings[domain.key] ?? []).forEach((ranking, place) => {
        if (!units.has(ranking.unit)) units.set(ranking.unit, { unit: ranking.unit, medals: [0, 0, 0], awards: [] });
        const entry = units.get(ranking.unit);
        entry.medals[place] += 1;
        entry.awards.push({ comparison, domain, place, ranking });
      });
    }
  }
  return [...units.values()].sort((a, b) => b.medals[0] - a.medals[0] || b.medals[1] - a.medals[1]
    || b.medals[2] - a.medals[2] || a.unit.localeCompare(b.unit));
}

// The Top Performer: most first places, then most second, then most third. Units still tied share
// the title; a name never breaks the tie.
export function topPerformers(table) {
  const [leader] = table;
  if (!leader) return [];
  return table.filter((entry) => entry.medals.every((count, place) => count === leader.medals[place]));
}

// Each division on the year-over-year page with its qualifying units, biggest gain first. A unit
// qualifies with n >= minN in both years.
export function rankedDivisions(highlights) {
  const qualifies = (unit) => unit.prevN >= highlights.minN && unit.currN >= highlights.minN;
  return highlights.divisions
    .map((division) => ({ ...division, ranked: division.units.filter(qualifies).sort((a, b) => b.delta - a.delta) }))
    .filter((division) => division.ranked.length > 0);
}

// Units with n >= minN for the domain in the latest quarter, with that quarter's score.
export function latestQualified(data, domainKey) {
  const latest = data.quarters.at(-1);
  return data.units
    .map((unit) => ({ unit, entry: latest.units[unit]?.scores[domainKey] }))
    .filter(({ entry }) => (entry?.n ?? 0) >= data.minN)
    .map(({ unit, entry }) => ({ unit, score: entry.score, n: entry.n }));
}

// Units with n >= minN for the domain in every quarter, with their scores and change since the first quarter.
export function trendRows(data, domainKey) {
  const scoreOf = (quarter, unit) => quarter.units[unit]?.scores[domainKey];
  return data.units
    .filter((unit) => data.quarters.every((quarter) => (scoreOf(quarter, unit)?.n ?? 0) >= data.minN))
    .map((unit) => {
      const scores = data.quarters.map((quarter) => scoreOf(quarter, unit).score);
      return { unit, scores, change: scores.at(-1) - scores[0] };
    })
    .sort((a, b) => b.change - a.change);
}
