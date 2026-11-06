"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/types";

/**
 * Live game state over SSE. If the stream drops, polls /api/state every 3s
 * until the stream reconnects, so a flaky venue Wi-Fi never freezes the game.
 */
export function useGameState() {
  const [state, setState] = useState<GameState | null>(null);
  const [rollEndsAt, setRollEndsAt] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const apply = (s: GameState) => {
      setState(s);
      // Convert server-relative timing into the local clock, so device clock skew doesn't matter.
      setRollEndsAt(s.rolling ? Date.now() + s.rolling.remainingMs : null);
    };

    const startPolling = () => {
      if (poll) return;
      const tick = async () => {
        try {
          const r = await fetch("/api/state", { cache: "no-store" });
          if (r.ok) apply(await r.json());
        } catch {}
      };
      tick();
      poll = setInterval(tick, 3000);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    const connect = () => {
      if (disposed) return;
      es = new EventSource("/api/events");
      es.onmessage = (e) => {
        setConnected(true);
        stopPolling();
        apply(JSON.parse(e.data));
      };
      es.onerror = () => {
        setConnected(false);
        startPolling();
        // The browser retries on its own unless the stream is fully closed.
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          retry = setTimeout(connect, 3000);
        }
      };
    };
    connect();

    return () => {
      disposed = true;
      es?.close();
      stopPolling();
      if (retry) clearTimeout(retry);
    };
  }, []);

  return { state, rollEndsAt, connected };
}
