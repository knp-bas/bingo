import { columnHeader, columnRange } from "@/lib/bingo";
import { BALL_COLORS } from "./NumberRoller";

/** Every possible number, one row per card column, with drawn numbers lit up. */
export function CalledBoard({ size, calls, dense }: { size: number; calls: number[]; dense?: boolean }) {
  const called = new Set(calls);
  const last = calls[calls.length - 1];
  const per = size * 3;

  return (
    <div
      className="grid gap-1 w-full"
      style={{ gridTemplateColumns: `minmax(2.5em, auto) repeat(${per}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size }, (_, col) => {
        const [a] = columnRange(col, size);
        const color = BALL_COLORS[col % BALL_COLORS.length];
        return [
          <div
            key={`h${col}`}
            className="grid place-items-center rounded-md font-extrabold text-night px-1"
            style={{ background: color, fontSize: size === 5 ? "1.1em" : "0.65em" }}
          >
            {columnHeader(col, size)}
          </div>,
          ...Array.from({ length: per }, (_, i) => {
            const n = a + i;
            const on = called.has(n);
            return (
              <div
                key={n}
                className={`grid place-items-center rounded-md tabular-nums font-semibold transition-all duration-500 ${
                  dense ? "aspect-square text-[0.7em]" : "aspect-square"
                } ${on ? "text-night scale-100" : "bg-white/5 text-white/30 scale-90"} ${
                  n === last ? "ring-4 ring-white animate-pop" : ""
                }`}
                style={on ? { background: color } : undefined}
              >
                {n}
              </div>
            );
          }),
        ];
      })}
    </div>
  );
}
