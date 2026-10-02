// The poster's four icons, drawn for v1 on a 48x48 grid in white on the teal bubbles.
// The payload names one per item; build/prep/what_matters_most.py checks the names.

const SVG_NS = 'http://www.w3.org/2000/svg';
const LINE = { stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

const ICONS = {
  speech: [
    ['path', { ...LINE, d: 'M7 9h34a3 3 0 013 3v19a3 3 0 01-3 3H26l-6 8v-8H7a3 3 0 01-3-3V12a3 3 0 013-3z' }],
    ['line', { ...LINE, 'stroke-width': 2, x1: 12, y1: 19, x2: 36, y2: 19 }],
    ['line', { ...LINE, 'stroke-width': 2, x1: 12, y1: 26, x2: 25, y2: 26 }],
  ],
  moon: [
    ['path', { ...LINE, fill: 'rgba(255,255,255,0.18)', d: 'M36 27C34 34 27 39 19 39A17 17 0 0119 5c-5 8-3 20 5 26 4 3 8 3 12-4z' }],
    ['circle', { fill: '#ffffff', opacity: 0.9, cx: 37, cy: 13, r: 2.5 }],
    ['circle', { fill: '#ffffff', opacity: 0.7, cx: 42, cy: 22, r: 1.8 }],
    ['circle', { fill: '#ffffff', opacity: 0.5, cx: 40, cy: 8, r: 1.3 }],
  ],
  home: [
    ['path', { ...LINE, d: 'M4 22L24 6l20 16' }],
    ['path', { ...LINE, d: 'M8 22v20h32V22' }],
    ['rect', { ...LINE, 'stroke-width': 2, x: 18, y: 30, width: 12, height: 12, rx: 1 }],
    ['polyline', { ...LINE, 'stroke-width': 2.2, points: '21,36 23.5,38.5 28,33' }],
  ],
  pill: [
    ['rect', { ...LINE, x: 5, y: 15, width: 38, height: 18, rx: 9 }],
    ['path', { fill: 'rgba(255,255,255,0.22)', d: 'M5 24a9 9 0 019-9h10v18H14A9 9 0 015 24z' }],
    ['line', { stroke: '#ffffff', 'stroke-width': 1.8, 'stroke-dasharray': '3 2', x1: 24, y1: 15, x2: 24, y2: 33 }],
    ['line', { ...LINE, 'stroke-width': 2, x1: 35, y1: 21, x2: 35, y2: 27 }],
    ['line', { ...LINE, 'stroke-width': 2, x1: 32, y1: 24, x2: 38, y2: 24 }],
  ],
};

export function posterIcon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': 'true', focusable: 'false' })) {
    svg.setAttribute(key, value);
  }
  for (const [tag, attributes] of ICONS[name]) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}
