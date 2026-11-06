import { handle } from "@/lib/server/http";

// Lets the host page check a PIN before showing controls.
export const POST = handle(() => ({ ok: true }), { host: true });
