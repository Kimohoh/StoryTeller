/**
 * 지금 이 서버가 몇 명을 감당하는지 잰다.
 *
 *   npm run bench                    동시 5·15·40명
 *   npm run bench -- 80              한 수치만
 *   npm run bench -- 40 http://localhost:3000
 *
 * 요청을 무작정 쏟아붓는 대신 한 사람이 한 편을 읽는 동안 서버에 닿는 것을
 * 그대로 흉내낸다 — 서재, 표지, 세션 만들기, 장마다 본문과 삽화, 결과.
 * 생각하는 시간만 뺐다. 그래서 여기서 나오는 "동시 N명"은 쉬지 않고 읽는
 * N명이고, 실제 독자는 한 장에 30초씩 머무르므로 훨씬 여유가 있다.
 *
 * 호스트를 옮긴 뒤 같은 명령을 돌려 전과 비교하는 것이 이 스크립트의 쓸모다.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "../lib/env-file";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(ROOT);

const { publishedWorks } = await import("../lib/works");
const { loadWork } = await import("../lib/work-repo");

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("http")) ?? "http://localhost:3000").replace(/\/$/, "");
const levels = args.filter((a) => /^\d+$/.test(a)).map(Number);
const steps = levels.length ? levels : [5, 15, 40];

// 가장 짧은 작품으로 잰다 — 한 편이 빨리 끝나야 표본이 쌓인다
const work = publishedWorks()
  .map((w) => loadWork(w.slug))
  .sort((a, b) => a.pages.length - b.pages.length)[0];
if (!work) {
  console.error("\n공개된 작품이 없다.\n");
  process.exit(1);
}

/** 한 사람이 한 편을 읽는 동안 서버에 닿는 것 전부 */
async function oneReader(): Promise<{ req: number; bytes: number; fail: number }> {
  const jar: string[] = [];
  const cookie = () => ({ cookie: jar.join("; ") });
  const keep = (r: Response) => {
    for (const c of r.headers.getSetCookie?.() ?? []) jar.push(c.split(";")[0]);
  };
  let req = 0, bytes = 0, fail = 0;

  const get = async (path: string) => {
    const r = await fetch(base + path, { headers: cookie() });
    keep(r);
    if (!r.ok) fail++;
    bytes += (await r.arrayBuffer()).byteLength;
    req++;
  };

  await get("/");
  await get(`/w/${work.slug}`);

  const r = await fetch(`${base}/api/sessions`, {
    method: "POST",
    headers: { ...cookie(), "content-type": "application/json" },
    body: JSON.stringify({ slug: work.slug }),
  });
  keep(r);
  req++;
  if (!r.ok) return { req, bytes, fail: fail + 1 };
  const { session_id } = (await r.json()) as { session_id: string };

  for (const page of work.pages) {
    await get(`/read/${work.slug}/${page.no}`);
    if (page.illustration_key) {
      await get(`/api/illustrations/${work.slug}/${page.illustration_key}`);
    }
  }
  await get(`/result/${session_id}`);
  return { req, bytes, fail };
}

console.log(`\n${base} — 『${work.title}』(${work.pages.length}장) 기준\n`);
try {
  await oneReader(); // 워밍업. 첫 요청은 라우트 컴파일이 섞인다.
} catch (e) {
  console.error(`서버에 닿지 않는다: ${(e as Error).message}\n`);
  process.exit(1);
}

for (const conc of steps) {
  const lat: number[] = [];
  let req = 0, bytes = 0, fail = 0;
  const t0 = Date.now();
  for (let round = 0; round < 3; round++) {
    await Promise.all(
      Array.from({ length: conc }, async () => {
        const s = performance.now();
        const one = await oneReader();
        lat.push(performance.now() - s);
        req += one.req; bytes += one.bytes; fail += one.fail;
      }),
    );
  }
  const secs = (Date.now() - t0) / 1000;
  lat.sort((a, b) => a - b);
  const at = (q: number) => (lat[Math.floor(lat.length * q)] / 1000).toFixed(2);
  console.log(
    `동시 ${String(conc).padStart(3)}명   완주 p50 ${at(0.5)}초 p95 ${at(0.95)}초   ` +
      `${(req / secs).toFixed(0).padStart(4)} req/s  ${(bytes / secs / 1e6).toFixed(1)} MB/s   ` +
      `1인당 ${Math.round(req / lat.length)}요청 ${(bytes / lat.length / 1e6).toFixed(2)}MB` +
      (fail ? `   실패 ${fail}` : ""),
  );
}

console.log(
  `\n실제 독자는 한 장에 30초쯤 머문다. 위의 "동시 N명"은 쉬지 않고 읽는 N명이라,` +
    `\n같은 서버가 감당하는 진짜 동시 독자는 여기 나온 수의 수십 배다.\n`,
);
