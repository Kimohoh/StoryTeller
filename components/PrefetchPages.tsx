"use client";

import { useEffect } from "react";

/**
 * 읽기 시작하면 그 작품의 나머지 페이지를 조용히 받아둔다.
 *
 * 삽화와 달리 본문은 페이지당 몇 KB라 물어볼 것도 없이 받아두는 편이 낫다.
 * 이게 없으면 오프라인에서 다음 장으로 넘어갈 때 안내 화면이 뜬다 — 읽던 사람에겐
 * 그게 앱이 죽은 것과 같다.
 *
 * 캐시 이름은 public/sw.js의 PAGES와 같아야 한다.
 */
export function PrefetchPages({ urls }: { urls: string[] }) {
  useEffect(() => {
    if (!("caches" in window) || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    (async () => {
      try {
        const cache = await caches.open("pages-v1");
        for (const url of urls) {
          if (cancelled) return;
          if (await cache.match(url)) continue;
          // 세션 쿠키가 실려야 읽기 페이지가 표지로 튕기지 않는다
          await cache.add(new Request(url, { credentials: "same-origin" }));
        }
      } catch {
        // 저장 공간이 없거나 캐시를 못 쓰는 환경 — 읽기는 그대로 굴러간다
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urls]);

  return null;
}
