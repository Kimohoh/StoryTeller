/**
 * 삽화 한 장 교체 (spec §5).
 *
 * 외부에서 받은 이미지를 assets에 넣고 manifest 한 줄을 고친다.
 * 콘텐츠 JSON도, 스키마도, 화면 코드도 건드리지 않는다 — 그게 이 구조의 요점이다.
 * 여러 장을 한 번에 넣을 때는 npm run illustration:batch.
 *
 *   npm run illustration                              현재 상태 보기
 *   npm run illustration -- <키> <파일> --alt "설명"   교체
 *   npm run illustration -- <키> <파일> --keep-alt     설명 그대로 두고 교체
 *
 * alt를 강제하는 이유: 이미지가 바뀌면 그 이미지를 설명하는 문장도 같이 바뀌어야 한다.
 * 옛 설명을 새 그림에 얹어두면 화면 리더를 쓰는 사람에게 거짓말이 나간다.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { replaceEntry, dimensions, parseRatio, TYPES, type Entry } from "../lib/illustration-file";
import { works } from "../lib/works";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets/illustrations");
const MANIFEST = join(ASSETS, "manifest.json");

const allManifests: Record<string, Record<string, Entry>> = JSON.parse(readFileSync(MANIFEST, "utf8"));
const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? "") : null;
};
const has = (name: string) => argv.includes(`--${name}`);
const positional = argv.filter(
  (a, i) => !a.startsWith("--") && !argv[i - 1]?.match(/^--(alt|credit|ratio|work)$/),
);
const fail = (msg: string) => { console.error(`\n${msg}\n`); process.exit(1); };

/** 어느 작품의 삽화인가. 작품이 하나면 생략해도 된다. */
const SLUG = flag("work") ?? works().works[0].slug;
const manifest = allManifests[SLUG];
if (!manifest) fail(`manifest에 작품이 없다: ${SLUG}`);

/* ---------- 인자 없이 부르면 현재 상태 ---------- */

if (positional.length === 0) {
  console.log(`작품: ${SLUG}`);
  console.log("키                 종류   v   치수         설명");
  console.log("─".repeat(78));
  for (const [key, e] of Object.entries(manifest)) {
    const path = join(ASSETS, e.src);
    const exists = existsSync(path);
    const dim = exists ? dimensions(readFileSync(path), extname(e.src).toLowerCase()) : null;
    const size = dim ? `${dim.w}×${dim.h}` : exists ? "?" : "파일 없음";
    console.log(
      `${key.padEnd(18)} ${e.type.padEnd(6)} ${String(e.version).padEnd(3)} ${size.padEnd(12)} ${e.alt.slice(0, 24)}…`,
    );
  }
  console.log('\n교체:  npm run illustration -- <키> <파일경로> --alt "새 설명"');
  console.log("일괄:  npm run illustration:batch");
  if (works().works.length > 1) console.log("다른 작품:  -- --work <슬러그>");
  process.exit(0);
}

/* ---------- 교체 ---------- */

const [key, file] = positional;
if (!key || !file) fail('사용법: npm run illustration -- <키> <파일경로> --alt "새 설명"');
if (!(key in manifest)) {
  fail(`manifest에 없는 키: ${key}\n쓸 수 있는 키: ${Object.keys(manifest).join(", ")}`);
}
if (!existsSync(file)) fail(`파일이 없다: ${file}`);
if (!(extname(file).toLowerCase() in TYPES)) {
  fail(`지원하지 않는 형식: ${extname(file)} (png, jpg, webp, svg만)`);
}

const alt = flag("alt");
if (!alt && !has("keep-alt")) {
  fail(
    '--alt "새 설명"이 필요하다.\n' +
      "이미지가 바뀌면 설명도 같이 바뀌어야 한다 (spec §5). 정말 그대로 둘 거면 --keep-alt.",
  );
}
const ratio = parseRatio(flag("ratio"));
if (Number.isNaN(ratio)) fail("--ratio는 9:16 형식으로 준다");

const r = replaceEntry(ASSETS, manifest, key, file, {
  alt: alt ?? undefined,
  credit: flag("credit") ?? undefined,
  ratio,
  dryRun: has("dry-run"),
});

if (has("dry-run")) {
  console.log(`(dry-run) ${key}: ${r.from} → ${r.to}, v${r.version - 1} → v${r.version}`);
  for (const w of r.warnings) console.warn("  경고: " + w);
  process.exit(0);
}

writeFileSync(MANIFEST, JSON.stringify(allManifests, null, 2) + "\n");
console.log(`${key} 교체 완료`);
console.log(`  ${r.from} (v${r.version - 1})  →  ${r.to} (v${r.version})`);
if (r.dim) console.log(`  ${r.dim.w}×${r.dim.h}, ${r.sizeKb.toFixed(0)}KB`);
if (r.orphan) console.log(`  이전 파일 ${basename(r.orphan)}은 남겨뒀다 — 확인 후 지울 것`);
for (const w of r.warnings) console.warn("  경고: " + w);
console.log("\n다음: npm run content:check && npm run preview");
