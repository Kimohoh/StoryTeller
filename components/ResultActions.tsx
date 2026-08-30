"use client";

import { useEffect, useState } from "react";
import { saveLocalResult } from "@/lib/local-results";

interface Props {
  slug: string;
  title: string;
  sessionId: string;
  type: string;
  coordinate: { A: number; B: number };
  completedAt: string;
}

/**
 * 결과를 이 기기에 남기고, 공유할 수 있게 한다.
 * 공유 링크는 결과 URL 그대로다 — 받은 사람이 열면 같은 진단문을 본다.
 */
export function ResultActions(props: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    saveLocalResult(props);
  }, [props]);

  async function share() {
    const url = window.location.href;
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
    <div className="actions">
      <button className="next" onClick={share} type="button">
        {state === "copied" ? "링크를 복사했습니다" : state === "failed" ? "주소창의 링크를 복사해 주세요" : "결과 공유하기"}
      </button>
      <p className="actions-note">이 결과는 이 기기에 저장됩니다. 링크를 아는 사람은 같은 화면을 볼 수 있습니다.</p>
    </div>
  );
}
