// Shared page components, so every tool looks the same. Styles live in styles/shell.css.

import { h } from './dom.js?v=e03acf3e7a';
import { icon } from './icons.js?v=5a859aeff6';

export function card({ title, icon: iconName, className = '' }, ...children) {
  return h('section', { class: `glass-card ${className}`.trim() },
    title && h('h2', { class: 'card-title' }, iconName && icon(iconName, { size: 16, className: 'card-icon' }), title),
    ...children,
  );
}

export function sectionHeader(title, period) {
  return h('div', { class: 'section-header' },
    h('h2', { class: 'section-title' }, title),
    period && h('span', { class: 'section-period' }, period),
  );
}

// value: shown as text. count: animate from 0 to this number (decimals places) unless motion is reduced.
export function kpiCard({ label, value, count, decimals = 0, sub, tone, compact = false }, ctx) {
  const valueEl = h('div', { class: `kpi-value${tone ? ` tone-${tone}` : ''}${compact ? ' kpi-compact' : ''}` }, value ?? '');
  if (count != null) countUp(valueEl, count, decimals, ctx.reducedMotion);
  return h('div', { class: 'kpi-card' },
    h('div', { class: 'kpi-label' }, label),
    valueEl,
    sub && h('div', { class: 'kpi-sub' }, sub),
  );
}

export function emptyState(iconName, heading, text) {
  return h('div', { class: 'no-data-msg' },
    icon(iconName, { size: 40, className: 'no-data-icon' }),
    h('h3', {}, heading),
    text && h('p', {}, text),
  );
}

// A labelled <select>. options: [{ value, label }].
export function selectControl({ id, label, options, value, onChange }) {
  const select = h('select', { id, class: 'filter-select', onchange: (event) => onChange(event.target.value) },
    options.map((option) => h('option', { value: option.value, selected: option.value === value }, option.label)),
  );
  return h('label', { class: 'filter-group', for: id }, h('span', { class: 'filter-label' }, label), select);
}

function countUp(el, target, decimals, reducedMotion) {
  if (reducedMotion) {
    el.textContent = target.toFixed(decimals);
    return;
  }
  const duration = 800;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = (target * (1 - (1 - progress) ** 3)).toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
  };
  el.textContent = (0).toFixed(decimals);
  requestAnimationFrame(step);
}
