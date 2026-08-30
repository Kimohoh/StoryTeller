import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { loadWork, readingPayload } from "@/lib/work-repo";
import { currentSessionId } from "@/lib/session-cookie";
import { getAnswers, getSession } from "@/lib/session-repo";
import { Illustration } from "@/components/Illustration";
import { Prose } from "@/components/Prose";
import { ChoiceGroup } from "@/components/ChoiceGroup";

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

  const answered = new Map(getAnswers(sessionId).map((a) => [a.question_id, a.choice_id]));
  const questionPages = payload.pages.filter((p) => p.question);
  const isLastQuestion =
    current.question?.id === questionPages[questionPages.length - 1].question!.id;
  const nextNo = pageNo + 1;
  const hasNext = payload.pages.some((p) => p.no === nextNo);

  return (
    <main className="wrap">
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

      {current.question ? (
        <section className="question">
          <p className="question-prompt">{current.question.prompt}</p>
          <ChoiceGroup
            sessionId={sessionId}
            questionId={current.question.id}
            choices={current.question.choices}
            nextHref={hasNext ? `/read/${slug}/${nextNo}` : `/result/${sessionId}`}
            isLast={Boolean(isLastQuestion)}
            picked={answered.get(current.question.id) ?? null}
          />
        </section>
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
