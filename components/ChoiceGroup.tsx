"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enqueueAnswer, flushPendingAnswers } from "@/lib/pending-answers";

interface Props {
  sessionId: string;
  questionId: string;
  choices: { id: string; label: string }[];
  /** 답한 뒤 갈 곳 */
  nextHref: string;
  /** 마지막 문항이면 세션을 완료 처리한다 */
  isLast: boolean;
  picked: string | null;
}

export function ChoiceGroup({ sessionId, questionId, choices, nextHref, isLast, picked }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(picked);
  // 어느 문항에서 오래 망설이는지가 문항 품질 지표다 (spec §7)
  const shownAt = useRef<number>(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
  }, [questionId]);

  async function choose(choiceId: string) {
    if (busy) return;
    setBusy(true);
    setSelected(choiceId);

    const answer = {
      sessionId,
      question_id: questionId,
      choice_id: choiceId,
      dwell_ms: Date.now() - shownAt.current,
      complete: isLast,
    };

    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question_id: answer.question_id,
          choice_id: answer.choice_id,
          dwell_ms: answer.dwell_ms,
          complete: answer.complete,
        }),
      });
      // 서버가 거절한 답(없는 문항 등)은 큐에 넣어도 소용없다
      if (!res.ok && res.status < 500) throw new Error("rejected");
      if (!res.ok) enqueueAnswer(answer);
    } catch (e) {
      if ((e as Error).message === "rejected") {
        setBusy(false);
        setSelected(picked);
        return;
      }
      // 오프라인이다. 답은 기기에 붙잡아 두고 읽기는 계속한다 —
      // 지하철에서 연결이 끊겼다고 이야기가 멈추면 안 된다.
      enqueueAnswer(answer);
    }

    // 마지막 문항이면 결과로 가기 전에 밀린 것을 한 번 더 밀어본다
    if (isLast) await flushPendingAnswers();
    router.push(nextHref);
  }

  return (
    <div>
      {choices.map((c) => (
        <button
          key={c.id}
          className="choice"
          data-picked={selected === c.id}
          disabled={busy}
          onClick={() => choose(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
