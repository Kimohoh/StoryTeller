import Link from "next/link";

/**
 * 서재 맨 아래 한 줄.
 *
 * 크롤러가 소개·개인정보처리방침을 찾아갈 유일한 통로다. 광고 심사에서
 * '연락할 곳도 방침도 없는 사이트'로 읽히지 않으려면 링크가 본문 안에
 * 있어야 한다 — sitemap에만 있으면 사람이 못 찾는다.
 */
export function SiteFooter() {
  return (
    <footer className="site-foot">
      <nav>
        <Link href="/about">소개</Link>
        <Link href="/privacy">개인정보처리방침</Link>
      </nav>
      <p>
        본문은 저작권이 소멸한 원작을 직접 각색한 글입니다. 국내 출간 번역본의
        문장은 쓰지 않았습니다.
      </p>
    </footer>
  );
}
