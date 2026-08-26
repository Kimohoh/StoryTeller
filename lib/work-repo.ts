import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  WorkBuild,
  ReadingPayload,
  ReadingPage,
  AxisKey,
  TypeSource,
} from "./content-types";
import type { ScoringRule } from "./scoring";
import { getDb } from "./db";

export interface ResultsContent {
  slug: string;
  scoring_version: number;
  proximity_threshold: number;
  types: Record<string, { name: string; draft?: boolean; paragraphs: string[] }>;
  choice_quotes: Record<string, string>;
  seed_arguments: Record<string, { draft?: boolean; body: string }>;
}

const builds = new Map<string, WorkBuild>();
const results = new Map<string, ResultsContent>();

/** slug("metamorphosis") → 콘텐츠 파일 이름("metamorphosis.ko") */
function fileFor(slug: string): string {
  return `${slug}.ko`;
}

export function loadWork(slug: string): WorkBuild {
  const cached = builds.get(slug);
  if (cached && process.env.NODE_ENV === "production") return cached;
  const w: WorkBuild = JSON.parse(
    readFileSync(join(process.cwd(), `content/.build/${fileFor(slug)}.build.json`), "utf8"),
  );
  builds.set(slug, w);
  return w;
}

export function loadResults(slug: string): ResultsContent {
  const cached = results.get(slug);
  if (cached && process.env.NODE_ENV === "production") return cached;
  const r: ResultsContent = JSON.parse(
    readFileSync(join(process.cwd(), `content/${fileFor(slug)}.results.json`), "utf8"),
  );
  results.set(slug, r);
  return r;
}

/**
 * 읽는 중 payload. axis도 weight도 여기서 빠진다 (spec §2).
 * 타입에 필드가 없으므로 실수로 흘릴 수 없고, assertNoAxisLeak()가 한 번 더 막는다.
 */
export function readingPayload(slug: string): ReadingPayload {
  const w = loadWork(slug);
  const pages: ReadingPage[] = w.pages.map((p) => ({
    no: p.no,
    title: p.title,
    illustration_key: p.illustration_key,
    body: p.body,
    question: p.question
      ? {
          id: p.question.id,
          prompt: p.question.prompt,
          choices: p.question.choices.map((c) => ({ id: c.id, label: c.label })),
        }
      : null,
  }));
  const payload: ReadingPayload = {
    slug: w.slug,
    title: w.title,
    subtitle: w.subtitle,
    scoring_version: w.scoring_version,
    pages,
  };
  assertNoAxisLeak(payload);
  return payload;
}

const FORBIDDEN = ["axis", "axes", "weight", "value", "types", "label_internal"];

/** 읽기 payload에 축 관련 키가 하나라도 있으면 개발 중에 터진다. */
export function assertNoAxisLeak(payload: unknown): void {
  const seen = JSON.stringify(payload, (key, val) => {
    if (FORBIDDEN.includes(key)) {
      throw new Error(
        `읽기 payload에 "${key}"가 들어 있다. 축은 결과 화면에서 처음 등장해야 한다 (spec §2).`,
      );
    }
    return val;
  });
  if (!seen) throw new Error("빈 payload");
}

/** 채점 규칙의 진실은 DB다. 튜닝이 배포가 아니라 데이터 수정이 되도록 (spec §7). */
export function scoringRules(slug: string): ScoringRule[] {
  const db = getDb();
  const work = db.prepare("SELECT id FROM works WHERE slug = ?").get(slug) as
    | { id: number }
    | undefined;
  if (!work) throw new Error(`works에 ${slug} 없음 — npm run db:seed`);

  const qs = db
    .prepare('SELECT id, axis, weight FROM questions WHERE work_id = ? ORDER BY "order"')
    .all(work.id) as { id: string; axis: AxisKey; weight: number }[];
  const getChoices = db.prepare("SELECT id, value FROM choices WHERE question_id = ?");

  return qs.map((q) => ({
    question_id: q.id,
    axis: q.axis,
    weight: q.weight,
    choices: getChoices.all(q.id) as { id: string; value: number }[],
  }));
}

export function workTypes(slug: string): Record<string, TypeSource> {
  return loadWork(slug).types;
}
