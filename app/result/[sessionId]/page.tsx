import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session-repo";
import { getDb } from "@/lib/db";
import { buildResult } from "@/lib/verdict";
import { workTypes, loadWork } from "@/lib/work-repo";
import { CoordinatePlot } from "@/components/CoordinatePlot";
import { ResultActions } from "@/components/ResultActions";
import { PendingNotice } from "@/components/PendingNotice";
import { CAxisBlock } from "@/components/CAxisBlock";
import { Prose } from "@/components/Prose";
import { josa } from "@/lib/josa";

export const dynamic = "force-dynamic";

export default async function ResultPage({
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
  const r = buildResult(slug, sessionId);

  if (r.answered < r.total) {
    return (
      <main className="wrap">
        <p>아직 {r.total - r.answered}개 문항이 남아 있습니다.</p>
        <PendingNotice sessionId={sessionId} />
        <Link className="quiet-link" href={`/read/${slug}/1`}>읽던 곳으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="wrap">
      <CoordinatePlot
        coordinate={r.coordinate}
        types={workTypes(slug)}
        primaryKey={r.primary.key}
        axes={r.axes}
      />

      <h1 className="verdict-type">{r.primary.name}</h1>
      <p className="verdict-near">
        {r.near_boundary
          ? `당신은 ${r.primary.name}에 가깝지만, ${josa(r.secondary.name, "와/과")} 한 뼘 거리입니다.`
          : `${josa(r.secondary.name, "와/과")}는 거리가 있습니다.`}
      </p>

      {r.draft ? (
        <p className="draft-banner">
          진단문 초고가 아직 작성되지 않았습니다. 아래는 자리만 잡아둔 상태입니다.
          (docs/spec.md §10)
        </p>
      ) : null}

      {/* 인용은 ①「당신이 읽은 방식」 바로 뒤에 박는다. 진단문 끝에 붙이면
          일반론을 다 읽은 뒤의 부록처럼 읽히고, 본인 얘기라는 감각이 죽는다. */}
      <Prose paragraphs={r.paragraphs.slice(0, 1)} />

      {r.quote ? <p className="verdict-quote">{r.quote}.</p> : null}

      <Prose paragraphs={r.paragraphs.slice(1)} />

      {/* Ungeziefer 반전. 제목의 "바퀴벌레"를 회수하는 장치이므로 진단문의 맨 마지막에 둔다. */}
      {/* 4분면과 합치지 않고 아래에 따로 세운다 */}
      {r.c ? <CAxisBlock c={r.c} /> : null}

      <section className="reveal">
        <Prose paragraphs={r.ending_reveal} className="" />
      </section>

      {/* ③ 사각지대를 읽은 다음에야 반대쪽을 보러 갈 이유가 생긴다 (spec §8). */}
      <Link className="next" href={`/result/${sessionId}/others`}>
        다르게 읽은 사람들
      </Link>

      <ResultActions
        slug={slug}
        title={loadWork(slug).title}
        sessionId={sessionId}
        type={r.primary.name}
        coordinate={r.coordinate}
        completedAt={session.completed_at ?? new Date().toISOString()}
      />

      <Link className="quiet-link" href="/">서재로</Link>
    </main>
  );
}
