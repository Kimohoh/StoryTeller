"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 화면이 죽었을 때 나오는 자리.
 *
 * 이게 없으면 브라우저의 기본 오류 문구만 뜨고 나갈 데가 없다 — 뒤로 갈
 * 곳도, 다시 해볼 방법도 없이 막힌다. 무엇이 잘못됐는지는 우리가 볼 일이고,
 * 읽던 사람에게는 다음 걸음만 주면 된다.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="wrap doc">
      <h1>여기서 멈췄습니다</h1>
      <p>
        화면을 그리다 문제가 생겼습니다. 읽던 기록은 그대로 있으니 다시 열면
        이어집니다.
      </p>
      <p className="doc-back" style={{ display: "flex", gap: "1.25rem" }}>
        <button
          type="button"
          onClick={reset}
          style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--gold)", cursor: "pointer" }}
        >
          다시 해보기
        </button>
        <Link href="/">서재로</Link>
      </p>
    </main>
  );
}
