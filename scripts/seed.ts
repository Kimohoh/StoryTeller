/**
 * content/.build/*.build.json → SQLite.
 *
 * json은 시드 소스이고, 시드된 뒤로는 DB가 진실이다. questions.axis / weight를
 * DB에서 고치면 배포 없이 채점이 바뀐다 (spec §7). 다시 seed를 돌리면 json 값으로
 * 되돌아가므로, 튜닝 결과는 반드시 content json에도 반영해 둘 것.
 */
import Database from "better-sqlite3";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkBuild } from "../lib/content-types";
import { works, resolveLocale, buildPath } from "../lib/works";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(ROOT, "data"), { recursive: true });
const db = new Database(process.env.STORYTELLER_DB ?? join(ROOT, "data/storyteller.sqlite"));
db.exec(readFileSync(join(ROOT, "db/schema.sql"), "utf8"));

const upsertWork = db.prepare(`
  INSERT INTO works (slug, title, scoring_version, axes)
  VALUES (@slug, @title, @scoring_version, @axes)
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    scoring_version = excluded.scoring_version,
    axes = excluded.axes
`);
const upsertQuestion = db.prepare(`
  INSERT INTO questions (id, work_id, page_no, "order", axis, weight, pair_id, phase)
  VALUES (@id, @work_id, @page_no, @order, @axis, @weight, @pair_id, @phase)
  ON CONFLICT(id) DO UPDATE SET
    page_no = excluded.page_no, "order" = excluded."order",
    axis = excluded.axis, weight = excluded.weight,
    pair_id = excluded.pair_id, phase = excluded.phase
`);
const upsertChoice = db.prepare(`
  INSERT INTO choices (id, question_id, label, value)
  VALUES (@id, @question_id, @label, @value)
  ON CONFLICT(id) DO UPDATE SET label = excluded.label, value = excluded.value
`);

const seed = db.transaction((work: WorkBuild) => {
  upsertWork.run({
    slug: work.slug,
    title: work.title,
    scoring_version: work.scoring_version,
    axes: JSON.stringify(work.axes),
  });
  const workId = (
    db.prepare("SELECT id FROM works WHERE slug = ?").get(work.slug) as { id: number }
  ).id;

  let order = 0;
  for (const page of work.pages) {
    for (const q of page.questions) {
      upsertQuestion.run({
        id: q.id, work_id: workId, page_no: page.no, order: order++,
        axis: q.axis, weight: q.weight,
        pair_id: q.pair_id ?? null, phase: q.phase ?? null,
      });
      for (const c of q.choices) {
        upsertChoice.run({ id: c.id, question_id: q.id, label: c.label, value: c.value });
      }
    }
  }
  return { workId, questions: order };
});

for (const entry of works().works) {
  for (const locale of entry.locales) {
    const path = buildPath(entry.slug, resolveLocale(entry.slug, locale));
    if (!existsSync(path)) {
      console.error(`${path} 없음 — npm run content:build 먼저 실행할 것`);
      process.exit(1);
    }
    const work: WorkBuild = JSON.parse(readFileSync(path, "utf8"));
    const { workId, questions } = seed(work);
    console.log(
      `${work.slug}/${work.locale}: work #${workId}, 문항 ${questions}개 시드 완료 (scoring_version ${work.scoring_version})`,
    );
  }
}
