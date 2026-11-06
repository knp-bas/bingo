"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { NumberRoller } from "@/components/NumberRoller";
import { BingoCard } from "@/components/BingoCard";
import { WinnersList } from "@/components/WinnersList";
import { FREE, findLine } from "@/lib/bingo";
import { celebrate } from "@/lib/confetti";
import { clearPlayer, loadMarks, loadPlayer, saveMarks, type StoredPlayer } from "@/lib/player-store";
import type { CardResponse } from "@/lib/types";

export default function PlayPage() {
  const router = useRouter();
  const { state, rollEndsAt, connected } = useGameState();
  const [me, setMe] = useState<StoredPlayer | null>(null);
  const [cardRes, setCardRes] = useState<CardResponse | null>(null);
  const [marks, setMarks] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState<{ cell: string; n: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const p = loadPlayer();
    if (!p) router.replace("/join");
    else setMe(p);
  }, [router]);

  const roundId = state?.round?.id ?? null;
  const roundStatus = state?.round?.status ?? null;

  // (Re)load my card whenever the round changes.
  const fetchCard = useCallback(async () => {
    if (!me) return;
    const r = await fetch("/api/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: me.playerId }),
    });
    if (r.status === 404) {
      clearPlayer();
      router.replace("/join");
      return;
    }
    if (!r.ok) return;
    const data: CardResponse = await r.json();
    setCardRes(data);
    setMarks(new Set(data.round ? loadMarks(data.round.id) : []));
  }, [me, router]);

  useEffect(() => {
    if (state) void fetchCard();
  }, [fetchCard, roundId, roundStatus, state === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500);
  };

  const card = cardRes?.round?.id === roundId ? cardRes?.card ?? null : null;
  const rank = cardRes?.round?.id === roundId ? cardRes?.rank ?? null : null;
  const called = useMemo(() => new Set(state?.calls ?? []), [state?.calls]);
  const line = useMemo(
    () => (card ? findLine(card, (_v, r, c) => marks.has(`${r}-${c}`)) : null),
    [card, marks],
  );

  function tap(r: number, c: number) {
    if (!card || !roundId || rank) return;
    const value = card[r][c];
    if (value === FREE) return;
    const key = `${r}-${c}`;
    if (!called.has(value) && !marks.has(key)) {
      setShake({ cell: key, n: Date.now() });
      showToast(`เลข ${value} ยังไม่ออกนะ`);
      return;
    }
    const next = new Set(marks);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setMarks(next);
    saveMarks(roundId, [...next]);
  }

  async function claim() {
    if (!me || claiming) return;
    setClaiming(true);
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: me.playerId }),
      });
      const data = await r.json();
      if (!r.ok) {
        showToast(data.message ?? "ส่งไม่สำเร็จ");
      } else {
        setCardRes((c) => (c ? { ...c, rank: data.rank } : c));
        void celebrate();
      }
    } catch {
      showToast("เน็ตหลุด ลองกดอีกครั้ง");
    } finally {
      setClaiming(false);
    }
  }

  if (!me || !state) {
    return <Centered>กำลังเชื่อมต่อ…</Centered>;
  }

  const round = state.round;
  const recent = state.calls.slice(-6, -1).reverse();

  return (
    <main className="flex-1 flex flex-col items-center px-3 pt-3 pb-28 gap-3 max-w-lg w-full mx-auto">
      {/* Header */}
      <header className="w-full flex items-center justify-between text-sm">
        <span className="font-semibold truncate">👤 {me.name}</span>
        <span className="flex items-center gap-1.5 text-white/60">
          <span className={`size-2 rounded-full ${connected ? "bg-mint" : "bg-pink animate-pulse"}`} />
          {connected ? "ออนไลน์" : "กำลังเชื่อมต่อใหม่…"}
        </span>
      </header>

      {!round && <Centered>รอ host เริ่มเกม… 🎲</Centered>}

      {round && (
        <>
          {/* Current number */}
          <section className="w-full flex items-center gap-4 rounded-3xl bg-white/10 p-3">
            <NumberRoller
              roundId={round.id}
              calls={state.calls}
              size={round.size}
              maxNumber={round.maxNumber}
              rollEndsAt={rollEndsAt}
              rollDurationMs={state.rolling?.durationMs ?? 4000}
              variant="compact"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs">
                {rollEndsAt ? "กำลังสุ่ม…" : state.calls.length ? `เลขล่าสุด (ครั้งที่ ${state.calls.length})` : "รอสุ่มเลขแรก"}
              </p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {recent.map((n) => (
                  <span key={n} className="rounded-full bg-white/15 px-2 py-0.5 text-sm tabular-nums">
                    {n}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right text-xs text-white/60 shrink-0">
              ผู้ชนะ
              <div className="text-gold text-xl font-extrabold tabular-nums">
                {state.winners.length}/{round.maxWinners}
              </div>
            </div>
          </section>

          {rank && (
            <div className="w-full rounded-3xl bg-gold text-night text-center py-3 animate-pop">
              <p className="text-3xl font-extrabold">🎉 BINGO! 🎉</p>
              <p className="font-semibold">คุณได้อันดับที่ {rank}</p>
            </div>
          )}

          {card ? (
            <BingoCard card={card} marks={marks} line={line} shake={shake} onTap={tap} />
          ) : (
            <Centered>
              {round.status === "finished" ? "รอบนี้จบแล้ว รอรอบถัดไปนะ" : "กำลังแจกการ์ด…"}
            </Centered>
          )}

          {round.status === "finished" && (
            <div className="w-full rounded-3xl bg-white/10 p-4">
              <WinnersList winners={state.winners} max={round.maxWinners} />
            </div>
          )}

          {card && !rank && round.status === "playing" && (
            <p className="text-white/50 text-sm text-center">แตะเลขที่ออกแล้วเพื่อมาร์ก ครบ 1 เส้น (แนวไหนก็ได้) แล้วกด BINGO!</p>
          )}
        </>
      )}

      {/* BINGO button */}
      {card && !rank && round?.status === "playing" && (
        <div className="fixed bottom-0 inset-x-0 p-3 bg-gradient-to-t from-night to-transparent">
          <button
            onClick={claim}
            disabled={!line || claiming}
            className={`w-full max-w-lg mx-auto block rounded-3xl py-4 text-4xl font-extrabold tracking-wider transition ${
              line ? "bg-gold text-night animate-glow" : "bg-white/10 text-white/30"
            }`}
          >
            {claiming ? "กำลังตรวจ…" : "BINGO!"}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 inset-x-4 mx-auto max-w-sm rounded-2xl bg-pink text-white text-center py-3 px-4 font-semibold shadow-xl animate-rise z-50">
          {toast}
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 grid place-items-center text-xl text-white/70 text-center py-16">{children}</div>;
}
