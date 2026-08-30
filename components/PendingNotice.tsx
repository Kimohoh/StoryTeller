"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pendingCount, flushPendingAnswers } from "@/lib/pending-answers";

/**
 * 결과가 아직 안 나오는 이유가 "덜 읽어서"인지 "답이 아직 안 도착해서"인지는
 * 사람에게 전혀 다른 사건이다. 후자면 그렇게 말하고 다시 보낸다.
 */
export function PendingNotice({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setPending(pendingCount(sessionId));
  }, [sessionId]);

  if (!pending) return null;

  async function retry() {
    setSending(true);
    const left = await flushPendingAnswers();
    setPending(left);
    setSending(false);
    if (left === 0) router.refresh();
  }

  return (
    <div className="pending">
      <p>
        오프라인에서 답한 {pending}개가 아직 서버에 도착하지 않았습니다.
        이 기기에 남아 있으니 사라지지는 않습니다.
      </p>
      <button className="next" onClick={retry} disabled={sending} type="button">
        {sending ? "보내는 중" : "지금 보내기"}
      </button>
    </div>
  );
}
