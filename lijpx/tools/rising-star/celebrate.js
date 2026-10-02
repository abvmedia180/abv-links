// A short confetti burst the first time the Rising Stars page opens in a session.
// Skipped when the viewer asks for reduced motion.

import { create } from '../../vendor/canvas-confetti-1.9.3/confetti.module.js?v=b2ab129d4c';

const COLORS = ['#fbbf24', '#3b82f6', '#06b6d4', '#22c55e', '#a78bfa'];

let fire = null;

export function celebrateOnce(ctx) {
  if (ctx.state.celebrated || ctx.reducedMotion) return;
  ctx.state.celebrated = true;
  // No worker: the library would build it from a blob: URL, which the Content-Security-Policy blocks.
  fire ??= create(null, { resize: true, useWorker: false, disableForReducedMotion: true });
  fire({ particleCount: 80, spread: 70, origin: { y: 0.3 }, colors: COLORS, gravity: 0.8 });
  setTimeout(() => {
    fire({ particleCount: 40, spread: 100, origin: { x: 0.2, y: 0.4 }, colors: COLORS, gravity: 0.7 });
    fire({ particleCount: 40, spread: 100, origin: { x: 0.8, y: 0.4 }, colors: COLORS, gravity: 0.7 });
  }, 300);
}
