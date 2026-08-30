/**
 * 서비스 워커.
 *
 * 지하철에서 읽히는 앱이라는 전제로 짠다. 캐시 전략은 자원 성격에 맞춰 셋으로 나눈다.
 *
 *   삽화        cache-first  — URL에 version이 박혀 있어 내용이 바뀌면 URL이 바뀐다.
 *                             한 작품이 1.8MB라 이게 오프라인 읽기의 대부분이다.
 *   빌드 자산   cache-first  — /_next/static은 해시가 파일명에 있다.
 *   화면        network-first — 답이 서버에 있으므로 연결되면 언제나 서버가 우선이고,
 *                             끊기면 마지막으로 본 화면을 돌려준다.
 *
 * POST는 건드리지 않는다. 답변은 lib/pending-answers.ts가 따로 챙긴다 —
 * Background Sync는 iOS에 없어서 기대면 안 된다.
 */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** 내용이 바뀌면 URL이 바뀌는 자원 — 한 번 받으면 다시 묻지 않는다 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

/** 서버가 진실이지만, 끊기면 마지막으로 본 것을 준다 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 결과 채점표는 캐시하지 않는다 — 축이 기기에 남을 이유가 없다 (spec §2)
  if (url.pathname.startsWith("/api/sessions/")) return;

  if (url.pathname.startsWith("/api/illustrations/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  // 나머지 같은 출처 GET은 전부 화면이다.
  //
  // mode === "navigate"만 보면 안 된다 — App Router는 첫 진입만 문서 요청이고
  // 그 뒤 Link 이동은 ?_rsc= 가 붙은 RSC 요청으로 간다. 그것까지 담아야
  // 오프라인에서 페이지를 넘길 수 있다.
  event.respondWith(networkFirst(request, PAGES));
});
