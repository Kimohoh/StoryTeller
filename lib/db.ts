import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = process.env.STORYTELLER_DB ?? join(process.cwd(), "data/storyteller.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  db = new Database(DB_PATH);
  db.exec(readFileSync(join(process.cwd(), "db/schema.sql"), "utf8"));
  return db;
}
