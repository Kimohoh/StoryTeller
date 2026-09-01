/**
 * 앱이 실제로 어느 DB를 보고 있는지, 거기 뭐가 들었는지.
 *
 * "기록이 안 보인다"는 대개 기록이 지워진 게 아니라 다른 파일을 보고 있는
 * 것이다. DB 경로는 STORYTELLER_DB가 없으면 **앱을 띄운 폴더** 기준이라,
 * 다른 데서 띄우면 빈 파일이 새로 생긴다.
 *
 *   npm run db:where
 *
 * 앱과 같은 폴더에서 돌려야 같은 답이 나온다.
 */
import Database from "better-sqlite3";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const path = process.env.STORYTELLER_DB ?? join(process.cwd(), "data/storyteller.sqlite");

console.log(`\n지금 폴더  ${process.cwd()}`);
console.log(`DB 경로    ${path}`);
console.log(
  process.env.STORYTELLER_DB
    ? "           (.env.local의 STORYTELLER_DB로 지정됨)"
    : "           (기본값 — 앱을 띄운 폴더 기준)",
);

if (!existsSync(path)) {
  console.log("\n이 파일이 없다. 앱을 이 폴더에서 띄운 적이 없다는 뜻이다.");
  console.log("다른 데 있는지 찾아본다:\n");
  console.log('  find ~ -name "storyteller.sqlite" -not -path "*/node_modules/*" 2>/dev/null\n');
  process.exit(1);
}

const kb = (p: string) => (existsSync(p) ? `${(statSync(p).size / 1024).toFixed(0)}KB` : "없음");
console.log(`파일       ${kb(path)}  (wal ${kb(path + "-wal")}, shm ${kb(path + "-shm")})`);
// 최근 기록은 아직 -wal 에만 있을 수 있다. 백업할 때 셋을 같이 가져가야 하는 이유다.

const db = new Database(path, { readonly: true });
const one = (sql: string) => (db.prepare(sql).get() as { c: number }).c;

try {
  console.log(`\n세션       ${one("SELECT COUNT(*) c FROM sessions")}건`);
  console.log(`  완독     ${one("SELECT COUNT(*) c FROM sessions WHERE completed_at IS NOT NULL")}건`);
  console.log(`답변       ${one("SELECT COUNT(*) c FROM answers")}건`);
  console.log(`읽은 사람  ${one("SELECT COUNT(DISTINCT user_id) c FROM sessions")}명 (익명 id 기준)`);
  console.log(`원작 클릭  ${one("SELECT COUNT(*) c FROM outbound_clicks")}건`);

  const rows = db
    .prepare(
      `SELECT w.slug, COUNT(s.id) AS n,
              SUM(CASE WHEN s.completed_at IS NOT NULL THEN 1 ELSE 0 END) AS done
         FROM works w LEFT JOIN sessions s ON s.work_id = w.id
        GROUP BY w.id ORDER BY w.id`,
    )
    .all() as { slug: string; n: number; done: number }[];
  if (rows.length) {
    console.log("\n작품별");
    for (const r of rows) console.log(`  ${r.slug.padEnd(16)} ${r.n}건 시작, ${r.done}건 완독`);
  }

  const span = db
    .prepare("SELECT MIN(started_at) a, MAX(started_at) b FROM sessions")
    .get() as { a: string | null; b: string | null };
  if (span.a) console.log(`\n첫 기록     ${span.a}\n마지막      ${span.b}`);
} catch (e) {
  console.log(`\n표를 읽지 못했다: ${(e as Error).message}`);
  console.log("스키마가 아직 안 올라간 빈 파일일 수 있다.");
}
console.log("");
