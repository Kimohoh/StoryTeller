"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readLocalResults, type LocalResult } from "@/lib/local-results";

/**
 * 이 기기에 남아 있는 결과. 로그인이 없으므로 쿠키가 지워지면 서버는 그 사람을
 * 못 알아본다. 기기에 한 벌 더 두면 그때도 지난 결과로 돌아갈 수 있다.
 */
export function LocalLibrary({ serverSlugs }: { serverSlugs: string[] }) {
  const [extra, setExtra] = useState<LocalResult[]>([]);

  useEffect(() => {
    const known = new Set(serverSlugs);
    setExtra(readLocalResults().filter((r) => !known.has(r.slug)));
  }, [serverSlugs]);

  if (extra.length === 0) return null;

  return (
    <section className="accum">
      <h2>이 기기에 남아 있는 기록</h2>
      <ul className="local-list">
        {extra.map((r) => (
          <li key={r.sessionId}>
            <Link href={`/result/${r.sessionId}`}>
              {r.title} — {r.type}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
