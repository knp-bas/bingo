import type { WinnerInfo } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function WinnersList({ winners, max, big }: { winners: WinnerInfo[]; max: number; big?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-baseline justify-between ${big ? "text-2xl" : "text-lg"}`}>
        <span className="font-semibold">🏆 ผู้ชนะ</span>
        <span className="tabular-nums text-gold font-extrabold">
          {winners.length}/{max}
        </span>
      </div>
      {winners.length === 0 && <p className="text-white/50">ยังไม่มีใครบิงโก…</p>}
      <ol className="flex flex-col gap-1.5">
        {winners.map((w) => (
          <li
            key={w.rank}
            className={`animate-rise flex items-center gap-3 rounded-xl bg-white/10 px-3 ${big ? "py-2 text-2xl" : "py-1.5"}`}
          >
            <span className="w-8 text-center">{MEDALS[w.rank - 1] ?? `#${w.rank}`}</span>
            <span className="flex-1 font-semibold truncate">{w.name}</span>
            <span className="text-white/50 text-sm tabular-nums">เลข {w.winningNumber}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
