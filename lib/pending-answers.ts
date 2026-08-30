/**
 * 오프라인에서 답한 것을 기기에 붙잡아 뒀다가 나중에 보낸다.
 *
 * 지하철에서 읽다 연결이 끊겼다고 답이 사라지면 안 된다. Background Sync는
 * iOS에 없으므로 기대지 않고, 앱이 다시 뜰 때와 online 이벤트에서 직접 흘려보낸다.
 *
 * 서버가 진실이라는 원칙은 그대로다 — 여기 있는 건 아직 도착하지 못한 편지다.
 */
const KEY = "storyteller.pending-answers.v1";

export interface PendingAnswer {
  sessionId: string;
  question_id: string;
  choice_id: string;
  dwell_ms: number;
  complete: boolean;
  queuedAt: string;
}

function read(): PendingAnswer[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: PendingAnswer[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 저장이 안 되는 환경이면 이번 답은 잃는다. 읽기는 계속돼야 한다.
  }
}

export function enqueueAnswer(a: Omit<PendingAnswer, "queuedAt">): void {
  // 같은 문항을 다시 답했으면 마지막 것만 남긴다
  const rest = read().filter(
    (x) => !(x.sessionId === a.sessionId && x.question_id === a.question_id),
  );
  rest.push({ ...a, queuedAt: new Date().toISOString() });
  write(rest);
}

export function pendingCount(sessionId?: string): number {
  const all = read();
  return sessionId ? all.filter((x) => x.sessionId === sessionId).length : all.length;
}

/**
 * 밀린 답변을 순서대로 보낸다. 하나라도 실패하면 거기서 멈추고 나머지는 남긴다 —
 * 순서가 흐트러지면 answered_at이 실제 읽은 순서를 못 말하게 된다.
 * @returns 남은 개수
 */
export async function flushPendingAnswers(): Promise<number> {
  const queue = read();
  if (queue.length === 0) return 0;

  const remaining = [...queue];
  while (remaining.length > 0) {
    const a = remaining[0];
    try {
      const res = await fetch(`/api/sessions/${a.sessionId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question_id: a.question_id,
          choice_id: a.choice_id,
          dwell_ms: a.dwell_ms,
          complete: a.complete,
        }),
      });
      // 400·404는 다시 보내도 안 된다 — 세션이 사라졌거나 없는 문항이다
      if (!res.ok && res.status < 500) {
        remaining.shift();
        continue;
      }
      if (!res.ok) break;
      remaining.shift();
    } catch {
      break; // 아직 오프라인이다
    }
  }

  write(remaining);
  return remaining.length;
}
