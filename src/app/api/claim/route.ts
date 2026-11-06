import { claimBingo } from "@/lib/server/game";
import { body, handle } from "@/lib/server/http";

export const POST = handle(async (req) => {
  const { playerId } = await body<{ playerId: string }>(req);
  return claimBingo(String(playerId ?? ""));
});
