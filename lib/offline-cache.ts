/**
 * 작품을 미리 받아두기.
 *
 * 무게의 대부분은 삽화다 — 아홉 장이 1.8MB이고 본문은 몇 KB다. 지하철에 들어가기
 * 전에 이것만 받아두면 읽는 동안 네트워크가 하는 일이 사실상 없다.
 *
 * 캐시 이름은 public/sw.js와 같아야 한다. 여기서 담은 것을 서비스 워커가 꺼내 쓴다.
 */
const ASSETS = "assets-v1";

export interface CacheProgress {
  done: number;
  total: number;
}

/** 이 작품 삽화가 전부 캐시에 있는가 */
export async function isWorkCached(urls: string[]): Promise<boolean> {
  if (!("caches" in window) || urls.length === 0) return false;
  try {
    const cache = await caches.open(ASSETS);
    const hits = await Promise.all(urls.map((u) => cache.match(u)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

/** 하나씩 받는다 — 진행 상황을 보여줘야 사람이 기다린다 */
export async function cacheWork(
  urls: string[],
  onProgress?: (p: CacheProgress) => void,
): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cache = await caches.open(ASSETS);
    let done = 0;
    for (const url of urls) {
      if (!(await cache.match(url))) await cache.add(url);
      done++;
      onProgress?.({ done, total: urls.length });
    }
    return true;
  } catch {
    return false;
  }
}
