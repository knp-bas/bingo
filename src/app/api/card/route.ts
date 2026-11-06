import { getCard } from "@/lib/server/game";
import { body, handle } from "@/lib/server/http";

// POST so the player id stays out of URLs and logs.
export const POST = handle(async (req) => {
  const { playerId } = await body<{ playerId: string }>(req);
  return getCard(String(playerId ?? ""));
});
