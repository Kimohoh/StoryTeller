import type { Metadata } from "next";
import { quickQuestions } from "@/lib/quick";
import { publishedWorks } from "@/lib/works";
import { loadWork } from "@/lib/work-repo";
import { QuickFlow } from "@/components/QuickFlow";
import { Illustration } from "@/components/Illustration";
import Link from "next/link";

export const metadata: Metadata = {
  title: "1분이면 대충 나옵니다",
  description: "네 장면, 네 번의 물음. 고전 다섯 편이 만든 판 위에서 당신의 자리를 찾습니다.",
  openGraph: {
    title: "1분이면 대충 나옵니다 — 고독 古讀",
    description: "네 장면, 네 번의 물음. 고전 다섯 편이 만든 판 위에서 당신의 자리를 찾습니다.",
    images: ["/og.png"],
  },
};

/**
 * 60초 입구.
 *
 * 열 장을 읽는 데는 8분이 걸리고, 카톡으로 링크를 받은 사람이 그 시간을 낼
 * 확률은 낮다. 실제로 『변신』은 시작한 스물한 명 중 여덟이 첫 문항도 안 누르고
 * 나갔다.
 *
 * 그렇다고 콘텐츠를 짧게 만들 수는 없다. 대신 입구를 짧게 만든다 — 여기서
 * 흐릿한 자리를 하나 받고, 또렷하게 만들려면 한 편을 읽어야 한다.
 */
export default function Quick() {
  // 가장 짧은 작품으로 보낸다. 첫 걸음은 가벼워야 한다.
  const shortest = publishedWorks()
    .map((w) => loadWork(w.slug))
    .sort((a, b) => a.pages.length - b.pages.length)[0];

  return (
    <main className="wrap quick">
      <header className="quick-head">
        <h1>
          고독 <span className="brand-hanja">古讀</span>
        </h1>
        <p className="note">
          네 장면, 네 번의 물음.
          <br />
          고전 다섯 편이 만든 판 위에 당신의 자리를 찍습니다.
        </p>
      </header>

      <QuickFlow
        questions={quickQuestions()}
        firstWork={{ slug: shortest.slug, title: shortest.title }}
        /* 삽화는 파일을 읽어야 해서 서버에서만 그릴 수 있다. 다 그려서
           넘긴다 — 서재의 카드와 같은 것이 나와야 한다. */
        firstWorkCard={
          <ul className="shelf">
            <li>
              <Link href={`/w/${shortest.slug}`} className="shelf-item">
                <Illustration
                  work={shortest.slug}
                  k={shortest.pages[0]?.illustration_key ?? null}
                  className="shelf-art"
                />
                <div className="shelf-text">
                  <h2>{shortest.title}</h2>
                  <p className="sub">{shortest.subtitle}</p>
                  <p className="meta">{shortest.pages.length}장</p>
                </div>
              </Link>
            </li>
          </ul>
        }
      />
    </main>
  );
}

export const dynamic = "force-dynamic";
