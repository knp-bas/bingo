"use client";

// localStorage helpers — wrapped because private mode / blocked storage can throw.

const KEY = "bingo.player";

export interface StoredPlayer {
  playerId: string;
  name: string;
}

export function loadPlayer(): StoredPlayer | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}

export function savePlayer(p: StoredPlayer) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function clearPlayer() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function loadMarks(roundId: number): string[] {
  try {
    return JSON.parse(localStorage.getItem(`bingo.marks.${roundId}`) ?? "[]");
  } catch {
    return [];
  }
}

export function saveMarks(roundId: number, marks: string[]) {
  try {
    localStorage.setItem(`bingo.marks.${roundId}`, JSON.stringify(marks));
  } catch {}
}
