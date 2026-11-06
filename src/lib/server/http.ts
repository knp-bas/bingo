import "server-only";
import crypto from "node:crypto";
import { GameError } from "./game";

export function hostPin() {
  return process.env.HOST_PIN || "1234";
}

export function isHost(req: Request) {
  const given = Buffer.from(req.headers.get("x-host-pin") ?? "");
  const expected = Buffer.from(hostPin());
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Wraps a handler: JSON in/out, GameError → proper status, optional host check. */
export function handle(fn: (req: Request) => unknown | Promise<unknown>, opts: { host?: boolean } = {}) {
  return async (req: Request) => {
    try {
      if (opts.host && !isHost(req)) {
        return Response.json({ error: "bad_pin", message: "PIN ไม่ถูกต้อง" }, { status: 401 });
      }
      const data = await fn(req);
      return Response.json(data ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof GameError) {
        return Response.json({ error: e.code, message: e.message }, { status: e.status });
      }
      console.error(e);
      return Response.json({ error: "server", message: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}
