// Short synthesized sound cues for the game, as in v1: Web Audio tones, no audio files.
// Browsers allow sound only after a click or key press, so the game calls unlockSound() from the first one.

let audio = null;

export function unlockSound() {
  audio ??= new AudioContext();
  if (audio.state === 'suspended') audio.resume();
}

// One note: frequency in Hz, start and length in seconds from now, peak volume 0 to 1.
function note(frequency, start, length, volume, { type = 'sine', attack = 0 } = {}) {
  const at = audio.currentTime + start;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  if (attack > 0) {
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.linearRampToValueAtTime(volume, at + attack);
  } else {
    gain.gain.setValueAtTime(volume, at);
  }
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(at);
  oscillator.stop(at + length);
}

function run(frequencies, step, length, volume) {
  frequencies.forEach((frequency, i) => note(frequency, i * step, length, volume));
}

const CUES = {
  begin: () => [261.63, 329.63, 392, 523.25].forEach((f, i) => note(f, i * 0.08, 2.8, 0.06, { attack: 0.9 })),
  select: () => note(800, 0, 0.1, 0.08),
  reveal: () => run([523, 659, 784], 0.1, 0.18, 0.1),
  dailyDouble: () => run([392, 494, 587, 659, 784, 988, 784, 988, 1175], 0.08, 0.18, 0.12),
  heartbeat: () => {
    note(60, 0, 0.15, 0.35);
    note(55, 0.12, 0.12, 0.25);
  },
  timesUp: () => [0, 0.18, 0.36].forEach((start) => note(180, start, 0.25, 0.18, { type: 'sawtooth' })),
  celebrate: () => run([523, 659, 784, 1047], 0.06, 0.25, 0.12),
  fanfare: () => {
    run([262, 330, 392, 523, 659, 784, 1047], 0.18, 0.5, 0.12);
    [523, 659, 784, 1047].forEach((f) => note(f, 1.6, 3, 0.08));
  },
};

export function playSound(name, enabled) {
  if (!enabled || !audio) return;
  CUES[name]();
}
