// The hub shell: password gate, tool loading, navigation, page rendering, print and export.
// Tools plug in through the contract in docs/TOOL-CONTRACT.md and never touch anything here.

import { createChart, disposeCharts, loadECharts, resizeCharts } from './charts.js?v=72034d3cd0';
import { decryptText, fetchEnvelope, unlock } from './crypto.js?v=76839e4d3b';
import { h } from './dom.js?v=e03acf3e7a';
import { downloadCsv, downloadXlsx, exportFilename } from './exporter.js?v=61eabf369c';
import { calendarDate } from './format.js?v=4974441338';
import { icon } from './icons.js?v=5a859aeff6';
import { initPrint, setPrintContext } from './print.js?v=993aa62df6';
import { emptyState } from './ui.js?v=08586281b3';

const GROUPS = ['Dashboards', 'Past Analyses', 'Resources'];
const WRONG_PASSWORD_DELAY_MS = 1000;
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const IDLE_CHECK_MS = 30 * 1000;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const app = {
  manifest: null,
  checkEnvelope: null,
  key: null,
  tools: new Map(), // id -> { tool: the module's default export, entry: its manifest entry }
  data: new Map(), // id -> Promise of the decrypted payload
  state: new Map(), // id -> the tool's ctx.state, kept while the tab is open
  toolView: null, // header, tabs and page container of the open tool
  current: null, // { entry, page, data, ctx } of the page on screen
  routeToken: 0,
};

boot();

async function boot() {
  try {
    const response = await fetch(document.querySelector('meta[name="pxhub-manifest"]').content);
    if (!response.ok) throw new Error(`manifest.json returned HTTP ${response.status}`);
    app.manifest = await response.json();
    app.checkEnvelope = await fetchEnvelope(app.manifest.check);
  } catch (error) {
    showGateError(`The site could not load (${error.message}). Reload to try again.`);
    return;
  }
  const { version, lastUpdated } = app.manifest.site;
  document.getElementById('gate-version').textContent = `v${version} | Updated ${lastUpdated}`;
  document.getElementById('gate-form').addEventListener('submit', onUnlock);
  document.getElementById('gate-submit').disabled = false;
  document.getElementById('gate-password').focus();
}

async function onUnlock(event) {
  event.preventDefault();
  const input = document.getElementById('gate-password');
  const button = document.getElementById('gate-submit');
  if (!input.value) {
    showGateError('Please enter a password');
    return;
  }
  button.disabled = true;
  button.textContent = 'Unlocking...';
  showGateError('');
  let key;
  try {
    key = await unlock(input.value, app.checkEnvelope);
  } catch (error) {
    input.value = '';
    button.textContent = 'Unlock';
    showGateError(`The site could not unlock (${error.message}). Reload to try again.`);
    console.error(error);
    return;
  }
  if (!key) {
    // A short pause makes guessing at the form slow. It does not slow an offline attack on the
    // public files; the password's length does that.
    await new Promise((resolve) => { setTimeout(resolve, WRONG_PASSWORD_DELAY_MS); });
    input.value = '';
    button.disabled = false;
    button.textContent = 'Unlock';
    showGateError('Incorrect password');
    input.focus();
    return;
  }
  app.key = key;
  input.value = '';
  try {
    await startApp();
  } catch (error) {
    showGateError(`The hub could not start (${error.message}). Reload to try again.`);
    console.error(error);
  }
}

function showGateError(message) {
  document.getElementById('gate-error').textContent = message;
}

async function startApp() {
  const modules = await Promise.all(app.manifest.tools.map((entry) => import(absoluteUrl(entry.module))));
  app.manifest.tools.forEach((entry, i) => {
    const tool = modules[i].default;
    if (tool.id !== entry.id) throw new Error(`${entry.module} declares id "${tool.id}", expected "${entry.id}"`);
    if (!GROUPS.includes(tool.group)) throw new Error(`${tool.id} has unknown group "${tool.group}"`);
    app.tools.set(tool.id, { tool, entry });
  });
  await Promise.all(app.manifest.tools.filter((entry) => entry.css).map((entry) => loadStylesheet(entry.css)));
  // Start downloading ECharts while the home page shows; a failure surfaces when a tool page awaits it.
  loadECharts().catch(() => {});

  document.getElementById('gate').remove();
  document.getElementById('app').hidden = false;
  document.title = 'LIJ Patient Experience';
  document.getElementById('site-version').textContent = `v${app.manifest.site.version}`;
  buildNav();
  initDrawer();
  initPrint();
  initIdleReload();
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resizeCharts);
  });
  window.addEventListener('hashchange', showRoute);
  applyLegacyQuery();
  await showRoute();
}

function absoluteUrl(path) {
  return new URL(path, document.baseURI).href;
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = h('link', { rel: 'stylesheet', href });
    link.addEventListener('load', resolve);
    link.addEventListener('error', () => reject(new Error(`${href} did not load`)));
    document.head.append(link);
  });
}

// v1 links look like index.html?t=risingstar&tab=trends. Turn them into #/rising-star/trends.
function applyLegacyQuery() {
  const params = new URLSearchParams(window.location.search);
  const legacyId = params.get('t');
  if (!legacyId) return;
  const match = [...app.tools.values()].find(({ tool }) => tool.id === legacyId || tool.aliases?.includes(legacyId));
  const tab = params.get('tab');
  const hash = match ? `#/${match.tool.id}${tab ? `/${tab}` : ''}` : '#/';
  window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
}

function buildNav() {
  const items = [navLink('#/', 'home', 'PX Home', 'home')];
  for (const group of GROUPS) {
    const registered = toolsInGroup(group);
    if (registered.length === 0) continue;
    items.push(h('p', { class: 'sidebar-section-label' }, group));
    items.push(...registered.map(({ tool }) => navLink(`#/${tool.id}`, tool.icon, tool.title, tool.id)));
  }
  document.getElementById('nav-list').replaceChildren(...items);
}

function navLink(href, iconName, label, navId) {
  return h('a', { class: 'nav-item', href, dataset: { nav: navId } }, icon(iconName), label);
}

function toolsInGroup(group) {
  return [...app.tools.values()].filter(({ tool }) => tool.group === group);
}

function markCurrent(links, isCurrent) {
  for (const link of links) {
    if (isCurrent(link)) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// Below 768px the sidebar is a drawer opened by the menu button.
function initDrawer() {
  const button = document.getElementById('menu-button');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('scrim');
  const setOpen = (open) => {
    document.body.classList.toggle('drawer-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    scrim.hidden = !open;
    if (open) sidebar.querySelector('a').focus();
  };
  button.addEventListener('click', () => setOpen(!document.body.classList.contains('drawer-open')));
  scrim.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('drawer-open')) {
      setOpen(false);
      button.focus();
    }
  });
}

// The key lives only in this tab's memory. After 30 minutes of wall-clock time with no activity the
// page reloads, which drops it. A single long timer is not enough: browsers throttle timers in
// background tabs and can stop them while a laptop sleeps. So the time of the last activity is kept
// and checked every 30 seconds, whenever the tab is shown or focused again, and on the first
// activity after a pause, before that activity counts.
function initIdleReload() {
  let lastActivity = Date.now();
  let reloading = false;
  const expired = () => {
    if (!reloading && Date.now() - lastActivity < IDLE_LIMIT_MS) return false;
    if (!reloading) window.location.reload();
    reloading = true;
    return true;
  };
  const activity = () => {
    if (!expired()) lastActivity = Date.now();
  };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    document.addEventListener(type, activity, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', expired);
  window.addEventListener('focus', expired);
  window.addEventListener('pageshow', expired);
  setInterval(expired, IDLE_CHECK_MS);
}

function parseRoute() {
  const [toolId = '', pageId = ''] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { toolId, pageId };
}

async function showRoute() {
  const token = ++app.routeToken;
  const view = document.getElementById('view');
  delete view.dataset.ready;
  disposeCharts();
  const { toolId, pageId } = parseRoute();
  const entry = app.tools.get(toolId);
  if (!entry) {
    if (toolId) window.history.replaceState(null, '', '#/');
    scrollToTop();
    renderHome(view);
    return;
  }
  const page = entry.tool.pages.find((candidate) => candidate.id === pageId) ?? entry.tool.pages[0];
  if (page.id !== pageId) window.history.replaceState(null, '', `#/${entry.tool.id}/${page.id}`);
  markCurrent(document.querySelectorAll('.nav-item'), (link) => link.dataset.nav === entry.tool.id);

  const isNewTool = app.toolView?.toolId !== entry.tool.id;
  if (isNewTool) scrollToTop();
  const toolView = isNewTool ? buildToolView(view, entry) : app.toolView;
  markCurrent(toolView.tabs, (link) => link.dataset.page === page.id);
  toolView.pageEl.setAttribute('aria-busy', 'true');
  toolView.pageEl.replaceChildren(h('p', { class: 'loading' }, `Loading ${entry.tool.title}...`));
  setExportButtons(toolView, false);

  let data;
  try {
    [data] = await Promise.all([loadToolData(entry), loadECharts()]);
  } catch (error) {
    if (token === app.routeToken) {
      toolView.pageEl.removeAttribute('aria-busy');
      toolView.pageEl.replaceChildren(emptyState('alert-triangle', `Could not load ${entry.tool.title}`, `${error.message}. Reload the page to try again.`));
    }
    return;
  }
  if (token !== app.routeToken) return;
  renderPage(entry, page, data, toolView);
  toolView.tabs.find((link) => link.dataset.page === page.id).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (isNewTool) toolView.titleEl.focus({ preventScroll: true });
  view.dataset.ready = `${entry.tool.id}/${page.id}`;
}

// A new tool or the home page starts at the top. Below 768px the window scrolls; above, the main column.
function scrollToTop() {
  window.scrollTo(0, 0);
  document.getElementById('main').scrollTop = 0;
}

function buildToolView(view, { tool, entry }) {
  const titleEl = h('h1', { class: 'page-title', tabindex: '-1' }, tool.title);
  const asOfEl = h('span', { class: 'page-asof' });
  const pageEl = h('div', { class: 'page' });
  const tabs = tool.pages.map((page) => h('a', { class: 'tab-btn', href: `#/${tool.id}/${page.id}`, dataset: { page: page.id } }, page.title));
  const csvButton = h('button', { type: 'button', class: 'export-btn', onclick: () => exportCurrent(downloadCsv) },
    icon('download', { size: 14 }), 'CSV');
  const xlsxButton = h('button', { type: 'button', class: 'export-btn', onclick: () => exportCurrent(downloadXlsx) },
    icon('download', { size: 14 }), 'Excel');
  view.replaceChildren(h('div', { class: `tool-view tool-${tool.id}` },
    h('div', { class: 'tool-header' },
      h('a', { class: 'back-btn', href: '#/' }, icon('back', { size: 14 }), 'Back'),
      h('div', { class: 'page-heading' }, titleEl, h('span', { class: 'page-version' }, `v${entry.version}`), asOfEl),
      h('div', { class: 'export-bar' },
        h('button', { type: 'button', class: 'export-btn', onclick: () => window.print() }, icon('printer', { size: 14 }), 'Print / Save PDF'),
        csvButton,
        xlsxButton),
    ),
    h('nav', { class: 'tab-nav', 'aria-label': `${tool.title} pages` }, tabs),
    h('div', { class: 'tab-content' }, pageEl),
  ));
  app.toolView = { toolId: tool.id, titleEl, asOfEl, pageEl, tabs, csvButton, xlsxButton };
  return app.toolView;
}

function renderPage(entry, page, data, toolView) {
  disposeCharts();
  const { tool } = entry;
  const ctx = {
    state: toolState(tool.id),
    reducedMotion,
    chart: (el, option) => createChart(el, option, { reducedMotion }),
    rerender: rerenderCurrent,
  };
  const asOf = calendarDate(tool.dataAsOf(data));
  toolView.asOfEl.textContent = `Data as of ${asOf}`;
  toolView.pageEl.removeAttribute('aria-busy');
  toolView.pageEl.replaceChildren();
  try {
    page.render(toolView.pageEl, data, ctx);
  } catch (error) {
    toolView.pageEl.replaceChildren(emptyState('alert-triangle', `Could not show ${page.title}`, error.message));
    setExportButtons(toolView, false);
    console.error(error);
    return;
  }
  app.current = { entry, page, data, ctx };
  setExportButtons(toolView, Boolean(page.exports?.(data, ctx)));
  setPrintContext({
    toolTitle: tool.title,
    pageTitle: page.title,
    asOf,
    orientation: page.printOrientation ?? 'portrait',
    header: page.printHeader !== false,
    pageEl: toolView.pageEl,
  });
}

// Re-render the open page after a tool changed ctx.state, keeping keyboard focus on the same control.
function rerenderCurrent() {
  const { entry, page, data } = app.current;
  const focusedId = document.activeElement?.id;
  renderPage(entry, page, data, app.toolView);
  if (focusedId) document.getElementById(focusedId)?.focus();
}

function toolState(toolId) {
  if (!app.state.has(toolId)) app.state.set(toolId, {});
  return app.state.get(toolId);
}

function loadToolData({ tool, entry }) {
  if (!app.data.has(tool.id)) {
    const promise = fetchEnvelope(entry.data).then(async (envelope) => {
      if (envelope.salt !== app.checkEnvelope.salt) throw new Error('the data was encrypted under a different key; rebuild the site');
      return JSON.parse(await decryptText(app.key, envelope));
    });
    promise.catch(() => app.data.delete(tool.id)); // let the next visit try again
    app.data.set(tool.id, promise);
  }
  return app.data.get(tool.id);
}

function setExportButtons(toolView, available) {
  toolView.csvButton.hidden = !available;
  toolView.xlsxButton.hidden = !available;
}

// The table behind the CSV and Excel buttons for the page on screen, or null when it has none.
// Exported only for tests/e2e.py, which compares each downloaded file with it; nothing in the site
// imports app.js.
export function currentExport() {
  const current = app.current;
  const table = current?.page.exports?.(current.data, current.ctx);
  if (!table) return null;
  const { tool } = current.entry;
  return {
    table,
    sheetName: current.page.title,
    filename: exportFilename(tool.title, current.page.title, tool.dataAsOf(current.data)),
  };
}

function exportCurrent(download) {
  const exported = currentExport();
  if (exported) download(exported.table, exported.filename, exported.sheetName);
}

function renderHome(view) {
  app.toolView = null;
  app.current = null;
  markCurrent(document.querySelectorAll('.nav-item'), (link) => link.dataset.nav === 'home');
  setPrintContext(null);
  const sections = GROUPS.map((group) => [group, toolsInGroup(group)])
    .filter(([, registered]) => registered.length > 0)
    .map(([group, registered]) => [h('h2', { class: 'section-label' }, group), h('div', { class: 'tool-grid' }, registered.map(toolCard))]);
  view.replaceChildren(h('div', { class: 'px-home' },
    h('header', { class: 'px-home-header' }, h('h1', {}, 'Patient Experience Hub'), h('p', {}, 'Long Island Jewish Medical Center')),
    sections,
  ));
  view.dataset.ready = 'home';
}

function toolCard(registered) {
  const { tool, entry } = registered;
  let preview = null;
  if (tool.summary) {
    preview = h('div', { class: 'tool-preview' }, 'Loading preview...');
    loadToolData(registered)
      .then((data) => { preview.textContent = tool.summary(data); })
      .catch(() => { preview.textContent = 'Preview unavailable'; });
  }
  return h('a', { class: 'tool-card', href: `#/${tool.id}` },
    h('div', { class: 'tool-card-icon' }, icon(tool.icon, { size: 22 })),
    h('h3', {}, tool.title),
    h('p', {}, tool.description),
    preview,
    h('div', { class: 'tool-version' }, `v${entry.version} | Updated ${entry.lastUpdated}`),
  );
}
