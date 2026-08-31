import { notFound } from "next/navigation";
import Link from "next/link";
import { readingPayload } from "@/lib/work-repo";
import { workEntry } from "@/lib/works";
import { currentUserId } from "@/lib/user";
import { readWorks } from "@/lib/reader";
import { Illustration } from "@/components/Illustration";
import { Prose } from "@/components/Prose";
import { PrefetchPages } from "@/components/PrefetchPages";

export const dynamic = "force-dynamic";

/**
 * 그냥 읽기 — 문항 없이 처음부터 끝까지.
 *
 * 표지에서 「답하며 읽기」와 나란히 고르는 갈래다. 세션을 만들지 않고 답도
 * 받지 않는다. 이 경로로는 결과가 나오지 않으므로 문항을 건너뛰고 결과만
 * 보러 가는 길이 되지는 않는다 — 여기서는 아무것도 기록되지 않는다.
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

  // 답하며 읽은 적이 있으면 결과로 돌아가는 길을 준다. 없으면 표지로만 나간다.
  const userId = await currentUserId();
  const done = userId ? readWorks(userId).find((w) => w.slug === slug) : undefined;

  return (
    <main className="wrap reread">
      {/* 한 페이지에 전문이 들어 있다 — 이것만 캐시되면 비행기 모드에서도 통째로 읽힌다 */}
      <PrefetchPages urls={[`/reread/${slug}`]} />
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

      {done ? (
        <Link className="quiet-link" href={`/result/${done.session_id}`}>결과로 돌아가기</Link>
      ) : (
        <Link className="quiet-link" href={`/w/${slug}`}>표지로</Link>
      )}
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
