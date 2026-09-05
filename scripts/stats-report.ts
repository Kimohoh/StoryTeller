/**
 * /admin의 숫자를 붙여넣기 좋은 글로 뽑는다.
 *
 *   npm run stats
 *   npm run stats -- the-necklace     한 작품만
 *
 * 화면은 사람이 보라고 만든 것이라 스크롤이 길고, 캡처로는 숫자가 안 읽힌다.
 * 여기서는 판단에 필요한 것만 압축한다 — 완독률, 어디서 그만두는지, 어느
 * 문항이 축을 못 재고 있는지, 유형이 한쪽으로 쏠렸는지.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "../lib/env-file";

loadEnvLocal(join(dirname(fileURLToPath(import.meta.url)), ".."));

const { works } = await import("../lib/works");
const { workStats, dbInfo, DWELL_FLOOR_MS } = await import("../lib/stats");
const { getDb } = await import("../lib/db");

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);
const secs = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}초`);

const db = dbInfo();
console.log(`\n고독 읽기 기록 — ${new Date().toISOString().slice(0, 10)}`);
console.log(`전체 ${db.sessions}건 읽기 · ${db.answers}건 답 · ${db.users}명\n`);

for (const entry of works().works) {
  if (only.length && !only.includes(entry.slug)) continue;
  let s;
  try {
    s = workStats(entry.slug);
  } catch {
    continue; // 아직 시드되지 않은 작품
  }

  console.log("─".repeat(58));
  console.log(`${s.title}  (${entry.slug}, ${s.pages}장, ${entry.status})`);
  console.log(
    `시작 ${s.started} · 완독 ${s.completed} · 완독률 ${pct(s.completion_rate)}` +
      ` · 원작 클릭 ${s.original.clicks}건 ${pct(s.original.rate)}`,
  );

  if (s.dropoff.length) {
    // 0장은 표지만 보고 나간 사람이다. 읽기 안에서의 이탈과 구분해서 본다.
    const line = s.dropoff.map((d) => `${d.page_no === 0 ? "표지" : d.page_no + "장"} ${d.count}`).join(" · ");
    console.log(`이탈  ${line}`);
  }

  if (s.completed > 0) {
    console.log(
      `유형  ` + s.types.map((t) => `${t.name} ${t.count}(${pct(t.ratio)})`).join(" · "),
    );
  }

  console.log(`\n  ${"문항".padEnd(4)} 축  답  머문시간   첫선지  문항`);
  for (const q of s.questions) {
    const flag = q.suspicious ? "⚠" : " ";
    const skew =
      q.pos_ratio === null ? "  —" : `${String(Math.round(q.pos_ratio * 100)).padStart(3)}%`;
    // 90:10을 넘게 쏠린 문항은 선지 하나가 사실상 안 눌린 것이다
    const lopsided = q.pos_ratio !== null && (q.pos_ratio >= 0.9 || q.pos_ratio <= 0.1) ? " ◀쏠림" : "";
    console.log(
      `  ${q.page_no}장${flag} ${q.axis}  ${String(q.answered).padStart(2)}  ` +
        `${secs(q.median_dwell_ms).padStart(6)}  ${skew}   ${q.prompt.slice(0, 26)}${lopsided}`,
    );
  }
  // C 페어가 실제로 재고 있는가.
  //
  // C는 전·후 답이 달라졌는지로 잰다. 그런데 post 문항을 안 읽고 넘기면 앞과
  // 같은 답이 눌리고, 그건 '판단을 지켰다'로 기록된다 — 재지 못한 것이 측정값이
  // 되는 것이다. post 체류가 pre보다 확 짧으면 그 페어를 의심해야 한다.
  // 한 장에 C 문항이 둘 올 수 있으므로(『목걸이』 6장) 장 번호가 아니라
  // 문항 id로 짝을 집는다.
  const pairs = getDb()
    .prepare(
      `SELECT q.pair_id,
              MAX(CASE WHEN q.phase='pre'  THEN q.id END) AS pre_id,
              MAX(CASE WHEN q.phase='post' THEN q.id END) AS post_id
         FROM questions q JOIN works w ON w.id = q.work_id
        WHERE w.slug = ? AND q.axis = 'C'
        GROUP BY q.pair_id ORDER BY q.pair_id`,
    )
    .all(entry.slug) as { pair_id: string; pre_id: string | null; post_id: string | null }[];

  const changedRow = getDb().prepare(
    `SELECT SUM(CASE WHEN c1.value <> c2.value THEN 1 ELSE 0 END) AS changed,
            COUNT(*) AS both
       FROM answers a1
       JOIN answers a2 ON a2.session_id = a1.session_id
       JOIN choices c1 ON c1.id = a1.choice_id
       JOIN choices c2 ON c2.id = a2.choice_id
      WHERE a1.question_id = ? AND a2.question_id = ?`,
  );

  const lines: string[] = [];
  for (const p of pairs) {
    if (!p.pre_id || !p.post_id) continue;
    const pre = s.questions.find((q) => q.id === p.pre_id);
    const post = s.questions.find((q) => q.id === p.post_id);
    if (!pre || !post) continue;
    const row = changedRow.get(p.pre_id, p.post_id) as { changed: number | null; both: number };
    const ratio =
      post.median_dwell_ms && pre.median_dwell_ms ? post.median_dwell_ms / pre.median_dwell_ms : null;
    // post를 pre의 절반도 안 보고 넘겼으면 그 페어의 값은 믿기 어렵다
    const weak = ratio !== null && ratio < 0.5;
    lines.push(
      `    ${p.pair_id}  ${pre.page_no}장→${post.page_no}장   ` +
        `머문시간 ${secs(pre.median_dwell_ms)}→${secs(post.median_dwell_ms)}` +
        (ratio !== null ? ` (${Math.round(ratio * 100)}%)` : "") +
        `   ${row.both}명 중 ${row.changed ?? 0}명 고침` +
        (weak ? "   ◀post를 안 읽고 넘긴다" : ""),
    );
  }
  if (lines.length) {
    console.log("  C 페어");
    for (const l of lines) console.log(l);
  }

  console.log("");
}

console.log("─".repeat(58));
console.log(`⚠ = 머문 시간 ${DWELL_FLOOR_MS / 1000}초 미만. 읽지 않고 넘긴 문항이다.`);
console.log(`첫선지 = 첫 번째 선택지를 고른 비율. 50%에서 멀수록 한쪽으로 쏠린 것이다.`);
console.log(`C 페어의 post 체류가 pre의 절반 아래면 그 축은 재지 못한 값을 담고 있다.\n`);
