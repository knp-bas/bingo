"use client";

// Tiny Web Audio synth — no sound files to host. Browsers only allow audio
// after a user gesture, so call unlockAudio() from a click handler first.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  ctx ??= new AudioContext();
  void ctx.resume();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Short click while the numbers spin; pitch rises as the spin slows. */
export function playTick(progress: number) {
  tone(500 + progress * 700, 0, 0.05, "square", 0.05);
}

/** Bright arpeggio when the number lands. */
export function playReveal() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.35, "triangle", 0.18));
}

/** Longer fanfare for a BINGO winner. */
export function playFanfare() {
  const notes = [523, 523, 523, 659, 784, 659, 784, 1047];
  const times = [0, 0.12, 0.24, 0.36, 0.6, 0.78, 0.9, 1.1];
  notes.forEach((f, i) => tone(f, times[i], i === notes.length - 1 ? 0.9 : 0.2, "sawtooth", 0.08));
  notes.forEach((f, i) => tone(f / 2, times[i], 0.2, "triangle", 0.12));
}
