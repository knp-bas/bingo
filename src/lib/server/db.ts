import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

const g = globalThis as unknown as { __bingoDb?: DB };

function open(): DB {
  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "bingo.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.exec(schema.BOOTSTRAP_SQL);
  return drizzle(sqlite, { schema });
}

// One connection per process (survives dev hot reloads).
export const db: DB = (g.__bingoDb ??= open());
