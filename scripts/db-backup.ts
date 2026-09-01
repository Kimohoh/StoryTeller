/**
 * DB를 한 파일로 안전하게 떠 둔다.
 *
 * 지금 이 기록은 노트북 한 대에만 있다. 실수로 지우거나 디스크가 죽으면
 * 그걸로 끝이다 — 실제로 한 번 지울 뻔했다.
 *
 *   npm run db:backup
 *   npm run db:backup -- ~/어디/다른/폴더
 *
 * cp 로 세 파일을 긁는 것과 다르다. SQLite 자신의 백업 기능을 쓰므로
 * 앱이 돌고 있는 중에 떠도 -wal 에 있던 내용까지 합쳐진 온전한 한 파일이
 * 나온다. 나온 파일은 그대로 STORYTELLER_DB 로 가리키거나 data/ 에
 * 갖다 놓으면 바로 쓸 수 있다.
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "../lib/env-file";

loadEnvLocal(join(dirname(fileURLToPath(import.meta.url)), ".."));

const source = process.env.STORYTELLER_DB ?? join(process.cwd(), "data/storyteller.sqlite");
if (!existsSync(source)) {
  console.error(`\n원본이 없다: ${source}`);
  console.error("npm run db:where 로 어디를 보고 있는지 먼저 확인한다.\n");
  process.exit(1);
}

const outDir = process.argv[2]?.replace(/^~/, homedir()) ?? join(homedir(), "godok-backup");
mkdirSync(outDir, { recursive: true });

const now = new Date();
const p = (n: number) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
const dest = join(outDir, `storyteller-${stamp}.sqlite`);

const db = new Database(source, { readonly: true });
const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
const sessions = count("SELECT COUNT(*) c FROM sessions");
const answers = count("SELECT COUNT(*) c FROM answers");

await db.backup(dest);
db.close();

// 뜬 파일을 열어 같은 수가 나오는지 본다. 확인 없는 백업은 백업이 아니다.
const check = new Database(dest, { readonly: true });
const got = (check.prepare("SELECT COUNT(*) c FROM sessions").get() as { c: number }).c;
check.close();

console.log(`\n원본  ${source}`);
console.log(`백업  ${dest}`);
console.log(`      세션 ${sessions}건 · 답 ${answers}건`);
console.log(
  got === sessions
    ? "\n확인했다. 이 한 파일이면 복구된다.\n"
    : `\n수가 안 맞는다 (백업 ${got}건). 다시 떠라.\n`,
);
process.exit(got === sessions ? 0 : 1);
