import Link from "next/link";
import type { Metadata } from "next";
import { publishedWorks } from "@/lib/works";
import { loadWork } from "@/lib/work-repo";

export const metadata: Metadata = {
  title: "소개",
  description: "고독 古讀이 무엇을 하는 서비스이고, 글은 어디에서 왔는지.",
};

export default function About() {
  const works = publishedWorks().map((e) => {
    const w = loadWork(e.slug);
    return { slug: e.slug, title: w.title, pages: w.pages.length };
  });

  return (
    <main className="wrap doc">
      <h1>소개</h1>

      <h2>무엇을 하는 곳인가</h2>
      <p>
        고독 古讀은 저작권이 소멸한 고전을 짧게 각색해 읽히는 웹 서비스입니다.
        읽는 동안 몇 번, 지금 그 장면 안에서 무엇을 하겠느냐고 묻습니다.
        어느 쪽을 고르든 이야기는 갈라지지 않습니다. 본문은 처음부터 끝까지
        같고, 고른 것은 기록될 뿐입니다.
      </p>
      <p>
        다 읽으면 그 답들이 모여 세 개의 축 위에 당신의 자리를 찍습니다.
        무엇을 재고 있었는지는 읽는 동안 어디에도 나오지 않습니다. 알고 나면
        답이 달라지기 때문입니다.
      </p>

      <h2>글은 어디에서 왔는가</h2>
      <p>
        원작은 모두 저작권 보호 기간이 끝난 작품입니다. 본문은 그 원작을 읽고
        직접 다시 쓴 각색문이며, <b>국내에 출간된 번역본의 문장은 한 줄도 쓰지
        않았습니다.</b> 각색문과 진단문, 삽화의 저작권은 이 서비스에 있습니다.
      </p>
      <p>
        각색은 원작을 대신하지 않습니다. 줄거리와 인상을 옮기되, 읽고 나서
        원작을 펼치고 싶어지는 것을 목표로 삼았습니다. 결과 화면 아래에 원작을
        찾아볼 수 있는 검색 링크를 둔 것도 그래서입니다. 특정 출판사나 서점으로
        보내지 않고, 판본을 모두 보여주는 검색 결과로 보냅니다.
      </p>

      <h2>지금 읽을 수 있는 것</h2>
      <ul className="doc-list">
        {works.map((w) => (
          <li key={w.slug}>
            <Link href={`/w/${w.slug}`}>{w.title}</Link> · {w.pages}장
          </li>
        ))}
      </ul>

      <h2>진단에 대하여</h2>
      <p>
        결과로 나오는 유형에는 좋고 나쁨이 없습니다. 심리 검사도, 성격 검사도
        아닙니다. 같은 장면 앞에서 사람마다 다른 것을 본다는 사실을, 자기 답으로
        확인해 보는 장치에 가깝습니다. 어떤 판단이나 조언의 근거로 쓰기에는
        적절하지 않습니다.
      </p>

      <h2>문의</h2>
      <p>
        의견이나 오류 제보, 제휴 문의는 아래로 보내 주세요.
        <br />
        <span className="term">{process.env.CONTACT_EMAIL ?? "준비 중입니다"}</span>
      </p>

      <p className="doc-back">
        <Link href="/">← 서재로</Link>
      </p>
    </main>
  );
}

export const dynamic = "force-dynamic";
