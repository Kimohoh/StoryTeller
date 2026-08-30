import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type {
  WorkBuild,
  ReadingPayload,
  ReadingPage,
  AxisKey,
  Phase,
  TypeSource,
} from "./content-types";
import type { ScoringRule } from "./scoring";
import { getDb } from "./db";
import { buildPath, sourcePath, resolveLocale } from "./works";
import { entry as illustrationEntry } from "./illustrations";

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

export function loadWork(slug: string, locale?: string): WorkBuild {
  const l = resolveLocale(slug, locale);
  const cacheKey = `${slug}/${l}`;
  const cached = builds.get(cacheKey);
  if (cached && process.env.NODE_ENV === "production") return cached;
  const w: WorkBuild = JSON.parse(readFileSync(buildPath(slug, l), "utf8"));
  builds.set(cacheKey, w);
  return w;
}

export function loadResults(slug: string, locale?: string): ResultsContent {
  const l = resolveLocale(slug, locale);
  const cacheKey = `${slug}/${l}`;
  const cached = results.get(cacheKey);
  if (cached && process.env.NODE_ENV === "production") return cached;
  const r: ResultsContent = JSON.parse(readFileSync(sourcePath(slug, l, "results.json"), "utf8"));
  results.set(cacheKey, r);
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
    questions: p.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
    })),
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

const FORBIDDEN = ["axis", "axes", "weight", "value", "types", "label_internal", "pair_id", "phase"];

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
    .prepare('SELECT id, axis, weight, pair_id, phase FROM questions WHERE work_id = ? ORDER BY "order"')
    .all(work.id) as {
      id: string; axis: AxisKey; weight: number; pair_id: string | null; phase: Phase | null;
    }[];
  const getChoices = db.prepare("SELECT id, value FROM choices WHERE question_id = ?");

  return qs.map((q) => ({
    question_id: q.id,
    axis: q.axis,
    weight: q.weight,
    pair_id: q.pair_id,
    phase: q.phase,
    choices: getChoices.all(q.id) as { id: string; value: number }[],
  }));
}

export function workTypes(slug: string): Record<string, TypeSource> {
  return loadWork(slug).types;
}

/* ---------- 오프라인 저장용 ---------- */

/** 이 작품 삽화의 공개 URL 전부. 버전이 박혀 있어 그림이 바뀌면 새로 받는다. */
export function workAssetUrls(slug: string): string[] {
  const work = loadWork(slug);
  const out: string[] = [];
  for (const page of work.pages) {
    if (!page.illustration_key) continue;
    const e = illustrationEntry(slug, page.illustration_key);
    if (e) out.push(`/api/illustrations/${slug}/${page.illustration_key}?v=${e.version}`);
  }
  return out;
}

/** "1.8MB"처럼 사람이 읽을 크기. 받기 전에 얼마인지는 알려줘야 한다. */
export function workAssetSize(slug: string): string {
  const work = loadWork(slug);
  let bytes = 0;
  for (const page of work.pages) {
    if (!page.illustration_key) continue;
    const e = illustrationEntry(slug, page.illustration_key);
    if (!e) continue;
    try {
      bytes += statSync(join(process.cwd(), "assets/illustrations", e.src)).size;
    } catch {
      // 파일이 없으면 크기에서 빠질 뿐, 저장 자체는 시도한다
    }
  }
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`;
}
