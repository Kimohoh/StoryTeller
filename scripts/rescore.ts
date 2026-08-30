/**
 * 소급 재계산 (spec §6).
 *
 * 축 가중치를 바꾼 뒤 이 스크립트를 돌리면, 기존 세션 전원의 좌표가 새 규칙으로
 * 다시 계산된다. answers에 원본 선택만 남겨둔 이유가 이것이다.
 *
 *   npm run db:rescore              -- dry-run: 유형이 바뀌는 사람 수만 보고
 *   npm run db:rescore -- --apply   -- sessions.scoring_version 갱신
 *
 * comments의 axis_x/axis_y는 건드리지 않는다. 그때 그 관점으로 쓴 글이라는
 * 맥락이 유지돼야 하므로 스냅샷은 스냅샷으로 둔다.
 */
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeCoordinate, diagnose, type ScoringRule } from "../lib/scoring";
import type { WorkBuild } from "../lib/content-types";
import { works, resolveLocale, buildPath, sourcePath } from "../lib/works";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const SLUG = argv.find((a) => !a.startsWith("-")) ?? works().works[0].slug;
const LOCALE = resolveLocale(SLUG, undefined);

const db = new Database(process.env.STORYTELLER_DB ?? join(ROOT, "data/storyteller.sqlite"));
const build: WorkBuild = JSON.parse(readFileSync(buildPath(SLUG, LOCALE), "utf8"));
const results = JSON.parse(readFileSync(sourcePath(SLUG, LOCALE, "results.json"), "utf8"));

const work = db.prepare("SELECT id, scoring_version FROM works WHERE slug = ?").get(build.slug) as
  | { id: number; scoring_version: number }
  | undefined;
if (!work) {
  console.error(`works에 ${build.slug}가 없다 — npm run db:seed 먼저`);
  process.exit(1);
}

/** 새 규칙: DB의 현재 axis/weight를 진실로 본다 */
const rules: ScoringRule[] = (
  db.prepare('SELECT id, axis, weight FROM questions WHERE work_id = ? ORDER BY "order"').all(work.id) as
    { id: string; axis: "A" | "B"; weight: number }[]
).map((q) => ({
  question_id: q.id,
  axis: q.axis,
  weight: q.weight,
  choices: db.prepare("SELECT id, value FROM choices WHERE question_id = ?").all(q.id) as
    { id: string; value: number }[],
}));

/** 옛 규칙: content json에 박혀 있던 값 */
const oldRules: ScoringRule[] = build.pages
  .filter((p) => p.question)
  .map((p) => ({
    question_id: p.question!.id,
    axis: p.question!.axis,
    weight: p.question!.weight,
    choices: p.question!.choices.map((c) => ({ id: c.id, value: c.value })),
  }));

const sessions = db
  .prepare("SELECT id, scoring_version FROM sessions WHERE work_id = ? AND completed_at IS NOT NULL")
  .all(work.id) as { id: string; scoring_version: number }[];

const getAnswers = db.prepare(
  "SELECT question_id, choice_id FROM answers WHERE session_id = ?",
);

let changed = 0;
const shift: Record<string, number> = {};

for (const s of sessions) {
  const answers = getAnswers.all(s.id) as { question_id: string; choice_id: string }[];
  const before = diagnose(computeCoordinate(oldRules, answers), build.types, results.proximity_threshold);
  const after = diagnose(computeCoordinate(rules, answers), build.types, results.proximity_threshold);
  if (before.primary.key !== after.primary.key) {
    changed++;
    const k = `${before.primary.name} → ${after.primary.name}`;
    shift[k] = (shift[k] ?? 0) + 1;
  }
}

console.log(`완료된 세션 ${sessions.length}건 중 유형이 바뀌는 사람: ${changed}명`);
for (const [k, v] of Object.entries(shift)) console.log(`  ${k}: ${v}`);

if (!APPLY) {
  console.log("\ndry-run. 반영하려면 --apply");
} else {
  const next = work.scoring_version + 1;
  db.transaction(() => {
    db.prepare("UPDATE works SET scoring_version = ? WHERE id = ?").run(next, work.id);
    db.prepare("UPDATE sessions SET scoring_version = ? WHERE work_id = ?").run(next, work.id);
  })();
  console.log(`\nscoring_version ${work.scoring_version} → ${next} 반영. content json의 값도 같이 올릴 것.`);
}
