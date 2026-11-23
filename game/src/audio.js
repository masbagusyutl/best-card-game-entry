// audio.js — tiny synthesised sound effects through WebAudio. No audio
// files, no network: every sound is an oscillator shaped in code. The
// mute toggle lives on the table; sounds stay off until the player first
// interacts, as browsers require.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  draw() { tone(660, 0.08, 'sine', 0.08, 0, 880); },
  play() { tone(392, 0.14, 'triangle', 0.16, 0, 523); tone(523, 0.12, 'triangle', 0.1, 0.05); },
  tide() { tone(220, 0.3, 'sine', 0.1, 0, 440); },
  hit() { tone(160, 0.18, 'square', 0.12, 0, 70); },
  heal() { tone(523, 0.16, 'sine', 0.1, 0, 784); },
  turn() { tone(330, 0.1, 'sine', 0.08); },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.12, i * 0.13));
  },
};
