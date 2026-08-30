/**
 * 서버가 뜰 때 DB를 콘텐츠와 맞춘다.
 *
 * 배포 컨테이너에는 tsx도 스크립트도 없으므로 시드를 앱이 직접 한다. upsert라
 * 여러 번 돌아도 안전하고, 배포할 때마다 문항·축·가중치가 콘텐츠와 같아진다.
 *
 * 주의: DB에서 직접 튜닝한 axis/weight는 다음 배포에서 콘텐츠 값으로 되돌아간다.
 * 튜닝 결과는 반드시 content json에도 반영해 둘 것 (scripts/seed.ts와 같은 규칙).
 */
import Database from "better-sqlite3";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { WorkBuild } from "./content-types";
import { works, resolveLocale, buildPath } from "./works";

export function bootstrap(db: Database.Database): void {
  const upsertWork = db.prepare(`
    INSERT INTO works (slug, title, scoring_version, axes)
    VALUES (@slug, @title, @scoring_version, @axes)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      scoring_version = excluded.scoring_version,
      axes = excluded.axes
  `);
  const upsertQuestion = db.prepare(`
    INSERT INTO questions (id, work_id, page_no, "order", axis, weight)
    VALUES (@id, @work_id, @page_no, @order, @axis, @weight)
    ON CONFLICT(id) DO UPDATE SET
      page_no = excluded.page_no, "order" = excluded."order",
      axis = excluded.axis, weight = excluded.weight
  `);
  const upsertChoice = db.prepare(`
    INSERT INTO choices (id, question_id, label, value)
    VALUES (@id, @question_id, @label, @value)
    ON CONFLICT(id) DO UPDATE SET label = excluded.label, value = excluded.value
  `);

  const seedOne = db.transaction((work: WorkBuild) => {
    upsertWork.run({
      slug: work.slug,
      title: work.title,
      scoring_version: work.scoring_version,
      axes: JSON.stringify(work.axes),
    });
    const workId = (db.prepare("SELECT id FROM works WHERE slug = ?").get(work.slug) as { id: number }).id;

    let order = 0;
    for (const page of work.pages) {
      if (!page.question) continue;
      const q = page.question;
      upsertQuestion.run({
        id: q.id, work_id: workId, page_no: page.no,
        order: order++, axis: q.axis, weight: q.weight,
      });
      for (const c of q.choices) {
        upsertChoice.run({ id: c.id, question_id: q.id, label: c.label, value: c.value });
      }
    }
  });

  for (const entry of works().works) {
    for (const locale of entry.locales) {
      const path = buildPath(entry.slug, resolveLocale(entry.slug, locale));
      if (!existsSync(path)) {
        console.warn(`[bootstrap] ${path} 없음 — 이 작품은 건너뛴다`);
        continue;
      }
      seedOne(JSON.parse(readFileSync(path, "utf8")) as WorkBuild);
    }
  }
}
