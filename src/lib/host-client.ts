"use client";

// Host PIN is kept in localStorage so /host and /screen in the same browser
// share one login (sessionStorage would not carry over to a new tab).
const KEY = "bingo.hostPin";

export function loadPin(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function savePin(pin: string) {
  try {
    localStorage.setItem(KEY, pin);
  } catch {}
}

export function clearPin() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export async function verifyPin(pin: string) {
  const r = await fetch("/api/host/verify", { method: "POST", headers: { "x-host-pin": pin } });
  return r.ok;
}

/** POST to a host endpoint. Returns an error message, or null on success. Clears the PIN on 401. */
export async function hostPost(path: string, pin: string, body?: unknown): Promise<string | null> {
  try {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-host-pin": pin },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 401) {
      clearPin();
      return "PIN ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่";
    }
    if (!r.ok) return (await r.json()).message ?? "ทำรายการไม่สำเร็จ";
    return null;
  } catch {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้";
  }
}
