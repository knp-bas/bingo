"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadPlayer, savePlayer, type StoredPlayer } from "@/lib/player-store";

export default function JoinPage() {
  const router = useRouter();
  const [existing, setExisting] = useState<StoredPlayer | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExisting(loadPlayer());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? "เข้าร่วมไม่สำเร็จ");
      savePlayer(data);
      router.push("/play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าร่วมไม่สำเร็จ ลองอีกครั้ง");
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
      <div className="text-center animate-rise">
        <h1 className="text-6xl font-extrabold tracking-tight">
          {"BINGO".split("").map((ch, i) => (
            <span key={i} style={{ color: ["#ff4fa3", "#ffcc33", "#3ee8b5", "#4fc3ff", "#b57bff"][i] }}>
              {ch}
            </span>
          ))}
          <span className="text-white">!</span>
        </h1>
        <p className="mt-2 text-white/70">ใส่ชื่อแล้วรับการ์ดของคุณ</p>
      </div>

      {existing && (
        <button
          onClick={() => router.push("/play")}
          className="w-full max-w-sm rounded-2xl bg-mint text-night font-extrabold text-xl py-4 shadow-lg active:scale-95 transition"
        >
          เล่นต่อในชื่อ “{existing.name}”
        </button>
      )}

      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-3">
        {existing && <p className="text-center text-white/50 text-sm">หรือเข้าร่วมด้วยชื่อใหม่</p>}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="ชื่อของคุณ"
          autoComplete="nickname"
          className="rounded-2xl bg-white text-night text-xl px-5 py-4 outline-none focus:ring-4 ring-gold"
        />
        <button
          disabled={!name.trim() || busy}
          className="rounded-2xl bg-gold text-night font-extrabold text-xl py-4 shadow-lg disabled:opacity-40 active:scale-95 transition"
        >
          {busy ? "กำลังเข้าร่วม…" : "เข้าร่วมเกม 🎉"}
        </button>
        {error && <p className="text-pink text-center">{error}</p>}
      </form>
    </main>
  );
}
