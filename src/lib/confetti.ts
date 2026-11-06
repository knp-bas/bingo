"use client";

const COLORS = ["#ffcc33", "#ff4fa3", "#3ee8b5", "#4fc3ff", "#ffffff"];

async function lib() {
  return (await import("canvas-confetti")).default;
}

/** Quick burst from the centre — used when a number is revealed. */
export async function burst() {
  const confetti = await lib();
  confetti({ particleCount: 70, spread: 80, startVelocity: 38, origin: { y: 0.45 }, colors: COLORS });
}

/** Two cannons from the sides for ~2.5s — used for winners. */
export async function celebrate() {
  const confetti = await lib();
  const end = Date.now() + 2500;
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
