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
 * 누적 좌표. 완독한 작품들의 답을 전부 한 통에 넣고 축별 가중평균을 낸다.
 * 작품마다 문항 수가 같으므로 지금은 작품별 가중치를 따로 두지 않는다 —
 * 문항 수가 다른 작품이 들어오면 여기서 작품별 정규화를 해야 한다.
 */
export function accumulatedCoordinate(userId: string): { coordinate: Coordinate; works: number } {
  const db = getDb();
  const sessions = readWorks(userId);
  if (sessions.length === 0) return { coordinate: { A: 0, B: 0 }, works: 0 };

  const rules: ScoringRule[] = [];
  const answers: AnswerRef[] = [];

  for (const s of sessions) {
    const rows = db
      .prepare(
        `SELECT a.question_id, a.choice_id, q.axis, q.weight
           FROM answers a JOIN questions q ON q.id = a.question_id
          WHERE a.session_id = ?`,
      )
      .all(s.session_id) as { question_id: string; choice_id: string; axis: AxisKey; weight: number }[];

    for (const r of rows) {
      const choices = db.prepare("SELECT id, value FROM choices WHERE question_id = ?").all(r.question_id) as
        { id: string; value: number }[];
      rules.push({ question_id: r.question_id, axis: r.axis, weight: r.weight, choices });
      answers.push({ question_id: r.question_id, choice_id: r.choice_id });
    }
  }

  return { coordinate: computeCoordinate(rules, answers), works: sessions.length };
}
