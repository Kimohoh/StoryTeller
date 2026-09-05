"use client";

import { useState } from "react";
import Link from "next/link";
import { AccumPlot } from "@/components/AccumPlot";
import type { QuickQuestion } from "@/lib/quick";
import type { Character } from "@/lib/characters";
import type { AxisSource, AxisKey } from "@/lib/content-types";

interface Answer {
  a: number;
  b: number;
  axes: Record<AxisKey, AxisSource>;
  characters: Character[];
  shownWorks: string[];
  near: { name: string; note: string } | null;
}

interface Props {
  questions: QuickQuestion[];
  /** 여기서 한 편을 읽으러 보낸다. 가장 짧은 작품이 열린다. */
  firstWork: { slug: string; title: string; pages: number };
}

export function QuickFlow({ questions, firstWork }: Props) {
  const [picks, setPicks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [failed, setFailed] = useState(false);

  const at = picks.length;
  const q = questions[at];

  async function choose(choiceId: string) {
    if (busy) return;
    const next = [...picks, choiceId];
    setPicks(next);
    if (next.length < questions.length) return;

    setBusy(true);
    try {
      const res = await fetch("/api/quick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ picks: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setResult((await res.json()) as Answer);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (failed) {
    return (
      <p className="note">
        자리를 내지 못했습니다. 잠시 뒤 다시 해보시거나,{" "}
        <Link href={`/w/${firstWork.slug}`}>한 편을 바로 읽어보세요</Link>.
      </p>
    );
  }

  if (result) {
    return (
      <>
        <AccumPlot
          coordinate={{ A: result.a, B: result.b }}
          axes={result.axes}
          c={null}
          characters={result.characters}
          readSlugs={result.shownWorks}
        />

        {result.near ? (
          <p className="neighbours">
            <span className="neighbours-label">지금 서 있는 곳</span>
            <b>{result.near.name}</b> 쪽에 가깝습니다.
            <br />
            <span className="neighbours-why">
              {result.near.name} — {result.near.note}
            </span>
          </p>
        ) : null}

        {/* 정밀한 척하지 않는 것이 이 자리의 정직함이다. 네 번 물어 찍은 점이다. */}
        <p className="note">
          네 번 물어 찍은 자리라 아직 흐립니다. 한 편을 끝까지 읽으면 열 번 넘게
          묻고, 그때 이 점이 또렷해집니다. 이름 없는 점들에도 이름이 붙습니다.
        </p>

        <Link className="next" href={`/w/${firstWork.slug}`}>
          『{firstWork.title}』 읽기 · {firstWork.pages}장
        </Link>
        <p className="quick-alt">
          <Link href="/">다른 작품도 보기</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="progress" aria-label={`${at + 1} / ${questions.length}`}>
        {questions.map((x, i) => (
          <i key={x.id} data-done={i <= at} />
        ))}
      </div>

      <section className="quick-q">
        <p className="quick-scene">{q.scene}</p>
        <p className="prompt">{q.prompt}</p>
        {q.choices.map((c) => (
          <button
            key={c.id}
            className="choice"
            disabled={busy}
            onClick={() => choose(c.id)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </section>
    </>
  );
}
