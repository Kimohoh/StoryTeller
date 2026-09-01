"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { enqueueAnswer, flushPendingAnswers } from "@/lib/pending-answers";

export interface BlockQuestion {
  id: string;
  prompt: string;
  choices: { id: string; label: string }[];
}

interface Props {
  sessionId: string;
  /** 이 페이지의 문항들. 보통 하나지만 장면에 따라 둘이 올 수 있다. */
  questions: BlockQuestion[];
  /** 이미 답한 것 — 뒤로 갔다 와도 그대로 보인다 */
  picked: Record<string, string>;
  nextHref: string;
  /** 작품 전체의 마지막 문항. 이걸 답하면 세션이 완료된다. */
  lastQuestionId: string | null;
  /**
   * 마지막 장이라 답을 고르자마자 결과로 튕기면 안 되는 경우.
   * 답한 뒤 버튼을 띄워, 결과로 넘어가는 걸음은 읽는 사람이 직접 딛게 한다.
   */
  hold?: boolean;
  /** hold일 때 띄우는 버튼 문구 */
  holdLabel?: string;
}

export function QuestionBlock({
  sessionId,
  questions,
  picked,
  nextHref,
  lastQuestionId,
  hold = false,
  holdLabel = "나의 위치 찾기",
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(picked);
  const [busy, setBusy] = useState(false);
  // 어느 문항에서 오래 망설이는지가 문항 품질 지표다 (spec §7)
  const shownAt = useRef(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
    setAnswers(picked);
  }, [questions, picked]);

  async function send(questionId: string, choiceId: string) {
    const answer = {
      sessionId,
      question_id: questionId,
      choice_id: choiceId,
      dwell_ms: Date.now() - shownAt.current,
      complete: questionId === lastQuestionId,
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
      if (!res.ok && res.status < 500) return false;
      if (!res.ok) enqueueAnswer(answer);
    } catch {
      // 오프라인이다. 답은 기기에 붙잡아 두고 읽기는 계속한다 —
      // 지하철에서 연결이 끊겼다고 이야기가 멈추면 안 된다.
      enqueueAnswer(answer);
    }
    return true;
  }

  async function choose(questionId: string, choiceId: string) {
    if (busy) return;
    setBusy(true);

    const next = { ...answers, [questionId]: choiceId };
    setAnswers(next);

    const ok = await send(questionId, choiceId);
    if (!ok) {
      setAnswers(answers);
      setBusy(false);
      return;
    }

    // 이 페이지의 문항을 다 답해야 넘어간다
    const allAnswered = questions.every((q) => next[q.id]);
    if (!allAnswered) {
      shownAt.current = Date.now();
      setBusy(false);
      return;
    }

    if (questions.some((q) => q.id === lastQuestionId)) await flushPendingAnswers();
    // 마지막 장에서는 스스로 튀어나가지 않는다. 버튼이 뜨고, 누르는 건 읽은 사람이다.
    if (hold) {
      setBusy(false);
      return;
    }
    setTimeout(() => router.push(nextHref), 260);
  }

  return (
    <>
      {questions.map((q, i) => (
        // 페어로 묶인 문항이라도 UI에서 연결지어 보여주지 않는다 (이방인 지시서 §1-5)
        <section className="question" key={q.id} data-nth={i}>
          <p className="prompt">{q.prompt}</p>
          {q.choices.map((c) => (
            <button
              key={c.id}
              className={`choice${answers[q.id] === c.id ? " picked" : ""}`}
              disabled={busy}
              onClick={() => choose(q.id, c.id)}
              type="button"
            >
              {c.label}
            </button>
          ))}
        </section>
      ))}
      {hold && questions.every((q) => answers[q.id]) ? (
        <Link className="next" href={nextHref}>
          {holdLabel}
        </Link>
      ) : null}
    </>
  );
}
