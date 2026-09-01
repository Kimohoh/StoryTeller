"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { saveLocalResult } from "@/lib/local-results";

interface Props {
  slug: string;
  title: string;
  sessionId: string;
  type: string;
  coordinate: { A: number; B: number };
  completedAt: string;
  /**
   * 공유 링크에 쓸 고정 주소 (APP_ORIGIN). 비어 있으면 지금 보고 있는 주소를 쓴다.
   * 터널 주소는 켤 때마다 바뀌므로, 도메인이 생기면 여기에 넣어야 그때 공유된
   * 링크가 나중에도 산다.
   */
  origin?: string;
}

/**
 * 결과 화면에서 나가는 세 갈래.
 *
 * 표지의 진입 버튼과 같은 형태로 맞춘다 — 작은 링크가 흩어져 있으면 어디로
 * 갈 수 있는지가 안 읽힌다. 공유 링크는 결과 URL 그대로이고, 받은 사람이
 * 열면 같은 진단문을 본다.
 */
export function ResultActions(props: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const { slug, title, sessionId, type, coordinate, completedAt } = props;
    saveLocalResult({ slug, title, sessionId, type, coordinate, completedAt });
  }, [props]);

  async function share() {
    const base = (props.origin || window.location.origin).replace(/\/$/, "");
    const url = `${base}/result/${props.sessionId}`;
    const text = `나는 ${props.type}에 가까웠습니다 — ${props.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: props.title, text, url });
        return;
      } catch {
        // 사용자가 취소했거나 공유 시트를 못 띄웠다 — 링크 복사로 떨어진다
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setState("copied");
      setTimeout(() => setState("idle"), 2400);
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="entries actions">
      <button className="next entry" onClick={share} type="button">
        {state === "copied"
          ? "링크를 복사했습니다"
          : state === "failed"
            ? "주소창의 링크를 복사해 주세요"
            : "결과 공유하기"}
        <small>링크를 아는 사람은 같은 화면을 봅니다. 이 결과는 이 기기에도 저장됩니다.</small>
      </button>

      <Link className="next entry ghost" href={`/w/${props.slug}`}>
        다시 답하며 읽기
        <small>처음부터 다시 묻습니다. 이번 답으로 자리가 바뀝니다.</small>
      </Link>

      <Link className="next entry ghost" href={`/reread/${props.slug}`}>
        그냥 읽기
        <small>묻지 않습니다. 처음부터 끝까지 이야기만 읽습니다.</small>
      </Link>
    </div>
  );
}
