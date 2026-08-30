/**
 * 한 사람이 여러 작품을 읽으며 쌓는 좌표 (spec §3).
 *
 * 축은 앱 공통이므로 작품이 늘어날수록 좌표가 정밀해진다. 여기서도 저장하는 건
 * 좌표가 아니라 원본 선택이다 — 완료된 세션들의 답을 그때그때 모아 계산한다.
 */
import { getDb } from "./db";
import {
  computeCoordinate,
  computeCAxis,
  C_MIN_PAIRS,
  type Coordinate,
  type ScoringRule,
  type AnswerRef,
} from "./scoring";
import type { AxisKey } from "./content-types";

export interface ReadWork {
  slug: string;
  title: string;
  session_id: string;
  completed_at: string;
}

/** 사용자가 완독한 작품들. 같은 작품을 여러 번 읽었으면 가장 최근 것만. */
export function readWorks(userId: string): ReadWork[] {
  return getDb()
    .prepare(
      `SELECT w.slug, w.title, s.id AS session_id, s.completed_at
         FROM sessions s
         JOIN works w ON w.id = s.work_id
        WHERE s.user_id = ? AND s.completed_at IS NOT NULL
          AND s.completed_at = (
            SELECT MAX(s2.completed_at) FROM sessions s2
             WHERE s2.user_id = s.user_id AND s2.work_id = s.work_id
               AND s2.completed_at IS NOT NULL
          )
        ORDER BY s.completed_at DESC`,
    )
    .all(userId) as ReadWork[];
}

/** 한 세션의 채점 규칙과 답을 DB에서 모은다. 좌표와 C가 같은 재료를 쓴다. */
function sessionRules(sessionId: string): { rules: ScoringRule[]; answers: AnswerRef[] } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.question_id, a.choice_id, q.axis, q.weight, q.pair_id, q.phase
         FROM answers a JOIN questions q ON q.id = a.question_id
        WHERE a.session_id = ?`,
    )
    .all(sessionId) as {
      question_id: string; choice_id: string; axis: AxisKey;
      weight: number; pair_id: string | null; phase: "pre" | "post" | null;
    }[];

  const rules: ScoringRule[] = [];
  const answers: AnswerRef[] = [];
  for (const r of rows) {
    rules.push({
      question_id: r.question_id,
      axis: r.axis,
      weight: r.weight,
      pair_id: r.pair_id,
      phase: r.phase,
      choices: db.prepare("SELECT id, value FROM choices WHERE question_id = ?").all(r.question_id) as
        { id: string; value: number }[],
    });
    answers.push({ question_id: r.question_id, choice_id: r.choice_id });
  }
  return { rules, answers };
}

/**
 * 작품을 넘나드는 C축 (이방인 지시서 §1-3).
 *
 * C가 측정된 작품들만 모아 계산한다 — 페어가 없는 작품은 셈에서 빠진다.
 * 작품별로 값을 낸 뒤 평균하므로, 페어가 많은 작품이 더 크게 말하지 않는다.
 */
export function accumulatedCAxis(userId: string): {
  value: number | null;
  works: number;
  pairs: number;
  changed: number;
} {
  const values: number[] = [];
  let pairs = 0;
  let changed = 0;

  for (const s of readWorks(userId)) {
    const { rules, answers } = sessionRules(s.session_id);
    const c = computeCAxis(rules, answers);
    if (c.value === null) continue;      // 페어가 둘 미만인 작품은 빠진다
    values.push(c.value);
    pairs += c.pairs.length;
    changed += c.changed;
  }

  return {
    value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    works: values.length,
    pairs,
    changed,
  };
}

/**
 * 누적 좌표.
 *
 * 작품별로 먼저 좌표를 내고 그 좌표들을 평균한다. 답을 한 통에 부어 한 번에 계산하면
 * 문항이 많은 작품이 그만큼 크게 말하게 된다 — 열 문항짜리가 들어오면 여덟 문항짜리
 * 『변신』이 밀린다. 작품은 각각 한 표씩 갖는 게 맞다.
 *
 * 좌표는 여전히 파생값이다 (spec §6). 저장하는 것은 원본 선택뿐이다.
 */
export function accumulatedCoordinate(userId: string): { coordinate: Coordinate; works: number } {
  const sessions = readWorks(userId);
  if (sessions.length === 0) return { coordinate: { A: 0, B: 0 }, works: 0 };

  const perWork: Coordinate[] = [];

  for (const s of sessions) {
    const { rules, answers } = sessionRules(s.session_id);
    if (answers.length === 0) continue;
    perWork.push(computeCoordinate(rules, answers));
  }

  if (perWork.length === 0) return { coordinate: { A: 0, B: 0 }, works: 0 };

  const mean = (pick: (c: Coordinate) => number) =>
    perWork.reduce((sum, c) => sum + pick(c), 0) / perWork.length;

  return {
    coordinate: { A: mean((c) => c.A), B: mean((c) => c.B) },
    works: perWork.length,
  };
}
