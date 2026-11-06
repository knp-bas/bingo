"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { columnOf } from "@/lib/bingo";
import { playReveal, playTick } from "@/lib/sound";
import { burst } from "@/lib/confetti";

export const BALL_COLORS = ["#ff4fa3", "#ffcc33", "#3ee8b5", "#4fc3ff", "#b57bff", "#ff8a3d", "#7dff6b"];

const DIAMETER = {
  hero: "min(46vh, 36vw)",
  large: "200px",
  compact: "64px",
} as const;

interface Props {
  roundId: number | null;
  calls: number[];
  size: number;
  maxNumber: number;
  rollEndsAt: number | null;
  rollDurationMs: number;
  variant: keyof typeof DIAMETER;
  sound?: boolean;
  fx?: boolean;
}

/**
 * The drawn-number ball. While the server is "rolling" it flicks through random
 * remaining numbers, slowing down towards the end like a slot machine; when the
 * real number arrives it pops in (with optional sound + confetti).
 */
export function NumberRoller({ roundId, calls, size, maxNumber, rollEndsAt, rollDurationMs, variant, sound, fx }: Props) {
  const last = calls.length ? calls[calls.length - 1] : null;
  const [spinValue, setSpinValue] = useState<number | null>(null);
  const [revealKey, setRevealKey] = useState(0);
  const seen = useRef<{ roundId: number | null; count: number } | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const remaining = useMemo(() => {
    const used = new Set(calls);
    const out: number[] = [];
    for (let n = 1; n <= maxNumber; n++) if (!used.has(n)) out.push(n);
    return out;
  }, [calls, maxNumber]);
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;

  // Spin loop.
  useEffect(() => {
    if (!rollEndsAt) {
      setSpinValue(null);
      return;
    }
    const startAt = rollEndsAt - rollDurationMs;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const pool = remainingRef.current;
      const p = Math.min(1, Math.max(0, (Date.now() - startAt) / rollDurationMs));
      setSpinValue(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
      if (soundRef.current) playTick(p);
      // Ease-out: 40ms between flips at the start, ~400ms right before the reveal.
      timer = setTimeout(step, 40 + 360 * p * p * p);
    };
    step();
    return () => clearTimeout(timer);
  }, [rollEndsAt, rollDurationMs]);

  // Reveal detection: a new call arrived in the same round after first render.
  useEffect(() => {
    const prev = seen.current;
    seen.current = { roundId, count: calls.length };
    if (!prev || prev.roundId !== roundId || calls.length <= prev.count) return;
    setRevealKey((k) => k + 1);
    if (soundRef.current) playReveal();
    if (fx) void burst();
  }, [roundId, calls.length, fx]);

  const rolling = rollEndsAt !== null;
  const shown = rolling ? spinValue : last;
  const color = shown ? BALL_COLORS[columnOf(shown, size) % BALL_COLORS.length] : "#6b5a9e";
  const d = DIAMETER[variant];

  return (
    <div
      className="ball relative grid place-items-center shrink-0"
      style={{ width: d, height: d, ["--ball" as string]: color, ["--d" as string]: d }}
      aria-live="polite"
      aria-label={rolling ? "กำลังสุ่ม" : last ? `เลข ${last}` : "ยังไม่มีเลข"}
    >
      <div
        key={rolling ? "spin" : `r${revealKey}`}
        className={`ball-face grid place-items-center leading-none ${!rolling && revealKey ? "animate-pop" : ""}`}
        style={{ width: "calc(var(--d) * 0.64)", height: "calc(var(--d) * 0.64)" }}
      >
        <div className="flex flex-col items-center">
          {/* Number only — a "B/I/N/G/O" letter next to it is easy to misread (I vs 1). */}
          <span
            className="font-extrabold tabular-nums"
            style={{ fontSize: `calc(var(--d) * ${shown !== null && shown >= 100 ? 0.28 : 0.36})` }}
          >
            {shown ?? "?"}
          </span>
        </div>
      </div>
    </div>
  );
}
