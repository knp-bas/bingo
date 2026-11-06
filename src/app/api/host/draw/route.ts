import { startDraw } from "@/lib/server/game";
import { handle } from "@/lib/server/http";

export const POST = handle(() => startDraw(), { host: true });
