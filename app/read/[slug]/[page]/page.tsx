import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { loadWork, readingPayload } from "@/lib/work-repo";
import { currentSessionId } from "@/lib/session-cookie";
import { getAnswers, getSession } from "@/lib/session-repo";
import { Illustration } from "@/components/Illustration";
import { Prose } from "@/components/Prose";
import { QuestionBlock } from "@/components/QuestionBlock";
import { PrefetchPages } from "@/components/PrefetchPages";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page } = await params;
  const pageNo = Number(page);

  let payload;
  try {
    payload = readingPayload(slug);
  } catch {
    notFound();
  }

  const current = payload.pages.find((p) => p.no === pageNo);
  if (!current) notFound();

  const sessionId = await currentSessionId(slug);
  if (!sessionId || !getSession(sessionId)) redirect(`/w/${slug}`);

  const answered = Object.fromEntries(
    getAnswers(sessionId).map((a) => [a.question_id, a.choice_id]),
  );
  const allQuestions = payload.pages.flatMap((p) => p.questions);
  const lastQuestionId = allQuestions.length ? allQuestions[allQuestions.length - 1].id : null;
  const nextNo = pageNo + 1;
  const hasNext = payload.pages.some((p) => p.no === nextNo);

  const allPages = payload.pages.map((p) => `/read/${slug}/${p.no}`);

  return (
    <main className="wrap">
      {/* 다음 장이 오프라인에서도 열리도록 나머지를 미리 받아둔다 */}
      <PrefetchPages urls={allPages} />
      {/* 진행 표시는 페이지 수만 말한다. 무엇을 재는 중인지는 어디에도 없다. */}
      <div className="progress" aria-label={`${pageNo} / ${payload.pages.length}`}>
        {payload.pages.map((p) => (
          <i key={p.no} data-done={p.no <= pageNo} />
        ))}
      </div>

      <Illustration work={slug} k={current.illustration_key} className="illustration" priority />

      {current.title ? (
        <p className="page-title">
          {current.no}. {current.title}
        </p>
      ) : null}

      <Prose paragraphs={current.body} />

      {current.questions.length > 0 ? (
        <QuestionBlock
          sessionId={sessionId}
          questions={current.questions}
          picked={answered}
          nextHref={hasNext ? `/read/${slug}/${nextNo}` : `/result/${sessionId}`}
          lastQuestionId={lastQuestionId}
        />
      ) : hasNext ? (
        <Link className="next" href={`/read/${slug}/${nextNo}`}>
          계속
        </Link>
      ) : (
        <Link className="next" href={`/result/${sessionId}`}>
          다 읽었습니다
        </Link>
      )}
    </main>
  );
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    return { title: loadWork(slug).title };
  } catch {
    return {};
  }
}
