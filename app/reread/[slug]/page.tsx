import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { readingPayload } from "@/lib/work-repo";
import { workEntry } from "@/lib/works";
import { currentUserId } from "@/lib/user";
import { readWorks } from "@/lib/reader";
import { Illustration } from "@/components/Illustration";
import { Prose } from "@/components/Prose";

export const dynamic = "force-dynamic";

/**
 * 선택지 없이 처음부터 끝까지 (피드백 F3).
 *
 * 완독한 사람에게만 연다. 열어두면 문항을 건너뛰고 결과만 보러 갈 수 있어
 * 지금 모으는 응답이 오염된다. 세션도 만들지 않고 답도 받지 않는다 —
 * 여기서는 아무것도 기록되지 않는다.
 */
export default async function Reread({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!workEntry(slug)) notFound();

  let payload;
  try {
    payload = readingPayload(slug);
  } catch {
    notFound();
  }

  // 쿠키가 없으면 읽은 적이 없는 사람이다 — 여기서 쿠키를 새로 심지 않는다.
  const userId = await currentUserId();
  const done = userId ? readWorks(userId).find((w) => w.slug === slug) : undefined;
  if (!done) redirect(`/w/${slug}`);

  return (
    <main className="wrap reread">
      <header className="reread-head">
        <h1>{payload.title}</h1>
        <p className="sub">{payload.subtitle}</p>
        <p className="note">묻지 않습니다. 처음부터 끝까지 그대로 읽습니다.</p>
      </header>

      {payload.pages.map((p) => (
        <article key={p.no} className="reread-page">
          <Illustration work={slug} k={p.illustration_key} className="illustration" priority={p.no === 1} />
          {p.title ? (
            <p className="page-title">
              {p.no}. {p.title}
            </p>
          ) : null}
          <Prose paragraphs={p.body} />
        </article>
      ))}

      <Link className="quiet-link" href={`/result/${done.session_id}`}>결과로 돌아가기</Link>
      <Link className="quiet-link" href="/">서재로</Link>
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const w = readingPayload(slug);
    return { title: `${w.title} — 다시 읽기` };
  } catch {
    return {};
  }
}
