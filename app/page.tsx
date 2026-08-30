import Link from "next/link";
import { publishedWorks } from "@/lib/works";
import { loadWork } from "@/lib/work-repo";
import { currentUserId } from "@/lib/user";
import { readWorks, accumulatedCoordinate } from "@/lib/reader";
import { Illustration } from "@/components/Illustration";
import { LocalLibrary } from "@/components/LocalLibrary";

export const dynamic = "force-dynamic";

export default async function Library() {
  // 읽기 전용이다 — 아직 아무것도 읽지 않은 사람에게 id를 발급하지 않는다
  const userId = await currentUserId();
  const read = new Map(userId ? readWorks(userId).map((r) => [r.slug, r]) : []);
  const { coordinate, works: readCount } = userId
    ? accumulatedCoordinate(userId)
    : { coordinate: { A: 0, B: 0 }, works: 0 };

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
        <h1>다시 읽는 서재</h1>
        <p className="note">
          퍼블릭 도메인 고전을 짧게 각색해 읽습니다. 읽는 중 몇 번 당신에게 묻고,
          다 읽으면 당신이 읽은 방식을 돌려줍니다.
        </p>
      </header>

      <ul className="shelf">
        {shelf.map((w) => (
          <li key={w.slug}>
            <Link href={w.session ? `/result/${w.session.session_id}` : `/w/${w.slug}`} className="shelf-item">
              <Illustration work={w.slug} k={w.cover} className="shelf-art" />
              <div className="shelf-text">
                <h2>{w.title}</h2>
                <p className="sub">{w.subtitle}</p>
                <p className="meta">
                  {w.session ? "읽음 — 결과 다시 보기" : `${w.pages}장`}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* 여러 작품을 읽을수록 좌표가 정밀해진다 (spec §3). 한 작품만으론 아직 말할 게 없다. */}
      {readCount >= 2 ? (
        <section className="accum">
          <h2>지금까지 읽은 {readCount}편이 모인 자리</h2>
          <p className="note">
            가로 {coordinate.A.toFixed(2)}, 세로 {coordinate.B.toFixed(2)}.
            작품을 더 읽을수록 이 점은 조금씩 움직입니다.
          </p>
        </section>
      ) : null}

      {/* 쿠키가 지워져도 이 기기에 남은 기록을 보여준다 */}
      <LocalLibrary serverSlugs={[...read.keys()]} />
    </main>
  );
}
