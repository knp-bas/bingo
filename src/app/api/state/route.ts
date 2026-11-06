import { connection } from "next/server";
import { getState } from "@/lib/server/game";

// Polling fallback for clients whose SSE connection keeps failing.
export async function GET() {
  await connection();
  return Response.json(getState(), { headers: { "Cache-Control": "no-store" } });
}
