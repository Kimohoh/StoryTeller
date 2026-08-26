import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session-repo";
import { getDb } from "@/lib/db";
import { buildOthers } from "@/lib/verdict";

export const dynamic = "force-dynamic";

export default async function OthersPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) notFound();

  const slug = (
    getDb().prepare("SELECT slug FROM works WHERE id = ?").get(session.work_id) as { slug: string }
  ).slug;
  const items = buildOthers(slug, sessionId);

  return (
    <main className="wrap">
      <h1 className="others-title">다르게 읽은 사람들</h1>
      {/* 가짜 유저로 위장하지 않는다. 들키면 끝이다 (spec §9). */}
      <p className="others-note">
        아직 아무도 쓰지 않았습니다. 아래는 편집부가 미리 써둔, 반대쪽을 고른 사람의 말입니다.
        읽은 사람들의 글이 쌓이면 그 아래로 내려갑니다.
      </p>

      {items.map((it) => (
        <section className="other" key={it.question_id}>
          <p className="other-page">{it.page_no}페이지</p>
          <p className="other-prompt">{it.prompt}</p>

          <p className="other-label">{it.other.label}</p>
          <p className="other-body">{it.other.body}</p>

          {it.mine ? (
            <details className="other-mine">
              <summary>당신이 고른 쪽의 말</summary>
              <p className="other-label">{it.mine.label}</p>
              <p className="other-body">{it.mine.body}</p>
            </details>
          ) : null}
        </section>
      ))}

      <Link className="next" href={`/result/${sessionId}`}>
        결과로 돌아가기
      </Link>
    </main>
  );
}
