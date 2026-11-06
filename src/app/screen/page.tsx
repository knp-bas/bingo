"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { NumberRoller, BALL_COLORS } from "@/components/NumberRoller";
import { CalledBoard } from "@/components/CalledBoard";
import { WinnersList } from "@/components/WinnersList";
import { JoinQR } from "@/components/JoinQR";
import { columnOf } from "@/lib/bingo";
import { playFanfare, unlockAudio } from "@/lib/sound";
import { celebrate } from "@/lib/confetti";
import { hostPost, loadPin, savePin, verifyPin } from "@/lib/host-client";
import type { WinnerInfo } from "@/lib/types";

/**
 * Projector view: big ball, history, board, winners.
 * If this browser is logged in as host, it also gets a draw button (and Space/Enter).
 */
export default function ScreenPage() {
  const { state, rollEndsAt } = useGameState();
  const [sound, setSound] = useState(false);
  const [announce, setAnnounce] = useState<WinnerInfo | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  useEffect(() => {
    setPin(loadPin());
  }, []);

  const round0 = state?.round ?? null;
  const canDraw =
    !!pin &&
    round0?.status === "playing" &&
    !rollEndsAt &&
    !drawing &&
    (state?.calls.length ?? 0) < round0.maxNumber;

  async function draw() {
    if (!canDraw || !pin) return;
    if (sound) unlockAudio();
    setDrawing(true);
    const err = await hostPost("/api/host/draw", pin);
    setDrawing(false);
    if (err) {
      if (!loadPin()) setPin(null);
      setDrawError(err);
      setTimeout(() => setDrawError(null), 3000);
    }
  }

  async function hostLogin() {
    const p = window.prompt("ใส่ PIN ของ host เพื่อกดสุ่มจากหน้านี้");
    if (!p) return;
    if (await verifyPin(p)) {
      savePin(p);
      setPin(p);
    } else {
      window.alert("PIN ไม่ถูกต้อง");
    }
  }

  // Space / Enter draws (works in fullscreen, and with a presentation clicker that sends Enter).
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused button handles its own key press; don't draw twice.
      if (e.repeat || (e.target instanceof Element && e.target.closest("button"))) return;
      if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        void drawRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const seenWinners = useRef<{ roundId: number | null; count: number } | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Announce each new winner with a banner + confetti + fanfare.
  useEffect(() => {
    if (!state) return;
    const roundId = state.round?.id ?? null;
    const prev = seenWinners.current;
    seenWinners.current = { roundId, count: state.winners.length };
    if (!prev || prev.roundId !== roundId || state.winners.length <= prev.count) return;
    const latest = state.winners[state.winners.length - 1];
    setAnnounce(latest);
    void celebrate();
    if (sound) playFanfare();
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnounce(null), 5000);
  }, [state, sound]);

  function enableSound() {
    unlockAudio();
    setSound(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  if (!state) return <main className="flex-1 grid place-items-center text-white/50 text-2xl">กำลังเชื่อมต่อ…</main>;

  const round = state.round;

  return (
    <main className="flex-1 h-dvh overflow-hidden p-[2vh] flex flex-col gap-[2vh]">
      <div className="fixed top-3 right-3 z-50 flex gap-2">
        {!pin && (
          <button onClick={hostLogin} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/25">
            🎛️ host
          </button>
        )}
        {!sound && (
          <button onClick={enableSound} className="rounded-xl bg-white/15 px-4 py-2 text-sm hover:bg-white/25">
            🔊 เปิดเสียง + เต็มจอ
          </button>
        )}
      </div>

      {!round ? (
        <WaitingScreen online={state.online} />
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-[1.15fr_1fr] gap-[2vh]">
          {/* Left: the ball */}
          <section className="flex flex-col items-center justify-center gap-[3vh] rounded-[3vh] bg-white/5 p-[3vh] relative">
            <p className="text-[3.2vh] text-white/70 font-semibold h-[4vh]">
              {rollEndsAt
                ? "🎰 กำลังสุ่ม…"
                : round.status === "finished"
                  ? "🏁 จบรอบแล้ว"
                  : state.calls.length
                    ? `ครั้งที่ ${state.calls.length}`
                    : "เตรียมตัว…"}
            </p>
            <NumberRoller
              roundId={round.id}
              calls={state.calls}
              size={round.size}
              maxNumber={round.maxNumber}
              rollEndsAt={rollEndsAt}
              rollDurationMs={state.rolling?.durationMs ?? 4000}
              variant="hero"
              sound={sound}
              fx
            />
            <History calls={state.calls} size={round.size} />
            {pin && round.status === "playing" && (
              <div className="flex flex-col items-center gap-[1vh]">
                <button
                  onClick={() => void draw()}
                  disabled={!canDraw}
                  className="rounded-full bg-pink text-white font-extrabold text-[4.5vh] px-[6vh] py-[1.6vh] shadow-2xl transition active:scale-95 hover:brightness-110 disabled:opacity-30"
                >
                  {rollEndsAt || drawing ? "กำลังสุ่ม…" : state.calls.length >= round.maxNumber ? "ครบทุกเลขแล้ว" : "🎲 สุ่มเลข"}
                </button>
                <p className="text-[1.8vh] text-white/40">{drawError ?? "หรือกด Space / Enter"}</p>
              </div>
            )}
          </section>

          {/* Right: board, winners, join */}
          <section className="flex flex-col gap-[2vh] min-h-0">
            <div className="rounded-[3vh] bg-white/5 p-[2vh] text-[1.6vh]">
              <CalledBoard size={round.size} calls={state.calls} dense={round.size >= 6} />
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-[1fr_auto] gap-[2vh]">
              <div className="rounded-[3vh] bg-white/5 p-[2vh] overflow-hidden">
                <WinnersList winners={state.winners} max={round.maxWinners} big />
              </div>
              <div className="rounded-[3vh] bg-white/5 p-[2vh] flex flex-col items-center gap-[1vh] w-[22vh]">
                <p className="text-[1.8vh] text-white/70">สแกนเพื่อเล่น</p>
                <JoinQR className="w-full" showUrl={false} />
                <p className="text-[1.8vh] text-white/60 tabular-nums">👥 {state.playersInRound} คน</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {announce && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-night/70 backdrop-blur-sm pointer-events-none">
          <div className="animate-pop text-center rounded-[4vh] bg-gold text-night px-[8vh] py-[5vh] shadow-2xl">
            <p className="text-[10vh] font-extrabold leading-none">BINGO!</p>
            <p className="text-[6vh] font-extrabold mt-[2vh]">{announce.name}</p>
            <p className="text-[3.5vh] font-semibold mt-[1vh]">อันดับที่ {announce.rank}</p>
          </div>
        </div>
      )}
    </main>
  );
}

function History({ calls, size }: { calls: number[]; size: number }) {
  const prev = calls.slice(-7, -1).reverse();
  if (!prev.length) return <div className="h-[9vh]" />;
  return (
    <div className="flex items-center gap-[1.5vh] h-[9vh]">
      <span className="text-white/50 text-[2vh]">ก่อนหน้า</span>
      {prev.map((n, i) => (
        <div
          key={n}
          className="ball grid place-items-center"
          style={{
            width: `${8 - i * 0.8}vh`,
            height: `${8 - i * 0.8}vh`,
            opacity: 1 - i * 0.12,
            ["--ball" as string]: BALL_COLORS[columnOf(n, size) % BALL_COLORS.length],
          }}
        >
          <span className="ball-face grid place-items-center w-[70%] h-[70%] font-extrabold text-[2.2vh] tabular-nums">
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}

function WaitingScreen({ online }: { online: number }) {
  return (
    <div className="flex-1 grid grid-cols-2 items-center gap-[6vh] px-[6vh]">
      <div className="flex flex-col gap-[3vh]">
        <h1 className="text-[16vh] font-extrabold leading-none tracking-tight">
          {"BINGO".split("").map((ch, i) => (
            <span key={i} className="inline-block animate-rise" style={{ color: BALL_COLORS[i], animationDelay: `${i * 90}ms` }}>
              {ch}
            </span>
          ))}
          <span>!</span>
        </h1>
        <p className="text-[4.5vh] font-semibold">📱 สแกน QR เพื่อรับการ์ดของคุณ</p>
        <p className="text-[3vh] text-white/60">เข้ามาแล้ว {online} เครื่อง · รอ host เริ่มเกม…</p>
      </div>
      <JoinQR className="w-[60vh] max-w-full justify-self-center" />
    </div>
  );
}
