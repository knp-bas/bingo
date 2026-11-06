"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/hooks/useGameState";
import { NumberRoller } from "@/components/NumberRoller";
import { CalledBoard } from "@/components/CalledBoard";
import { WinnersList } from "@/components/WinnersList";
import { JoinQR } from "@/components/JoinQR";
import { MAX_SIZE, MIN_SIZE, canHaveFreeCenter, maxNumber } from "@/lib/bingo";
import { playFanfare, unlockAudio } from "@/lib/sound";
import { clearPin, hostPost, loadPin, savePin, verifyPin } from "@/lib/host-client";

export default function HostPage() {
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    setPin(loadPin());
  }, []);

  if (!pin) return <PinGate onOk={(p) => setPin(p)} />;
  return (
    <HostConsole
      pin={pin}
      onLogout={() => {
        clearPin();
        setPin(null);
      }}
    />
  );
}

function PinGate({ onOk }: { onOk: (pin: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await verifyPin(value)) {
      savePin(value);
      onOk(value);
    } else setError(true);
  }

  return (
    <main className="flex-1 grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-extrabold">🎛️ Host</h1>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          placeholder="PIN"
          className="rounded-2xl bg-white text-night text-2xl text-center px-5 py-3 outline-none focus:ring-4 ring-gold"
        />
        <button className="rounded-2xl bg-gold text-night font-extrabold text-xl py-3">เข้าสู่ระบบ</button>
        {error && <p className="text-pink">PIN ไม่ถูกต้อง</p>}
      </form>
    </main>
  );
}

function HostConsole({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const { state, rollEndsAt, connected } = useGameState();
  const [size, setSize] = useState(5);
  const [freeCenter, setFreeCenter] = useState(true);
  const [maxWinners, setMaxWinners] = useState(3);
  const [sound, setSound] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const winnerCount = useRef<number | null>(null);

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const err = await hostPost(path, pin, body);
    setBusy(false);
    if (err && !loadPin()) return onLogout();
    setError(err);
  }

  const round = state?.round ?? null;
  const playing = round?.status === "playing";
  const exhausted = !!round && state!.calls.length >= round.maxNumber;
  const canDraw = playing && !rollEndsAt && !exhausted && !busy;

  function draw() {
    if (!canDraw) return;
    if (sound) unlockAudio();
    void call("/api/host/draw");
  }

  function newRound() {
    if (playing && !confirm("รอบปัจจุบันยังเล่นอยู่ ต้องการจบรอบนี้และเริ่มรอบใหม่?")) return;
    void call("/api/host/round", { size, freeCenter, maxWinners });
  }

  // Space / Enter draws a number (handy with a clicker or keyboard on stage).
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target instanceof Element && e.target.closest("input, select, textarea, button"))) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        drawRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fanfare when someone new wins.
  useEffect(() => {
    const n = state?.winners.length ?? 0;
    if (winnerCount.current !== null && n > winnerCount.current && sound) playFanfare();
    winnerCount.current = n;
  }, [state?.winners.length, sound]);

  if (!state) return <main className="flex-1 grid place-items-center text-white/60">กำลังเชื่อมต่อ…</main>;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto p-4 grid gap-4 lg:grid-cols-[1fr_340px]">
      {/* Left: drawing */}
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold mr-auto">🎛️ Host</h1>
          <Stat label="ออนไลน์" value={state.online} dot={connected} />
          <Stat label="ผู้เล่นรอบนี้" value={state.playersInRound} />
          <button
            onClick={() => {
              setSound((s) => !s);
              unlockAudio();
            }}
            className="rounded-xl bg-white/10 px-3 py-2"
          >
            {sound ? "🔊" : "🔇"}
          </button>
          <a href="/screen" target="_blank" className="rounded-xl bg-white/10 px-3 py-2 text-sm">
            เปิดจอใหญ่ ↗
          </a>
        </header>

        <div className="rounded-3xl bg-white/10 p-6 flex flex-col sm:flex-row items-center gap-6">
          {round ? (
            <NumberRoller
              roundId={round.id}
              calls={state.calls}
              size={round.size}
              maxNumber={round.maxNumber}
              rollEndsAt={rollEndsAt}
              rollDurationMs={state.rolling?.durationMs ?? 4000}
              variant="large"
              sound={sound}
            />
          ) : (
            <div className="size-[200px] rounded-full bg-white/5 grid place-items-center text-white/40">ยังไม่เริ่ม</div>
          )}
          <div className="flex-1 flex flex-col gap-3 w-full">
            <button
              onClick={draw}
              disabled={!canDraw}
              className="rounded-3xl bg-pink text-white font-extrabold text-4xl py-6 shadow-xl active:scale-95 transition disabled:opacity-40"
            >
              {rollEndsAt ? "กำลังสุ่ม…" : exhausted ? "ครบทุกเลขแล้ว" : "🎲 สุ่มเลข"}
            </button>
            <p className="text-white/50 text-sm text-center">
              กด Space หรือ Enter เพื่อสุ่มได้ · ออกไปแล้ว {state.calls.length}/{round?.maxNumber ?? "-"} เลข
            </p>
            {round && (
              <p className="text-center">
                รอบที่ {round.id} · {round.size}×{round.size}
                {round.freeCenter ? " · มีช่องฟรี" : ""} ·{" "}
                <span className={playing ? "text-mint" : "text-gold"}>{playing ? "กำลังเล่น" : "จบรอบแล้ว"}</span>
              </p>
            )}
            {error && <p className="text-pink text-center">{error}</p>}
          </div>
        </div>

        {round && (
          <div className="rounded-3xl bg-white/10 p-4">
            <CalledBoard size={round.size} calls={state.calls} dense={round.size >= 6} />
          </div>
        )}
      </section>

      {/* Right: settings + winners */}
      <aside className="flex flex-col gap-4">
        <div className="rounded-3xl bg-white/10 p-4 flex flex-col gap-4">
          <h2 className="font-semibold text-lg">⚙️ ตั้งค่ารอบใหม่</h2>

          <div>
            <p className="text-sm text-white/60 mb-1.5">ขนาดการ์ด</p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${MAX_SIZE - MIN_SIZE + 1}, minmax(0, 1fr))` }}>
              {Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i).map((n) => (
                <button
                  key={n}
                  onClick={() => setSize(n)}
                  className={`rounded-xl py-2 font-semibold ${size === n ? "bg-gold text-night" : "bg-white/10"}`}
                >
                  {n}×{n}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/50 mt-1.5">ใช้เลข 1–{maxNumber(size)}</p>
          </div>

          <label className={`flex items-center gap-3 ${canHaveFreeCenter(size) ? "" : "opacity-40"}`}>
            <input
              type="checkbox"
              className="size-5 accent-gold"
              checked={freeCenter && canHaveFreeCenter(size)}
              disabled={!canHaveFreeCenter(size)}
              onChange={(e) => setFreeCenter(e.target.checked)}
            />
            ช่องฟรีตรงกลาง ★ {canHaveFreeCenter(size) ? "" : "(เฉพาะขนาดเลขคี่)"}
          </label>

          <div>
            <p className="text-sm text-white/60 mb-1.5">จำนวนผู้ชนะในรอบ</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setMaxWinners((n) => Math.max(1, n - 1))} className="size-11 rounded-xl bg-white/10 text-2xl">
                −
              </button>
              <input
                type="number"
                min={1}
                max={200}
                value={maxWinners}
                onChange={(e) => setMaxWinners(Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
                className="flex-1 min-w-0 rounded-xl bg-white text-night text-center text-2xl font-extrabold py-1.5"
              />
              <button onClick={() => setMaxWinners((n) => Math.min(200, n + 1))} className="size-11 rounded-xl bg-white/10 text-2xl">
                +
              </button>
            </div>
            <p className="text-xs text-white/50 mt-1.5">ครบจำนวนแล้วรอบจะจบอัตโนมัติ</p>
          </div>

          <button
            onClick={newRound}
            disabled={busy}
            className="rounded-2xl bg-mint text-night font-extrabold text-xl py-3 disabled:opacity-40"
          >
            ▶ เริ่มรอบใหม่
          </button>
          {playing && (
            <button
              onClick={() => confirm("จบรอบนี้เลย?") && void call("/api/host/end")}
              className="rounded-2xl bg-white/10 py-2 text-white/80"
            >
              ⏹ จบรอบนี้
            </button>
          )}
        </div>

        {round && (
          <div className="rounded-3xl bg-white/10 p-4">
            <WinnersList winners={state.winners} max={round.maxWinners} />
          </div>
        )}

        <div className="rounded-3xl bg-white/10 p-4 flex flex-col items-center gap-2">
          <p className="text-sm text-white/60">QR สำหรับผู้เล่น</p>
          <JoinQR className="w-40" />
        </div>

        <button onClick={onLogout} className="text-white/40 text-sm">
          ออกจากระบบ host
        </button>
      </aside>
    </main>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot?: boolean }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-1.5 text-sm flex items-center gap-2">
      {dot !== undefined && <span className={`size-2 rounded-full ${dot ? "bg-mint" : "bg-pink animate-pulse"}`} />}
      <span className="text-white/60">{label}</span>
      <span className="font-extrabold tabular-nums">{value}</span>
    </div>
  );
}
