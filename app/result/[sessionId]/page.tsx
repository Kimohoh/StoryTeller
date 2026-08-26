import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session-repo";
import { getDb } from "@/lib/db";
import { buildResult } from "@/lib/verdict";
import { workTypes } from "@/lib/work-repo";
import { CoordinatePlot } from "@/components/CoordinatePlot";
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
        <Link className="next" href={`/read/${slug}/1`}>돌아가기</Link>
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

      <Prose paragraphs={r.paragraphs} />

      {r.quote ? <p className="verdict-quote">{r.quote}.</p> : null}

      {/* Ungeziefer 반전. 제목의 "바퀴벌레"를 회수하는 장치이므로 맨 마지막에 둔다. */}
      <section className="reveal">
        <Prose paragraphs={r.ending_reveal} className="" />
      </section>
    </main>
  );
}
