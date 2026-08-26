import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import type { AnswerRef } from "./scoring";

export interface SessionRow {
  id: string;
  work_id: number;
  user_id: string;
  scoring_version: number;
  started_at: string;
  completed_at: string | null;
}

export function createSession(slug: string, userId: string): SessionRow {
  const db = getDb();
  const work = db
    .prepare("SELECT id, scoring_version FROM works WHERE slug = ?")
    .get(slug) as { id: number; scoring_version: number } | undefined;
  if (!work) throw new Error(`works에 ${slug} 없음 — npm run db:seed`);

  const row: SessionRow = {
    id: randomUUID(),
    work_id: work.id,
    user_id: userId,
    scoring_version: work.scoring_version,
    started_at: new Date().toISOString(),
    completed_at: null,
  };
  db.prepare(
    `INSERT INTO sessions (id, work_id, user_id, scoring_version, started_at)
     VALUES (@id, @work_id, @user_id, @scoring_version, @started_at)`,
  ).run(row);
  return row;
}

export function getSession(id: string): SessionRow | null {
  return (getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow) ?? null;
}

/**
 * 저장하는 건 좌표가 아니라 원본 선택이다 (spec §6).
 * dwell_ms는 문항 품질 지표 — 3초 만에 넘어가는 문항은 축을 못 재고 있는 것이다.
 */
export function recordAnswer(
  sessionId: string,
  questionId: string,
  choiceId: string,
  dwellMs: number | null,
): void {
  getDb()
    .prepare(
      `INSERT INTO answers (session_id, question_id, choice_id, answered_at, dwell_ms)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id, question_id) DO UPDATE SET
         choice_id = excluded.choice_id,
         answered_at = excluded.answered_at,
         dwell_ms = excluded.dwell_ms`,
    )
    .run(sessionId, questionId, choiceId, new Date().toISOString(), dwellMs);
}

export function getAnswers(sessionId: string): AnswerRef[] {
  return getDb()
    .prepare("SELECT question_id, choice_id, dwell_ms FROM answers WHERE session_id = ?")
    .all(sessionId) as AnswerRef[];
}

export function completeSession(sessionId: string): void {
  getDb()
    .prepare("UPDATE sessions SET completed_at = ? WHERE id = ? AND completed_at IS NULL")
    .run(new Date().toISOString(), sessionId);
}
