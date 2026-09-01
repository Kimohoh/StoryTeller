/**
 * 띄운 사이트를 밖에서 두드려 본다.
 *
 * 로컬에서 잘 뜨는 것과 도메인으로 제대로 나가는 것은 다른 문제다. 터널이
 * 죽었거나, .env.local을 안 읽었거나, 빌드가 옛것이면 여기서 걸린다.
 * 광고 검토 전에 이걸로 한 번 훑는다.
 *
 *   npm run check:live                       (.env.local의 APP_ORIGIN)
 *   npm run check:live -- https://godok.page
 *
 * 다른 컴퓨터에서 돌려도 된다 — 레포만 있으면 된다.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { publishedWorks } from "../lib/works";
import { loadEnvLocal } from "../lib/env-file";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

loadEnvLocal(ROOT);
const envLocal = (key: string): string | null => process.env[key] ?? null;

const origin = (process.argv[2] ?? envLocal("APP_ORIGIN") ?? "").replace(/\/$/, "");
if (!origin) {
  console.error("주소를 모르겠다. .env.local에 APP_ORIGIN을 넣거나 인자로 준다:");
  console.error("  npm run check:live -- https://godok.page");
  process.exit(1);
}

const pub = envLocal("ADSENSE_PUBLISHER_ID");
const contact = envLocal("CONTACT_EMAIL");

let failed = 0;
function ok(label: string, detail = "") {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
}
function bad(label: string, why: string) {
  failed++;
  console.log(`  ✗ ${label} — ${why}`);
}

async function get(path: string) {
  const res = await fetch(origin + path, { redirect: "follow" });
  return { status: res.status, body: await res.text() };
}

async function main() {
  console.log(`\n${origin} 을 밖에서 확인한다\n`);

  /* ---------- 열리는가 ---------- */
  console.log("접속");
  let home: { status: number; body: string };
  try {
    home = await get("/");
  } catch (e) {
    bad("서재", `연결이 안 된다 (${(e as Error).message}). 앱이나 터널이 죽었다`);
    console.log("\n실패 1건. 나머지는 건너뛴다.\n");
    process.exit(1);
  }
  if (home.status === 200) ok("서재");
  else {
    // 502·503·521~523은 터널은 살아 있는데 뒤의 앱이 안 떠 있다는 뜻이다.
    // 그냥 숫자만 보여주면 사이트 전체가 망가진 것처럼 읽힌다.
    const originDown = home.status === 502 || home.status === 503 || (home.status >= 521 && home.status <= 523);
    bad("서재", originDown ? `${home.status} — 터널은 살아 있는데 앱이 안 떠 있다` : `${home.status}`);
    if (originDown) {
      console.log("\n  앱만 다시 띄우면 된다. 도메인도 터널도 그대로다.\n");
      console.log("    launchctl list | grep godok        (가운데 칸이 0이어야 한다)");
      console.log("    tail -20 /tmp/godok-app.err.log    (왜 죽었는지)");
      console.log("    grep -A1 WorkingDirectory ~/Library/LaunchAgents/page.godok.app.plist");
      console.log("                                      (레포를 옮겼다면 이 경로부터)");
      console.log("\n  나머지 검사는 앱이 뜬 뒤에 의미가 있다.\n");
      process.exit(1);
    }
  }

  /* ---------- 절대 주소 ---------- */
  console.log("\n공유 카드");
  const ogImage = home.body.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
  if (!ogImage) bad("og:image", "태그가 없다");
  else if (!ogImage.startsWith("http"))
    bad("og:image", `상대 주소다 (${ogImage}). APP_ORIGIN이 안 읽혔다`);
  else if (!ogImage.startsWith(origin))
    bad("og:image", `다른 주소를 가리킨다 (${ogImage})`);
  else {
    const img = await fetch(ogImage);
    img.ok ? ok("og:image", ogImage) : bad("og:image", `${ogImage} 가 ${img.status}`);
  }

  /* ---------- 광고 ---------- */
  console.log("\n광고");
  const hasScript = home.body.includes("pagead2.googlesyndication.com");
  const ads = await get("/ads.txt");
  if (!pub) {
    hasScript
      ? bad("스크립트", "ADSENSE_PUBLISHER_ID는 비었는데 스크립트가 나간다")
      : ok("스크립트", "아직 안 붙였다 (.env.local의 ADSENSE_PUBLISHER_ID가 비었다)");
    ads.status === 404 ? ok("ads.txt", "404 — ID가 없으니 맞다") : bad("ads.txt", `${ads.status}`);
  } else {
    hasScript ? ok("스크립트", `ca-${pub}`) : bad("스크립트", "<head>에 안 보인다. 다시 띄웠는가");
    if (ads.status !== 200) bad("ads.txt", `${ads.status}`);
    else if (!ads.body.includes(`google.com, ${pub}, DIRECT`))
      bad("ads.txt", `내용이 다르다: ${ads.body.trim().slice(0, 60)}`);
    else ok("ads.txt", ads.body.trim().split("\n")[0]);
  }

  /* ---------- 크롤러 ---------- */
  console.log("\n검색·크롤러");
  const robots = await get("/robots.txt");
  if (robots.status !== 200) bad("robots.txt", `${robots.status}`);
  else {
    robots.body.includes("Mediapartners-Google")
      ? ok("robots.txt", "광고 크롤러 열려 있다")
      : bad("robots.txt", "Mediapartners-Google 블록이 없다. 빌드가 옛것이다");
    robots.body.includes(`${origin}/sitemap.xml`)
      ? ok("robots.txt sitemap 줄", "")
      : bad("robots.txt sitemap 줄", "주소가 안 맞는다");
  }
  const sitemap = await get("/sitemap.xml");
  sitemap.status === 200 && sitemap.body.includes(`<loc>${origin}</loc>`)
    ? ok("sitemap.xml", `${(sitemap.body.match(/<loc>/g) ?? []).length}개 주소`)
    : bad("sitemap.xml", `${sitemap.status}`);

  /* ---------- 검토가 보는 페이지 ---------- */
  console.log("\n검토가 보는 페이지");
  for (const [path, label] of [
    ["/about", "소개"],
    ["/privacy", "개인정보처리방침"],
  ] as const) {
    const r = await get(path);
    if (r.status !== 200) bad(label, `${r.status}`);
    else if (r.body.includes("준비 중입니다"))
      bad(label, "연락처가 비었다. .env.local의 CONTACT_EMAIL");
    else ok(label, contact ?? "");
  }

  /* ---------- 작품 ---------- */
  console.log("\n작품");
  for (const w of publishedWorks()) {
    const r = await get(`/w/${w.slug}`);
    const rr = await get(`/reread/${w.slug}`);
    r.status === 200 && rr.status === 200
      ? ok(w.slug, "표지·그냥읽기")
      : bad(w.slug, `표지 ${r.status}, 그냥읽기 ${rr.status}`);
  }

  /* ---------- 집계 ---------- */
  console.log("\n집계");
  try {
    const res = await fetch(`${origin}/api/out`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    // 빈 몸통은 아무것도 기록하지 않고 204로 끝난다. 살아 있는지만 본다.
    res.status === 204
      ? ok("원작 링크 집계", "/api/out 살아 있다")
      : bad("원작 링크 집계", `/api/out 이 ${res.status}. 빌드가 옛것이다`);
  } catch (e) {
    bad("원작 링크 집계", (e as Error).message);
  }

  console.log(
    failed === 0
      ? "\n다 통과했다.\n"
      : `\n${failed}건이 걸렸다. 위의 ✗ 를 먼저 고친다.\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
