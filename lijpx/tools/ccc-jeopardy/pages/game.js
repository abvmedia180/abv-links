// Game Board: the live game, built for a projector. Pick a clue, run the timer, reveal the answer;
// Daily Doubles, Final Jeopardy and a closing summary as in v1. Progress lives in ctx.state, so it
// survives a visit to the Answer Key until the tab closes. Printing gives the host's sheet instead:
// every clue and answer in board layout.

import { create as createConfetti } from '../../../vendor/canvas-confetti-1.9.3/confetti.module.js?v=b2ab129d4c';
import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { icon } from '../../../shell/icons.js?v=5a859aeff6';
import { selectControl } from '../../../shell/ui.js?v=08586281b3';
import { FINAL_JEOPARDY, answerTable, clueCount, money } from '../model.js?v=abd41379fc';
import { playSound, unlockSound } from '../sound.js?v=e6c985be4f';

// Defaults and Daily Double placement as in v1: a 20 second timer, one Daily Double, hidden in the
// third row or below.
const TIMER_CHOICES = [10, 15, 20, 30, 45, 60, 90, 120];
const DEFAULT_TIMER_SECONDS = 20;
const DAILY_DOUBLE_CHOICES = [0, 1, 2, 3];
const DEFAULT_DAILY_DOUBLES = 1;
const DAILY_DOUBLE_FIRST_ROW = 2;
const URGENT_SECONDS = 10;
const CRITICAL_SECONDS = 7;
const HEARTBEAT_SECONDS = 3;
const FLIP_MS = 400;
const SHAKE_MS = 600;
const CONFETTI_COLORS = ['#f2a900', '#ffd700', '#003da5', '#0077c8', '#00b2a9', '#ffffff'];

export default {
  id: 'game',
  title: 'Game Board',
  printOrientation: 'landscape',

  render(container, data, ctx) {
    const { state } = ctx;
    state.timerSeconds ??= DEFAULT_TIMER_SECONDS;
    state.dailyDoubleCount ??= DEFAULT_DAILY_DOUBLES;
    state.sound ??= true;
    state.game ??= newGame(data, state.dailyDoubleCount);
    container.append(
      h('div', { class: 'page-controls' },
        selectControl({
          id: 'ccc-timer',
          label: 'Timer',
          value: String(state.timerSeconds),
          options: TIMER_CHOICES.map((seconds) => ({ value: String(seconds), label: `${seconds} seconds` })),
          onChange: (value) => { state.timerSeconds = Number(value); },
        }),
        selectControl({
          id: 'ccc-daily-doubles',
          label: 'Daily Doubles',
          value: String(state.dailyDoubleCount),
          options: DAILY_DOUBLE_CHOICES.map((count) => ({ value: String(count), label: count === 0 ? 'None' : String(count) })),
          onChange: (value) => {
            state.dailyDoubleCount = Number(value);
            state.game.dailyDoubles = pickDailyDoubles(data, state.game.played, state.dailyDoubleCount);
          },
        }),
        h('button', {
          id: 'ccc-new-game',
          type: 'button',
          class: 'control-btn',
          onclick: () => {
            if (!window.confirm('Start a new game? Every clue and Final Jeopardy go back on the board.')) return;
            state.game = { ...newGame(data, state.dailyDoubleCount), begun: true };
            ctx.rerender();
          },
        }, icon('restart', { size: 14 }), 'New Game')),
      mountGame(data, ctx),
      keyboardHelp(),
      hostSheet(data),
    );
  },

  exports(data) {
    return answerTable(data);
  },
};

function newGame(data, dailyDoubleCount) {
  return {
    begun: false,
    played: [],
    dailyDoubles: pickDailyDoubles(data, [], dailyDoubleCount),
    dailyDoublesFound: 0,
    finalPlayed: false,
    finished: false,
    startedAt: null,
  };
}

function pickDailyDoubles(data, played, count) {
  const open = [];
  data.categories.forEach((category, column) => {
    for (let row = DAILY_DOUBLE_FIRST_ROW; row < data.values.length; row += 1) {
      if (!played.includes(cellKey(column, row))) open.push(cellKey(column, row));
    }
  });
  for (let i = open.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }
  return open.slice(0, count);
}

function cellKey(column, row) {
  return `${column}-${row}`;
}

// The stage: header, board and the overlays (splash, clue, Daily Double, Time's Up, Final
// Jeopardy, summary) that open on top of it. Overlays live inside the stage so they stay visible
// when the stage is in full screen.
function mountGame(data, ctx) {
  const { state } = ctx;
  const game = state.game;
  const total = clueCount(data);
  const listeners = new AbortController();
  const overlays = []; // open overlays, topmost last: { el, primary, close, focus, toggleTimer }
  let opening = false;

  const progressFill = h('div', { class: 'progress-fill' });
  const progressLabel = h('p', { class: 'progress-label' });
  const soundButton = h('button', { type: 'button', class: 'stage-btn', 'aria-label': 'Sound', onclick: toggleSound });
  const fullscreenButton = h('button', { type: 'button', class: 'stage-btn', onclick: toggleFullscreen, hidden: !document.fullscreenEnabled });
  const board = h('div', {
    class: 'board',
    style: {
      gridTemplateColumns: `repeat(${data.categories.length}, minmax(0, 1fr))`,
      gridTemplateRows: `auto repeat(${data.values.length}, minmax(0, 1fr)) auto`,
    },
  });
  const main = h('div', { class: 'stage-main' },
    h('div', { class: 'stage-header' },
      progressLabel,
      h('div', { class: 'stage-title' }, h('h2', {}, 'JEOPARDY!'), h('p', {}, data.subtitle)),
      h('div', { class: 'stage-buttons' }, soundButton, fullscreenButton)),
    h('div', { class: 'board-frame' }, board));
  const confettiCanvas = h('canvas', { class: 'confetti', 'aria-hidden': 'true' });
  const stage = h('section', { class: 'jeopardy-stage', 'aria-label': 'Game board' },
    h('div', { class: 'progress' }, progressFill), main, confettiCanvas);

  document.addEventListener('keydown', onKey, { signal: listeners.signal });
  document.addEventListener('fullscreenchange', () => { if (mounted()) updateButtons(); }, { signal: listeners.signal });
  updateButtons();
  drawBoard(false);
  if (!game.begun) showSplash();
  return stage;

  // The page is replaced on every route change; listeners left behind remove themselves.
  function mounted() {
    if (stage.isConnected) return true;
    listeners.abort();
    return false;
  }

  function later(callback, ms) {
    setTimeout(() => { if (stage.isConnected) callback(); }, ms);
  }

  function drawBoard(cascade) {
    let order = 0;
    const delay = () => (cascade ? { animationDelay: `${(order++) * 30}ms` } : null);
    board.classList.toggle('cascade', cascade);
    board.replaceChildren(
      ...data.categories.map((category) => h('h3', { class: 'category', style: delay() }, category.name)),
      ...data.values.flatMap((value, row) => data.categories.map((category, column) => {
        const key = cellKey(column, row);
        const played = game.played.includes(key);
        const cell = h('button', {
          type: 'button',
          class: 'cell',
          style: delay(),
          dataset: { key },
          'aria-label': `${category.name}, ${money(value)}${played ? ', played' : ''}`,
          'aria-disabled': played && 'true',
          onclick: () => openCell(column, row, cell),
        }, played ? icon('check', { size: 22 }) : money(value));
        return cell;
      })),
      h('button', {
        type: 'button',
        class: 'final-cell',
        style: delay(),
        'aria-disabled': game.finalPlayed && 'true',
        onclick: showFinal,
      }, icon('star', { size: 16 }), FINAL_JEOPARDY, icon('star', { size: 16 })),
    );
    progressFill.style.width = `${(game.played.length / total) * 100}%`;
    progressLabel.textContent = `${game.played.length} / ${total}`;
  }

  function focusCell(key) {
    board.querySelector(`[data-key="${key}"]`)?.focus();
  }

  function openOverlay(el, actions) {
    if (overlays.length > 0) overlays.at(-1).el.inert = true;
    const entry = { el, ...actions };
    overlays.push(entry);
    main.inert = true;
    stage.append(el);
    entry.focus();
    return entry;
  }

  function closeOverlay(entry) {
    overlays.splice(overlays.indexOf(entry), 1);
    entry.el.remove();
    const top = overlays.at(-1);
    if (top) {
      top.el.inert = false;
      top.focus();
    } else {
      main.inert = false;
    }
  }

  function onKey(event) {
    if (!mounted() || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, select, textarea')) return;
    const top = overlays.at(-1);
    switch (event.key) {
      case ' ':
      case 'Enter': {
        // A focused button in the overlay keeps its own Space and Enter; anywhere else on the board
        // they reveal the answer or move the game on.
        const onBoard = stage.contains(event.target) || event.target === document.body;
        if (top && onBoard && !(top.el.contains(event.target) && event.target.closest('button'))) {
          event.preventDefault();
          top.primary();
        }
        break;
      }
      case 'Escape':
      case 'q':
      case 'Q':
        if (top) {
          event.preventDefault();
          top.close();
        }
        break;
      case 't':
      case 'T':
        top?.toggleTimer?.();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case 'm':
      case 'M':
        toggleSound();
        break;
      default:
    }
  }

  function toggleSound() {
    state.sound = !state.sound;
    if (state.sound) unlockSound();
    updateButtons();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    // A refused request (a frame without permission) leaves the board where it is.
    else if (document.fullscreenEnabled) stage.requestFullscreen().catch(() => {});
  }

  function updateButtons() {
    soundButton.replaceChildren(icon(state.sound ? 'volume' : 'volume-off', { size: 16 }));
    soundButton.setAttribute('aria-pressed', String(state.sound));
    soundButton.title = `Sound ${state.sound ? 'on' : 'off'} (M)`;
    const full = document.fullscreenElement === stage;
    fullscreenButton.replaceChildren(icon(full ? 'minimize' : 'maximize', { size: 16 }));
    fullscreenButton.setAttribute('aria-label', full ? 'Exit full screen' : 'Full screen');
    fullscreenButton.title = `${full ? 'Exit full screen' : 'Full screen'} (F)`;
  }

  function celebrate(burst) {
    if (ctx.reducedMotion) return;
    // A new cannon per celebration, so the canvas is measured again after a switch to full screen.
    // No worker: the library would build it from a blob: URL, which the Content-Security-Policy blocks.
    const fire = createConfetti(confettiCanvas, { resize: true, useWorker: false });
    fire({ particleCount: burst, spread: 100, origin: { y: 0.35 }, colors: CONFETTI_COLORS, gravity: 0.8 });
    later(() => {
      fire({ particleCount: burst / 2, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors: CONFETTI_COLORS });
      fire({ particleCount: burst / 2, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors: CONFETTI_COLORS });
    }, 300);
  }

  function showSplash() {
    const begin = () => {
      game.begun = true;
      unlockSound();
      playSound('begin', state.sound);
      closeOverlay(entry);
      drawBoard(!ctx.reducedMotion);
      board.querySelector('.cell')?.focus();
    };
    const el = h('button', { type: 'button', class: 'overlay splash', 'aria-label': 'Begin the game', onclick: begin },
      h('span', { class: 'splash-title' },
        [...'JEOPARDY!'].map((letter, i) => h('span', { class: 'splash-letter', style: { animationDelay: `${150 + i * 100}ms` } }, letter))),
      h('span', { class: 'splash-subtitle' }, data.subtitle),
      h('span', { class: 'splash-start' }, 'Click anywhere to begin'));
    const entry = openOverlay(el, { primary: begin, close: begin, focus: () => el.focus() });
  }

  function openCell(column, row, cell) {
    const key = cellKey(column, row);
    if (opening || game.played.includes(key)) return;
    opening = true;
    unlockSound();
    playSound('select', state.sound);
    cell.classList.add('flipping');
    later(() => {
      opening = false;
      if (game.dailyDoubles.includes(key)) showDailyDouble(column, row);
      else showClue(column, row);
    }, ctx.reducedMotion ? 0 : FLIP_MS);
  }

  function showDailyDouble(column, row) {
    game.dailyDoublesFound += 1;
    playSound('dailyDouble', state.sound);
    if (!ctx.reducedMotion) {
      stage.classList.add('shake');
      later(() => stage.classList.remove('shake'), SHAKE_MS);
    }
    const proceed = () => {
      closeOverlay(entry);
      showClue(column, row);
    };
    const el = h('button', { type: 'button', class: 'overlay daily-double', onclick: proceed },
      [0, 1, 2].map((i) => h('span', { class: 'burst', style: { animationDelay: `${i * 200}ms` } })),
      h('span', { class: 'dd-stars' },
        [0, 1, 2, 3, 4].map((i) => h('span', { class: 'dd-star', style: { animationDelay: `${100 + i * 100}ms` } }, icon('star', { size: 28 })))),
      h('span', { class: 'dd-text' }, 'DAILY DOUBLE!'),
      h('span', { class: 'overlay-hint' }, 'Click to continue'));
    const entry = openOverlay(el, { primary: proceed, close: proceed, focus: () => el.focus() });
  }

  function showClue(column, row) {
    const key = cellKey(column, row);
    const category = data.categories[column];
    const { clue, answer } = category.clues[row];
    game.played.push(key);
    game.startedAt ??= Date.now();
    drawBoard(false);

    const answerBlock = h('div', { class: 'answer', hidden: true },
      h('p', { class: 'answer-label' }, 'Answer'),
      h('p', { class: 'answer-text' }, answer));
    const revealButton = h('button', { type: 'button', class: 'reveal-btn', onclick: () => reveal() }, 'Reveal Answer');
    const closeButton = closeControl(() => close());
    const overlay = h('div', { class: 'overlay' });
    const timer = clueTimer(overlay, showTimesUp);
    overlay.append(h('div', { class: 'clue-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': `${category.name}, ${money(data.values[row])}` },
      closeButton,
      h('p', { class: 'clue-badge' }, category.name),
      h('p', { class: 'clue-value' }, money(data.values[row])),
      h('p', { class: 'clue-text' }, clue),
      revealButton,
      answerBlock,
      timer.el));
    const entry = openOverlay(overlay, {
      primary: () => (answerBlock.hidden ? reveal() : close()),
      close: () => close(),
      focus: () => (answerBlock.hidden ? revealButton : closeButton).focus(),
      toggleTimer: () => { if (answerBlock.hidden) timer.toggle(); },
    });

    function reveal() {
      playSound('reveal', state.sound);
      timer.stop();
      timer.el.hidden = true;
      revealButton.hidden = true;
      answerBlock.hidden = false;
      closeButton.focus();
    }

    function close() {
      timer.stop();
      closeOverlay(entry);
      if (!game.finished && game.played.length === total) showSummary();
      else focusCell(key);
    }
  }

  // The countdown inside a clue: amber then red as time runs low, a heartbeat for the last
  // seconds, and the Time's Up screen at zero.
  function clueTimer(overlay, onTimesUp) {
    const seconds = state.timerSeconds;
    let remaining = seconds;
    let interval = 0;
    const display = h('span', { class: 'timer-display' }, String(seconds));
    const fill = h('div', { class: 'timer-fill' });
    const toggleButton = h('button', { type: 'button', class: 'timer-toggle', onclick: () => toggle() }, 'Start Timer');
    const el = h('div', { class: 'timer' },
      h('div', { class: 'timer-controls' }, toggleButton, display),
      h('div', { class: 'timer-track' }, fill));

    function toggle() {
      if (interval) stop();
      else if (remaining > 0) {
        interval = setInterval(tick, 1000);
        toggleButton.textContent = 'Pause';
        toggleButton.classList.add('running');
        paint();
      }
    }

    function stop() {
      clearInterval(interval);
      interval = 0;
      toggleButton.classList.remove('running');
      if (remaining > 0) toggleButton.textContent = 'Start Timer';
      paint();
    }

    function tick() {
      if (!overlay.isConnected) {
        stop();
        return;
      }
      remaining -= 1;
      if (remaining === 0) {
        stop();
        toggleButton.textContent = "Time's Up!";
        toggleButton.disabled = true;
        playSound('timesUp', state.sound);
        onTimesUp();
        return;
      }
      if (remaining <= HEARTBEAT_SECONDS) playSound('heartbeat', state.sound);
      paint();
    }

    function paint() {
      display.textContent = String(remaining);
      fill.style.width = `${(remaining / seconds) * 100}%`;
      el.classList.toggle('urgent', remaining <= URGENT_SECONDS);
      el.classList.toggle('critical', remaining <= CRITICAL_SECONDS);
      overlay.classList.toggle('critical', Boolean(interval) && remaining <= CRITICAL_SECONDS);
    }

    return { el, toggle, stop };
  }

  function showTimesUp() {
    const dismiss = () => closeOverlay(entry);
    const el = h('button', { type: 'button', class: 'overlay times-up', onclick: dismiss },
      h('span', { class: 'times-up-text' }, "TIME'S UP!"),
      h('span', { class: 'overlay-hint' }, 'Click to continue'));
    const entry = openOverlay(el, { primary: dismiss, close: dismiss, focus: () => el.focus() });
  }

  function showFinal() {
    if (game.finalPlayed) return;
    game.finalPlayed = true;
    unlockSound();
    playSound('select', state.sound);
    drawBoard(false);
    const answerBlock = h('div', { class: 'answer', hidden: true },
      h('p', { class: 'answer-label' }, 'Answer'),
      h('p', { class: 'answer-text' }, data.final.answer));
    const revealButton = h('button', { type: 'button', class: 'reveal-btn', onclick: () => reveal() }, 'Reveal Answer');
    const closeButton = closeControl(() => close());
    const overlay = h('div', { class: 'overlay' },
      h('div', { class: 'clue-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': FINAL_JEOPARDY },
        closeButton,
        h('p', { class: 'final-title' }, 'FINAL JEOPARDY!'),
        h('p', { class: 'clue-text' }, data.final.clue),
        revealButton,
        answerBlock));
    const entry = openOverlay(overlay, {
      primary: () => (answerBlock.hidden ? reveal() : close()),
      close: () => close(),
      focus: () => (answerBlock.hidden ? revealButton : closeButton).focus(),
    });

    function reveal() {
      playSound('reveal', state.sound);
      revealButton.hidden = true;
      answerBlock.hidden = false;
      closeButton.focus();
      later(() => {
        playSound('celebrate', state.sound);
        celebrate(160);
      }, 200);
    }

    function close() {
      closeOverlay(entry);
      board.querySelector('.final-cell').focus();
    }
  }

  function showSummary() {
    game.finished = true;
    const elapsed = Math.round((Date.now() - game.startedAt) / 1000);
    const dismiss = () => {
      closeOverlay(entry);
      board.querySelector('.final-cell').focus();
    };
    const stat = (value, label) => h('span', { class: 'summary-stat' },
      h('span', { class: 'summary-value' }, value),
      h('span', { class: 'summary-label' }, label));
    const el = h('button', { type: 'button', class: 'overlay summary', onclick: dismiss },
      icon('award', { size: 64, className: 'summary-icon' }),
      h('span', { class: 'summary-title' }, 'GAME COMPLETE!'),
      h('span', { class: 'summary-stats' },
        stat(String(game.played.length), 'Clues Answered'),
        stat(`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`, 'Total Time'),
        stat(String(game.dailyDoublesFound), 'Daily Doubles')),
      h('span', { class: 'overlay-hint' }, 'Click anywhere to close'));
    const entry = openOverlay(el, { primary: dismiss, close: dismiss, focus: () => el.focus() });
    playSound('fanfare', state.sound);
    celebrate(240);
  }
}

function closeControl(onClose) {
  return h('button', { type: 'button', class: 'close-btn', 'aria-label': 'Close', title: 'Close (Q)', onclick: onClose }, icon('close', { size: 18 }));
}

function keyboardHelp() {
  const key = (name) => h('kbd', {}, name);
  return h('p', { class: 'jeopardy-keys' },
    'Keyboard: ', key('Space'), ' or ', key('Enter'), ' reveals the answer and moves on, ', key('Q'), ' or ', key('Esc'), ' closes, ',
    key('T'), ' starts or pauses the timer, ', key('F'), ' full screen, ', key('M'), ' sound.');
}

// Print only: the host's sheet, every clue with its answer in board layout.
function hostSheet(data) {
  return h('div', { class: 'host-sheet' },
    h('p', { class: 'host-sheet-note' }, data.subtitle),
    h('table', { class: 'data-table' },
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col', class: 'value-col' }, 'Value'),
        data.categories.map((category) => h('th', { scope: 'col' }, category.name)))),
      h('tbody', {},
        data.values.map((value, row) => h('tr', {},
          h('th', { scope: 'row' }, money(value)),
          data.categories.map((category) => sheetCell(category.clues[row])))),
        h('tr', {},
          h('th', { scope: 'row' }, FINAL_JEOPARDY),
          sheetCell(data.final, data.categories.length)))));
}

function sheetCell({ clue, answer }, colspan) {
  return h('td', { colspan }, h('p', {}, clue), h('p', { class: 'host-answer' }, answer));
}
