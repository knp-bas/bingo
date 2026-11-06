import { connection } from "next/server";
import { broadcastPresence, getState } from "@/lib/server/game";
import { subscribe } from "@/lib/server/bus";

const encoder = new TextEncoder();

/** Server-Sent Events: pushes the full game state whenever anything changes. */
export async function GET(req: Request) {
  await connection();

  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      write("retry: 2000\n\n");
      write(`data: ${JSON.stringify(getState())}\n\n`);
      const unsubscribe = subscribe((payload) => write(`data: ${payload}\n\n`));
      // Comment line every 20s keeps proxies (Railway etc.) from dropping an idle stream.
      const ping = setInterval(() => write(": ping\n\n"), 20_000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        broadcastPresence();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
      broadcastPresence();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
