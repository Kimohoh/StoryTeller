/**
 * 한 사람이 여러 작품을 읽으며 쌓는 좌표 (spec §3).
 *
 * 축은 앱 공통이므로 작품이 늘어날수록 좌표가 정밀해진다. 여기서도 저장하는 건
 * 좌표가 아니라 원본 선택이다 — 완료된 세션들의 답을 그때그때 모아 계산한다.
 */
import { getDb } from "./db";
import { computeCoordinate, type Coordinate, type ScoringRule, type AnswerRef } from "./scoring";
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
  const db = getDb();
  const sessions = readWorks(userId);
  if (sessions.length === 0) return { coordinate: { A: 0, B: 0 }, works: 0 };

  const perWork: Coordinate[] = [];

  for (const s of sessions) {
    const rows = db
      .prepare(
        `SELECT a.question_id, a.choice_id, q.axis, q.weight
           FROM answers a JOIN questions q ON q.id = a.question_id
          WHERE a.session_id = ?`,
      )
      .all(s.session_id) as { question_id: string; choice_id: string; axis: AxisKey; weight: number }[];
    if (rows.length === 0) continue;

    const rules: ScoringRule[] = [];
    const answers: AnswerRef[] = [];
    for (const r of rows) {
      const choices = db.prepare("SELECT id, value FROM choices WHERE question_id = ?").all(r.question_id) as
        { id: string; value: number }[];
      rules.push({ question_id: r.question_id, axis: r.axis, weight: r.weight, choices });
      answers.push({ question_id: r.question_id, choice_id: r.choice_id });
    }
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
