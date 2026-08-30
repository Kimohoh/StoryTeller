import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { bootstrap } from "./bootstrap";

const DB_PATH = process.env.STORYTELLER_DB ?? join(process.cwd(), "data/storyteller.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.exec(readFileSync(join(process.cwd(), "db/schema.sql"), "utf8"));
  // 배포 컨테이너에는 시드 스크립트가 없다. 프로세스마다 한 번, 여기서 맞춘다.
  bootstrap(db);
  return db;
}
