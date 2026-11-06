import { joinPlayer } from "@/lib/server/game";
import { body, handle } from "@/lib/server/http";

export const POST = handle(async (req) => {
  const { name } = await body<{ name: string }>(req);
  return joinPlayer(String(name ?? ""));
});
