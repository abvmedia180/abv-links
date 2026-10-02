// Line icons on a 24x24 grid. Tools pick an icon by name; add new shapes here, not in a tool (the
// What Matters Most poster's own artwork is the one exception, see docs/TOOL-CONTRACT.md).
//
// The cup, building and clipboard shapes were drawn for v1 of this site. Every other shape's path
// data is from Feather Icons (https://github.com/feathericons/feather), under this license:
//
// The MIT License (MIT)
//
// Copyright (c) 2013-2023 Cole Bemis
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  activity: [['polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }]],
  'alert-circle': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 12, y1: 8, x2: 12, y2: 12 }],
    ['line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }],
  ],
  'alert-triangle': [
    ['path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }],
    ['line', { x1: 12, y1: 9, x2: 12, y2: 13 }],
    ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }],
  ],
  award: [
    ['circle', { cx: 12, cy: 8, r: 7 }],
    ['polyline', { points: '8.21 13.89 7 23 12 20 17 23 15.79 13.88' }],
  ],
  back: [['polyline', { points: '15 18 9 12 15 6' }]],
  building: [
    ['path', { d: 'M3 21h18' }],
    ['path', { d: 'M5 21V7l7-4 7 4v14' }],
    ['path', { d: 'M9 21v-4h6v4' }],
    ['line', { x1: 12, y1: 9, x2: 12, y2: 13 }],
    ['line', { x1: 10, y1: 11, x2: 14, y2: 11 }],
  ],
  check: [['polyline', { points: '20 6 9 17 4 12' }]],
  clipboard: [
    ['rect', { x: 4, y: 3, width: 16, height: 18, rx: 2 }],
    ['path', { d: 'M9 7H15M9 11H15M9 15H13' }],
  ],
  close: [
    ['line', { x1: 18, y1: 6, x2: 6, y2: 18 }],
    ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }],
  ],
  cup: [
    ['path', { d: 'M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3' }],
    ['line', { x1: 4, y1: 21, x2: 20, y2: 21 }],
    ['line', { x1: 12, y1: 16, x2: 12, y2: 21 }],
  ],
  download: [
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
    ['polyline', { points: '7 10 12 15 17 10' }],
    ['line', { x1: 12, y1: 15, x2: 12, y2: 3 }],
  ],
  grid: [
    ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
    ['line', { x1: 3, y1: 9, x2: 21, y2: 9 }],
    ['line', { x1: 9, y1: 3, x2: 9, y2: 21 }],
  ],
  heart: [['path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }]],
  help: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }],
    ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }],
  ],
  home: [
    ['path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }],
    ['polyline', { points: '9 22 9 12 15 12 15 22' }],
  ],
  maximize: [['path', { d: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3' }]],
  minimize: [['path', { d: 'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3' }]],
  moon: [['path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }]],
  printer: [
    ['polyline', { points: '6 9 6 2 18 2 18 9' }],
    ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }],
    ['rect', { x: 6, y: 14, width: 12, height: 8 }],
  ],
  restart: [
    ['polyline', { points: '1 4 1 10 7 10' }],
    ['path', { d: 'M3.51 15a9 9 0 1 0 2.13-9.36L1 10' }],
  ],
  shield: [['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }]],
  square: [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }]],
  star: [['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]],
  users: [
    ['path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: 9, cy: 7, r: 4 }],
    ['path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }],
    ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }],
  ],
  volume: [
    ['polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }],
    ['path', { d: 'M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07' }],
  ],
  'volume-off': [
    ['polygon', { points: '11 5 6 9 2 9 2 15 6 15 11 19 11 5' }],
    ['line', { x1: 23, y1: 9, x2: 17, y2: 15 }],
    ['line', { x1: 17, y1: 9, x2: 23, y2: 15 }],
  ],
};

export function icon(name, { size = 18, className = '' } = {}) {
  const shapes = ICONS[name];
  if (!shapes) throw new Error(`Unknown icon "${name}"`);
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attributes = {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
  };
  for (const [key, value] of Object.entries(attributes)) svg.setAttribute(key, value);
  if (className) svg.setAttribute('class', className);
  for (const [tag, shapeAttributes] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(shapeAttributes)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}
