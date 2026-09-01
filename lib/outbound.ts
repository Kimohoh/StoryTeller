/**
 * 밖으로 나간 클릭 세기.
 *
 * 개인을 따라다니지 않는다 — 무엇을 눌렀는지와 언제인지만 남긴다.
 * session_id는 "완독 몇 건 중 몇 건이 나갔나"를 세기 위한 것이고, 없을 수 있다.
 */
import { getDb } from "./db";

export function recordOutboundClick(
  slug: string,
  target: string,
  sessionId: string | null,
): void {
  try {
    getDb()
      .prepare(
        "INSERT INTO outbound_clicks (slug, target, session_id, clicked_at) VALUES (?, ?, ?, ?)",
      )
      .run(slug, target, sessionId, new Date().toISOString());
  } catch {
    // 집계 실패가 바깥으로 나가는 길을 막아서는 안 된다
  }
}

export interface OutboundStat {
  clicks: number;
  /** 서로 다른 세션에서 나간 수. 같은 사람이 여러 번 눌러도 하나로 센다. */
  sessions: number;
}

export function outboundStat(slug: string, target: string): OutboundStat {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS clicks, COUNT(DISTINCT session_id) AS sessions
         FROM outbound_clicks WHERE slug = ? AND target = ?`,
    )
    .get(slug, target) as { clicks: number; sessions: number };
  return { clicks: row?.clicks ?? 0, sessions: row?.sessions ?? 0 };
}
