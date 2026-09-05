import type { Metadata } from "next";
import { quickQuestions } from "@/lib/quick";
import { publishedWorks } from "@/lib/works";
import { loadWork } from "@/lib/work-repo";
import { QuickFlow } from "@/components/QuickFlow";

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
        firstWork={{
          slug: shortest.slug,
          title: shortest.title,
          pages: shortest.pages.length,
        }}
      />
    </main>
  );
}

export const dynamic = "force-dynamic";
