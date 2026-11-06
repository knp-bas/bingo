import "server-only";
import crypto from "node:crypto";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { calls, cards, players, rounds, winners } from "./schema";
import { publish, onlineCount, schedulePresence } from "./bus";
import {
  MAX_SIZE,
  MIN_SIZE,
  canHaveFreeCenter,
  completedAtCall,
  generateCard,
  maxNumber,
} from "../bingo";
import type { CardResponse, GameState, RoundInfo } from "../types";

/** How long the "spinning" animation runs before the number is revealed. */
export const ROLL_MS = 4000;

interface Rolling {
  roundId: number;
  endsAt: number;
  timer: ReturnType<typeof setTimeout>;
}

const g = globalThis as unknown as { __bingoRolling?: Rolling | null };

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// ---------- reads ----------

function currentRoundRow() {
  return db.select().from(rounds).orderBy(desc(rounds.id)).limit(1).get();
}

function toRoundInfo(r: typeof rounds.$inferSelect): RoundInfo {
  return {
    id: r.id,
    size: r.size,
    freeCenter: r.freeCenter,
    maxWinners: r.maxWinners,
    maxNumber: maxNumber(r.size),
    status: r.status,
  };
}

function callsFor(roundId: number) {
  return db
    .select({ number: calls.number })
    .from(calls)
    .where(eq(calls.roundId, roundId))
    .orderBy(asc(calls.seq))
    .all()
    .map((c) => c.number);
}

export function getState(): GameState {
  const row = currentRoundRow();
  const rolling = g.__bingoRolling;
  if (!row) {
    return { round: null, calls: [], rolling: null, winners: [], playersInRound: 0, online: onlineCount() };
  }
  const callList = callsFor(row.id);
  const winnerRows = db
    .select({ rank: winners.rank, callSeq: winners.callSeq, name: players.name })
    .from(winners)
    .innerJoin(players, eq(players.id, winners.playerId))
    .where(eq(winners.roundId, row.id))
    .orderBy(asc(winners.rank))
    .all();
  const inRound = db.select({ n: count() }).from(cards).where(eq(cards.roundId, row.id)).get()?.n ?? 0;

  return {
    round: toRoundInfo(row),
    calls: callList,
    rolling:
      rolling && rolling.roundId === row.id
        ? { remainingMs: Math.max(0, rolling.endsAt - Date.now()), durationMs: ROLL_MS }
        : null,
    winners: winnerRows.map((w) => ({ rank: w.rank, name: w.name, winningNumber: callList[w.callSeq] })),
    playersInRound: inRound,
    online: onlineCount(),
  };
}

export function broadcast() {
  publish(JSON.stringify(getState()));
}

export function broadcastPresence() {
  schedulePresence(broadcast);
}

// ---------- players ----------

export function joinPlayer(rawName: string) {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 30);
  if (!name) throw new GameError("bad_name", "กรุณากรอกชื่อ");
  const id = crypto.randomUUID();
  db.insert(players).values({ id, name, createdAt: Date.now() }).run();
  return { playerId: id, name };
}

function requirePlayer(playerId: string) {
  const p = db.select().from(players).where(eq(players.id, playerId)).get();
  if (!p) throw new GameError("unknown_player", "ไม่พบผู้เล่น กรุณาเข้าร่วมใหม่", 404);
  return p;
}

/** Returns the player's card for the current round, dealing one if the round is live. */
export function getCard(playerId: string): CardResponse & { name: string } {
  const player = requirePlayer(playerId);
  const row = currentRoundRow();
  if (!row) return { round: null, card: null, rank: null, name: player.name };

  let card = db
    .select()
    .from(cards)
    .where(and(eq(cards.roundId, row.id), eq(cards.playerId, playerId)))
    .get();

  let dealt = false;
  if (!card && row.status === "playing") {
    const numbers = generateCard(row.size, row.freeCenter);
    db.insert(cards).values({ roundId: row.id, playerId, numbers }).onConflictDoNothing().run();
    card = db
      .select()
      .from(cards)
      .where(and(eq(cards.roundId, row.id), eq(cards.playerId, playerId)))
      .get();
    dealt = true;
  }

  const win = db
    .select({ rank: winners.rank })
    .from(winners)
    .where(and(eq(winners.roundId, row.id), eq(winners.playerId, playerId)))
    .get();

  if (dealt) broadcastPresence(); // player count changed

  return { round: toRoundInfo(row), card: card?.numbers ?? null, rank: win?.rank ?? null, name: player.name };
}

// ---------- claims ----------

export function claimBingo(playerId: string) {
  requirePlayer(playerId);

  const result = db.transaction((tx) => {
    const row = tx.select().from(rounds).orderBy(desc(rounds.id)).limit(1).get();
    if (!row) throw new GameError("no_round", "ยังไม่มีรอบที่กำลังเล่น");

    const existing = tx
      .select({ rank: winners.rank })
      .from(winners)
      .where(and(eq(winners.roundId, row.id), eq(winners.playerId, playerId)))
      .get();
    if (existing) return { rank: existing.rank, fresh: false };

    if (row.status !== "playing") throw new GameError("round_over", "รอบนี้ครบจำนวนผู้ชนะแล้ว");

    const card = tx
      .select()
      .from(cards)
      .where(and(eq(cards.roundId, row.id), eq(cards.playerId, playerId)))
      .get();
    if (!card) throw new GameError("no_card", "คุณยังไม่มีการ์ดในรอบนี้");

    // Validate against numbers actually drawn — never trust what the client marked.
    const seq = completedAtCall(card.numbers, callsFor(row.id));
    if (seq < 0) throw new GameError("not_complete", "ยังไม่ครบเส้น ลองเช็กอีกครั้งนะ");

    const taken = tx.select({ n: count() }).from(winners).where(eq(winners.roundId, row.id)).get()?.n ?? 0;
    if (taken >= row.maxWinners) throw new GameError("round_over", "รอบนี้ครบจำนวนผู้ชนะแล้ว");

    const rank = taken + 1;
    tx.insert(winners).values({ roundId: row.id, playerId, rank, callSeq: seq, claimedAt: Date.now() }).run();
    if (rank >= row.maxWinners) {
      tx.update(rounds).set({ status: "finished" }).where(eq(rounds.id, row.id)).run();
    }
    return { rank, fresh: true };
  });

  if (result.fresh) broadcast();
  return { rank: result.rank };
}

// ---------- host actions ----------

export function startRound(opts: { size: number; freeCenter: boolean; maxWinners: number }) {
  const size = Math.round(opts.size);
  if (!(size >= MIN_SIZE && size <= MAX_SIZE)) {
    throw new GameError("bad_size", `ขนาดต้องอยู่ระหว่าง ${MIN_SIZE}-${MAX_SIZE}`);
  }
  const maxWinners = Math.round(opts.maxWinners);
  if (!(maxWinners >= 1 && maxWinners <= 200)) throw new GameError("bad_winners", "จำนวนผู้ชนะต้องอยู่ระหว่าง 1-200");

  cancelRolling();
  db.transaction((tx) => {
    tx.update(rounds).set({ status: "finished" }).where(eq(rounds.status, "playing")).run();
    tx.insert(rounds)
      .values({
        size,
        freeCenter: opts.freeCenter && canHaveFreeCenter(size),
        maxWinners,
        status: "playing",
        createdAt: Date.now(),
      })
      .run();
  });
  broadcast();
}

export function endRound() {
  cancelRolling();
  const row = currentRoundRow();
  if (row && row.status === "playing") {
    db.update(rounds).set({ status: "finished" }).where(eq(rounds.id, row.id)).run();
  }
  broadcast();
}

function cancelRolling() {
  if (g.__bingoRolling) {
    clearTimeout(g.__bingoRolling.timer);
    g.__bingoRolling = null;
  }
}

/** Starts the spin; the number itself is only chosen when the spin ends, so nobody can peek. */
export function startDraw() {
  const row = currentRoundRow();
  if (!row || row.status !== "playing") throw new GameError("no_round", "ยังไม่มีรอบที่กำลังเล่น");
  if (g.__bingoRolling) throw new GameError("rolling", "กำลังสุ่มอยู่");
  if (callsFor(row.id).length >= maxNumber(row.size)) throw new GameError("exhausted", "สุ่มครบทุกเลขแล้ว");

  const roundId = row.id;
  g.__bingoRolling = {
    roundId,
    endsAt: Date.now() + ROLL_MS,
    timer: setTimeout(() => finishDraw(roundId), ROLL_MS),
  };
  broadcast();
}

function finishDraw(roundId: number) {
  g.__bingoRolling = null;
  const row = db.select().from(rounds).where(eq(rounds.id, roundId)).get();
  if (row && row.status === "playing") {
    const done = callsFor(roundId);
    const used = new Set(done);
    const remaining: number[] = [];
    for (let n = 1; n <= maxNumber(row.size); n++) if (!used.has(n)) remaining.push(n);
    if (remaining.length) {
      const number = remaining[crypto.randomInt(remaining.length)];
      db.insert(calls).values({ roundId, seq: done.length, number, calledAt: Date.now() }).run();
    }
  }
  broadcast();
}
