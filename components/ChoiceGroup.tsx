"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          choice_id: choiceId,
          dwell_ms: Date.now() - shownAt.current,
          complete: isLast,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(nextHref);
    } catch {
      setBusy(false);
      setSelected(picked);
    }
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
