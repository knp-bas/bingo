import { endRound } from "@/lib/server/game";
import { handle } from "@/lib/server/http";

export const POST = handle(() => endRound(), { host: true });
