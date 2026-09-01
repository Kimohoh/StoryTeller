"use client";

/**
 * 원작으로 나가는 한 줄.
 *
 * 예전에는 /out/<슬러그>로 보내 서버가 302로 넘겼는데, 그 경로가 서비스 워커의
 * 화면 캐시와 얽혀 404가 났다. 이제 바깥 주소를 그대로 걸고, 클릭만 따로 알린다.
 * 리디렉트가 없으니 워커도 크롤러도 끼어들 자리가 없다.
 *
 * 집계는 sendBeacon으로 보낸다 — 페이지를 떠나는 중에도 끝까지 나가고, 실패해도
 * 링크는 그대로 열린다. 집계가 바깥으로 나가는 길을 막아서는 안 된다.
 */
export function OriginalLink({
  slug,
  label,
  url,
}: {
  slug: string;
  label: string;
  url: string;
}) {
  function ping() {
    try {
      const body = new Blob([JSON.stringify({ slug, target: "original" })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/out", body);
    } catch {
      // 집계 실패는 조용히 넘긴다
    }
  }

  return (
    <p className="to-original">
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={ping}>
        {label} <span aria-hidden="true">→</span>
      </a>
    </p>
  );
}
