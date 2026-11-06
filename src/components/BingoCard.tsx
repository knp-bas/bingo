"use client";

import { FREE, columnHeader } from "@/lib/bingo";
import { BALL_COLORS } from "./NumberRoller";

interface Props {
  card: number[][];
  marks: Set<string>;
  line: [number, number][] | null;
  shake: { cell: string; n: number } | null;
  onTap: (r: number, c: number) => void;
}

export function BingoCard({ card, marks, line, shake, onTap }: Props) {
  const size = card.length;
  const inLine = new Set(line?.map(([r, c]) => `${r}-${c}`));
  const fontSize = { 3: "2.4rem", 4: "1.9rem", 5: "1.6rem", 6: "1.3rem", 7: "1.1rem" }[size] ?? "1.4rem";

  return (
    <div className="w-full rounded-3xl bg-white/10 p-2.5 shadow-2xl backdrop-blur">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {Array.from({ length: size }, (_, c) => (
          <div
            key={`h${c}`}
            className="rounded-lg text-center font-extrabold text-night py-1"
            style={{ background: BALL_COLORS[c % BALL_COLORS.length], fontSize: size === 5 ? "1.4rem" : "0.7rem" }}
          >
            {columnHeader(c, size)}
          </div>
        ))}
        {card.flatMap((row, r) =>
          row.map((value, c) => {
            const key = `${r}-${c}`;
            const free = value === FREE;
            const marked = free || marks.has(key);
            const color = BALL_COLORS[c % BALL_COLORS.length];
            return (
              <button
                key={`${key}-${shake?.cell === key ? shake.n : 0}`}
                onClick={() => onTap(r, c)}
                className={`aspect-square rounded-xl grid place-items-center font-extrabold tabular-nums select-none transition-all duration-200 active:scale-90 ${
                  marked ? "text-night" : "bg-white text-night"
                } ${inLine.has(key) ? "animate-glow ring-4 ring-gold" : ""} ${shake?.cell === key ? "animate-shake" : ""}`}
                style={{ fontSize, ...(marked ? { background: color } : {}) }}
                aria-pressed={marked}
                aria-label={free ? "ช่องฟรี" : `เลข ${value}${marked ? " มาร์กแล้ว" : ""}`}
              >
                {free ? "★" : marked ? <span className="relative">{value}<Dab /></span> : value}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

/** Stamp mark drawn over a daubed number. */
function Dab() {
  return (
    <span className="absolute inset-0 -m-[0.35em] rounded-full border-[0.12em] border-night/70 animate-pop" aria-hidden />
  );
}
