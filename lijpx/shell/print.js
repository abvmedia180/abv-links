// Printing acts on the page that is open. The print header and orientation are set on every route
// change, so the browser's own Print command works as well as the Print button. Charts are
// re-rendered at paper width while printing and restored afterwards.
//
// beforeprint fires before the browser lays the page out for paper, for the Print button,
// Ctrl+P / Cmd+P and a headless PDF export alike, so the charts are resized in time.

import { fitChartsForPrint, restoreChartsAfterPrint } from './charts.js?v=72034d3cd0';
import { timestampET } from './format.js?v=4974441338';

// US Letter minus the 0.5in margins set in styles/print.css, at 96 CSS pixels per inch.
const PRINTABLE_WIDTH = { portrait: 720, landscape: 960 };

let context = null;
let printing = false;
let screenTitle = '';

export function initPrint() {
  window.addEventListener('beforeprint', enterPrint);
  window.addEventListener('afterprint', exitPrint);
}

// context: { toolTitle, pageTitle, asOf, orientation, header, pageEl } for the open page, or null on
// the home page. header is false for a page that prints as itself alone, such as a poster.
export function setPrintContext(next) {
  context = next;
  document.documentElement.dataset.printOrientation = next?.orientation ?? 'portrait';
  document.querySelector('.print-header').hidden = !next?.header;
  document.getElementById('print-tool').textContent = next ? `${next.toolTitle} · Long Island Jewish Medical Center` : '';
  document.getElementById('print-title').textContent = next?.pageTitle ?? '';
  document.getElementById('print-asof').textContent = next ? `Data as of ${next.asOf}` : '';
}

function enterPrint() {
  if (printing || !context) return;
  printing = true;
  document.getElementById('print-date').textContent = `Printed ${timestampET(new Date())}`;
  screenTitle = document.title;
  document.title = `${context.toolTitle} - ${context.pageTitle}`; // the default file name for Save as PDF
  fitChartsForPrint(PRINTABLE_WIDTH[context.orientation], context.pageEl);
}

function exitPrint() {
  if (!printing) return;
  printing = false;
  document.title = screenTitle;
  // afterprint arrives while the page is still laid out for paper; resize once the screen layout is back.
  requestAnimationFrame(restoreChartsAfterPrint);
}
