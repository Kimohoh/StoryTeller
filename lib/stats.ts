/**
 * 테스트 데이터를 읽는 쪽.
 *
 * 여기 있는 숫자들이 다음 작품의 설계를 정한다. 특히 문항별 망설임 시간은
 * spec §7이 말한 문항 품질 지표다 — 3초 만에 넘어가는 문항은 축을 못 재고 있는 것이다.
 * 좌표는 여기서도 저장하지 않고 그때그때 계산한다 (spec §6).
 */
import { getDb, DB_PATH } from "./db";
import { computeCoordinate, diagnose, type ScoringRule } from "./scoring";
import { outboundStat } from "./outbound";
import { loadWork, loadResults, scoringRules } from "./work-repo";
import type { AxisKey } from "./content-types";

/** 이 아래로 내려가면 문항이 아니라 통과 의례가 된 것이다 */
export const DWELL_FLOOR_MS = 3000;

export interface QuestionStat {
  id: string;
  page_no: number;
  axis: AxisKey;
  weight: number;
  prompt: string;
  answered: number;
  median_dwell_ms: number | null;
  /** 첫 번째 선택지(value +1)를 고른 비율 */
  pos_ratio: number | null;
  choices: { id: string; label: string; count: number }[];
  /** 망설임이 바닥이면 축을 못 재고 있다는 신호 */
  suspicious: boolean;
}

export interface WorkStats {
  slug: string;
  title: string;
  pages: number;
  started: number;
  completed: number;
  completion_rate: number | null;
  /** 미완독 세션이 마지막으로 답한 페이지 → 인원 */
  dropoff: { page_no: number; count: number }[];
  questions: QuestionStat[];
  types: { key: string; name: string; count: number; ratio: number }[];
  /** 완독 세션의 좌표 — 흩어짐을 눈으로 본다 */
  coordinates: { A: number; B: number }[];
  /**
   * 결과 화면에서 원작을 보러 나간 수. 완독 대비 비율이 이 앱이 가진
   * 유일한 협상 재료다 (docs/bm.md).
   */
  original: { clicks: number; sessions: number; rate: number | null };
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/**
 * 지금 앱이 어느 파일을 보고 있고 거기 전부 몇 건이 들었는지.
 *
 * 작품별 숫자가 0인데 여기 총계가 크면 작품 연결이 어긋난 것이고,
 * 여기까지 0이면 다른 파일을 보고 있는 것이다. 둘을 구분하려고 둔다.
 */
export function dbInfo(): { path: string; sessions: number; answers: number; users: number } {
  const db = getDb();
  const c = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  return {
    path: DB_PATH,
    sessions: c("SELECT COUNT(*) c FROM sessions"),
    answers: c("SELECT COUNT(*) c FROM answers"),
    users: c("SELECT COUNT(DISTINCT user_id) c FROM sessions"),
  };
}

export function workStats(slug: string): WorkStats {
  const db = getDb();
  const work = loadWork(slug);
  const results = loadResults(slug);
  const rules: ScoringRule[] = scoringRules(slug);

  const row = db.prepare("SELECT id FROM works WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (!row) throw new Error(`works에 ${slug} 없음`);

  const started = (db.prepare("SELECT COUNT(*) c FROM sessions WHERE work_id = ?").get(row.id) as { c: number }).c;
  const completed = (
    db.prepare("SELECT COUNT(*) c FROM sessions WHERE work_id = ? AND completed_at IS NOT NULL").get(row.id) as { c: number }
  ).c;

  // 어디서 그만두는가 — 미완독 세션이 마지막으로 답한 페이지
  const dropoff = db
    .prepare(
      `SELECT last_page AS page_no, COUNT(*) AS count FROM (
         SELECT s.id, COALESCE(MAX(q.page_no), 0) AS last_page
           FROM sessions s
           LEFT JOIN answers a ON a.session_id = s.id
           LEFT JOIN questions q ON q.id = a.question_id
          WHERE s.work_id = ? AND s.completed_at IS NULL
          GROUP BY s.id
       ) GROUP BY last_page ORDER BY last_page`,
    )
    .all(row.id) as { page_no: number; count: number }[];

  const questions: QuestionStat[] = [];
  for (const page of work.pages) {
    for (const q of page.questions) {
    const answers = db
      .prepare(
        `SELECT a.choice_id, a.dwell_ms
           FROM answers a JOIN sessions s ON s.id = a.session_id
          WHERE a.question_id = ? AND s.work_id = ?`,
      )
      .all(q.id, row.id) as { choice_id: string; dwell_ms: number | null }[];

    const dwells = answers.map((a) => a.dwell_ms).filter((d): d is number => typeof d === "number");
    const counts = new Map(q.choices.map((c) => [c.id, 0]));
    for (const a of answers) counts.set(a.choice_id, (counts.get(a.choice_id) ?? 0) + 1);

    const pos = q.choices.find((c) => c.value > 0);
    const med = median(dwells);

    questions.push({
      id: q.id,
      page_no: page.no,
      axis: q.axis,
      weight: q.weight,
      prompt: q.prompt,
      answered: answers.length,
      median_dwell_ms: med,
      pos_ratio: answers.length && pos ? (counts.get(pos.id) ?? 0) / answers.length : null,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id) ?? 0 })),
      // 표본이 너무 적으면 아직 아무 말도 할 수 없다
      suspicious: answers.length >= 5 && med !== null && med < DWELL_FLOOR_MS,
    });
    }
  }

  // 유형 분포 — 완독 세션마다 좌표를 내서 센다
  const done = db
    .prepare("SELECT id FROM sessions WHERE work_id = ? AND completed_at IS NOT NULL")
    .all(row.id) as { id: string }[];
  const getAnswers = db.prepare("SELECT question_id, choice_id FROM answers WHERE session_id = ?");
  const typeCount = new Map<string, number>();
  const coordinates: { A: number; B: number }[] = [];

  for (const s of done) {
    const co = computeCoordinate(rules, getAnswers.all(s.id) as { question_id: string; choice_id: string }[]);
    coordinates.push(co);
    const v = diagnose(co, work.types, results.proximity_threshold);
    typeCount.set(v.primary.key, (typeCount.get(v.primary.key) ?? 0) + 1);
  }

  const out = outboundStat(slug, "original");

  return {
    slug,
    title: work.title,
    pages: work.pages.length,
    started,
    completed,
    completion_rate: started ? completed / started : null,
    dropoff,
    questions,
    types: Object.entries(work.types).map(([key, t]) => ({
      key,
      name: t.name,
      count: typeCount.get(key) ?? 0,
      ratio: done.length ? (typeCount.get(key) ?? 0) / done.length : 0,
    })),
    coordinates,
    original: {
      ...out,
      rate: completed ? out.sessions / completed : null,
    },
  };
}
