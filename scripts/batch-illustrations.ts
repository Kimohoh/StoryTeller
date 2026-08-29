/**
 * 받은 삽화를 한 번에 교체한다 (spec §5).
 *
 *   npm run illustration:batch                 incoming/ 폴더를 읽는다
 *   npm run illustration:batch -- 어떤/폴더
 *   npm run illustration:batch -- --dry-run    무엇이 어디로 갈지만 본다
 *   npm run illustration:batch -- --clean      처리한 원본을 폴더에서 지운다
 *
 * 파일 이름에서 페이지 번호만 알아보면 된다 — 변신_3.png, p3.png, 3.png 다 된다.
 * 설명문은 assets/illustrations/pending-alt.json에서 읽는다.
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { replaceEntry, parseRatio, TYPES, type Entry } from "../lib/illustration-file";
import type { WorkBuild } from "../lib/content-types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets/illustrations");
const MANIFEST = join(ASSETS, "manifest.json");

const argv = process.argv.slice(2);
const has = (n: string) => argv.includes(`--${n}`);
const flag = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : null;
};
const dir = join(ROOT, argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1] !== "--ratio") ?? "incoming");

const die = (msg: string) => { console.error(`\n${msg}\n`); process.exit(1); };

if (!existsSync(dir)) die(`폴더가 없다: ${dir}`);

const manifest: Record<string, Entry> = JSON.parse(readFileSync(MANIFEST, "utf8"));
const altFile = join(ASSETS, "pending-alt.json");
const alts: Record<string, string> = existsSync(altFile)
  ? JSON.parse(readFileSync(altFile, "utf8"))
  : {};

const work: WorkBuild = JSON.parse(
  readFileSync(join(ROOT, "content/.build/metamorphosis.ko.build.json"), "utf8"),
);
/** 페이지 번호 → 삽화 키. 콘텐츠가 진실이므로 여기서 가져온다. */
const keyByPage = new Map<number, string>(
  work.pages.flatMap((p) => (p.illustration_key ? [[p.no, p.illustration_key] as const] : [])),
);

/** 파일 이름에서 키를 찾는다: 정확한 키 → pN → 1~9 범위의 숫자 */
function keyFor(name: string): string | null {
  const stem = basename(name, extname(name));
  for (const key of Object.keys(manifest)) if (stem.includes(key)) return key;
  const pn = /(?:^|[^\d])p(\d)(?:[^\d]|$)/i.exec(stem);
  if (pn) return keyByPage.get(Number(pn[1])) ?? null;
  const nums = (stem.match(/\d+/g) ?? []).map(Number).filter((n) => keyByPage.has(n));
  if (nums.length === 1) return keyByPage.get(nums[0])!;
  return null;
}

const files = readdirSync(dir)
  .filter((f) => extname(f).toLowerCase() in TYPES)
  .sort();

if (files.length === 0) die(`${dir}에 이미지가 없다. 변신_1.png 같은 이름으로 올릴 것.`);

const ratio = parseRatio(flag("ratio"));
if (Number.isNaN(ratio)) die("--ratio는 9:16 형식으로 준다");

const dryRun = has("dry-run");
const noAlt: string[] = [];
const unmatched: string[] = [];
const seen = new Map<string, string>();
let done = 0;

for (const f of files) {
  const key = keyFor(f);
  if (!key) { unmatched.push(f); continue; }
  if (seen.has(key)) {
    die(`같은 키에 파일이 둘이다 — ${key}: ${seen.get(key)}, ${f}`);
  }
  seen.set(key, f);

  const alt = alts[key];
  if (!alt) noAlt.push(key);

  const r = replaceEntry(ASSETS, manifest, key, join(dir, f), { alt, ratio, dryRun });
  done++;
  console.log(`${dryRun ? "(dry-run) " : ""}${f}  →  ${key}  v${r.version}` +
    (r.dim ? `  ${r.dim.w}×${r.dim.h}` : "") + `  ${r.sizeKb.toFixed(0)}KB`);
  for (const w of r.warnings) console.warn(`    경고: ${w}`);
  if (r.orphan) console.log(`    이전 파일 ${basename(r.orphan)}은 남겨뒀다 — 확인 후 지울 것`);
}

if (unmatched.length) {
  console.warn(`\n페이지를 못 알아본 파일 ${unmatched.length}개: ${unmatched.join(", ")}`);
  console.warn("  이름에 1~9 사이의 페이지 번호가 하나만 들어가게 할 것.");
}
if (noAlt.length) {
  console.warn(`\n설명문이 없는 키 ${noAlt.length}개: ${noAlt.join(", ")}`);
  console.warn(`  ${basename(altFile)}에 문장을 넣지 않으면 이전 설명이 그대로 남는다 (spec §5).`);
}

if (dryRun) {
  console.log(`\ndry-run — 실제로 쓰려면 --dry-run 빼고 다시.`);
  process.exit(0);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${done}장 교체 완료.`);

if (has("clean")) {
  for (const f of seen.values()) unlinkSync(join(dir, f));
  console.log(`${dir}에서 원본 ${seen.size}장 삭제 — 같은 파일이 assets에 들어갔다.`);
}
console.log("다음: npm run content:check && npm run preview && npm run brief");
