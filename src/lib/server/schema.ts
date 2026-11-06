import { sqliteTable, integer, text, primaryKey } from "drizzle-orm/sqlite-core";

export const rounds = sqliteTable("rounds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  size: integer("size").notNull(),
  freeCenter: integer("free_center", { mode: "boolean" }).notNull(),
  maxWinners: integer("max_winners").notNull(),
  status: text("status", { enum: ["playing", "finished"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const players = sqliteTable("players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const cards = sqliteTable(
  "cards",
  {
    roundId: integer("round_id").notNull(),
    playerId: text("player_id").notNull(),
    numbers: text("numbers", { mode: "json" }).$type<number[][]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.playerId] })],
);

export const calls = sqliteTable(
  "calls",
  {
    roundId: integer("round_id").notNull(),
    seq: integer("seq").notNull(),
    number: integer("number").notNull(),
    calledAt: integer("called_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.seq] })],
);

export const winners = sqliteTable(
  "winners",
  {
    roundId: integer("round_id").notNull(),
    playerId: text("player_id").notNull(),
    rank: integer("rank").notNull(),
    callSeq: integer("call_seq").notNull(),
    claimedAt: integer("claimed_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.playerId] })],
);

// Kept in sync with the tables above; run on startup so no migration step is needed on deploy.
export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  size INTEGER NOT NULL,
  free_center INTEGER NOT NULL,
  max_winners INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  round_id INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  numbers TEXT NOT NULL,
  PRIMARY KEY (round_id, player_id)
);
CREATE TABLE IF NOT EXISTS calls (
  round_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  number INTEGER NOT NULL,
  called_at INTEGER NOT NULL,
  PRIMARY KEY (round_id, seq)
);
CREATE TABLE IF NOT EXISTS winners (
  round_id INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  call_seq INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (round_id, player_id)
);
`;
