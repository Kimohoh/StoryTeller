import Link from "next/link";
import { publishedWorks, globalAxes } from "@/lib/works";
import { loadWork } from "@/lib/work-repo";
import { currentUserId } from "@/lib/user";
import { readWorks, accumulatedCoordinate, accumulatedCAxis } from "@/lib/reader";
import { Illustration } from "@/components/Illustration";
import { AccumPlot } from "@/components/AccumPlot";
import { epithetWords, epithetParts } from "@/lib/epithet";
import { LocalLibrary } from "@/components/LocalLibrary";

export const dynamic = "force-dynamic";

export default async function Library() {
  // 읽기 전용이다 — 아직 아무것도 읽지 않은 사람에게 id를 발급하지 않는다
  const userId = await currentUserId();
  const read = new Map(userId ? readWorks(userId).map((r) => [r.slug, r]) : []);
  const { coordinate, works: readCount } = userId
    ? accumulatedCoordinate(userId)
    : { coordinate: { A: 0, B: 0 }, works: 0 };
  // C는 측정된 작품들만 모아 계산한다 — 페어가 없는 작품은 셈에서 빠진다
  const acc = userId ? accumulatedCAxis(userId) : { value: null, works: 0, pairs: 0, changed: 0 };
  const axes = globalAxes();
  // 읽어서 얻은 칭호 — 작품마다 받은 유형 이름을 한 줄로 엮는다
  const epithet = userId ? epithetParts(epithetWords(userId)) : [];

  const shelf = publishedWorks().map((entry) => {
    const work = loadWork(entry.slug);
    return {
      slug: entry.slug,
      title: work.title,
      subtitle: work.subtitle,
      cover: work.pages[0]?.illustration_key ?? null,
      pages: work.pages.length,
      session: read.get(entry.slug) ?? null,
    };
  });

  return (
    <main className="wrap">
      <header className="shelf-head">
        <h1>고독 <span className="brand-hanja">古讀</span></h1>
        <p className="note">
          읽는 중 몇 번은 당신에게 묻고,<br />
          이를 통해 당신의 위치를 찾습니다.
        </p>
      </header>

      {/* 칭호는 한 편부터 준다 — 다음 편을 읽을 이유가 된다.
          좌표는 두 편부터다. 한 작품만으론 아직 말할 게 없다 (spec §3). */}
      {readCount >= 1 ? (
        <section className="accum">
          <h2>
            {readCount >= 2
              ? `지금까지 읽은 ${readCount}편이 찾은 나의 자리`
              : "첫 편에서 얻은 것"}
          </h2>

          {epithet.length ? (
            <p className="epithet">
              <span className="epithet-label">읽어서 얻은 칭호</span>
              <span className="epithet-line">
                {epithet.map((part, i) =>
                  part.word ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>,
                )}
              </span>
            </p>
          ) : null}

          {readCount < 2 ? (
            <p className="note">
              한 편을 더 읽으면 두 편이 모인 자리가 좌표로 나옵니다. 작품이 늘수록
              칭호도 한 낱말씩 길어집니다.
            </p>
          ) : null}

          {readCount >= 2 ? (
            <>
          <AccumPlot coordinate={coordinate} axes={axes} c={acc.value} />

          <dl className="accum-legend">
            <div>
              <dt>가로</dt>
              <dd>{axes.A.question}</dd>
            </div>
            <div>
              <dt>세로</dt>
              <dd>{axes.B.question}</dd>
            </div>
            {acc.value !== null ? (
              <div>
                <dt>번짐</dt>
                <dd>
                  판단의 근거가 바뀌었을 때 답을 고쳤는지. {acc.works}편에서 {acc.pairs}번 중{" "}
                  <b>{acc.changed}번</b> 고쳤습니다. 넓게 번질수록 자주 고쳤다는 뜻이고,
                  어느 쪽이 더 나은 태도는 아닙니다.
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="note">작품을 더 읽을수록 이 자리는 조금씩 움직입니다.</p>
            </>
          ) : null}
        </section>
      ) : null}

      <ul className="shelf">
        {shelf.map((w) => (
          <li key={w.slug}>
            {/* 언제나 표지로 보낸다 — 거기서 답하며 읽을지 그냥 읽을지 고른다.
                바로 결과로 보내면 읽은 작품을 다시 읽을 방법이 없어진다. */}
            <Link href={`/w/${w.slug}`} className="shelf-item">
              <Illustration work={w.slug} k={w.cover} className="shelf-art" />
              <div className="shelf-text">
                <h2>{w.title}</h2>
                <p className="sub">{w.subtitle}</p>
                <p className="meta">
                  {w.session ? `읽음 · ${w.pages}장` : `${w.pages}장`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* 쿠키가 지워져도 이 기기에 남은 기록을 보여준다 */}
      <LocalLibrary serverSlugs={[...read.keys()]} />
    </main>
  );
}
