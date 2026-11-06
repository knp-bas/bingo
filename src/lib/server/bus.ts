import "server-only";

type Listener = (payload: string) => void;

interface Bus {
  listeners: Set<Listener>;
  presenceTimer: ReturnType<typeof setTimeout> | null;
}

const g = globalThis as unknown as { __bingoBus?: Bus };
const bus: Bus = (g.__bingoBus ??= { listeners: new Set(), presenceTimer: null });

export function subscribe(fn: Listener) {
  bus.listeners.add(fn);
  return () => {
    bus.listeners.delete(fn);
  };
}

export function onlineCount() {
  return bus.listeners.size;
}

/** Sends one serialized payload to every connected client. */
export function publish(payload: string) {
  for (const fn of bus.listeners) {
    try {
      fn(payload);
    } catch {
      bus.listeners.delete(fn);
    }
  }
}

/**
 * Connect/disconnect changes only the online counter, so batch those:
 * 200 people joining at once becomes a handful of broadcasts, not 200.
 */
export function schedulePresence(send: () => void) {
  if (bus.presenceTimer) return;
  bus.presenceTimer = setTimeout(() => {
    bus.presenceTimer = null;
    send();
  }, 1500);
}
