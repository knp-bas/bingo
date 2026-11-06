import { startRound } from "@/lib/server/game";
import { body, handle } from "@/lib/server/http";

export const POST = handle(
  async (req) => {
    const b = await body<{ size: number; freeCenter: boolean; maxWinners: number }>(req);
    startRound({ size: Number(b.size), freeCenter: Boolean(b.freeCenter), maxWinners: Number(b.maxWinners) });
  },
  { host: true },
);
