/**
 * 받은 원본을 앱이 내보낼 형태로 줄인다.
 *
 * 외부에서 오는 파일은 보통 손실 없는 PNG라 한 장에 2~3MB씩 된다. 아홉 장이면
 * 20MB가 넘고, 그건 모바일에서 읽히는 앱이 감당할 무게가 아니다. WebP로 바꾸고
 * 표시 크기의 배수까지만 줄인다.
 *
 *   npm run illustration:optimize -- --dry-run
 *   npm run illustration:optimize
 *
 * 원본은 지운다 — incoming/ 커밋과 git 이력에 남아 있고, assets에 둘을 다 두면
 * 저장소만 두 배가 된다. manifest의 version이 올라가므로 캐시는 자동으로 깨진다.
 */
import { readFileSync, writeFileSync, unlinkSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { Entry } from "../lib/illustration-file";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets/illustrations");
const MANIFEST = join(ASSETS, "manifest.json");

/** 본문 칼럼은 최대 544px. 1080이면 2배수를 넘겨 고해상도 화면에서도 충분하다. */
const MAX_WIDTH = 1080;
const QUALITY = 82;

const dryRun = process.argv.includes("--dry-run");
const manifest: Record<string, Entry> = JSON.parse(readFileSync(MANIFEST, "utf8"));

let before = 0;
let after = 0;
let changed = 0;

for (const [key, e] of Object.entries(manifest)) {
  if (e.type === "svg") continue;                       // 벡터는 이미 가볍다

  const src = join(ASSETS, e.src);
  const beforeKb = statSync(src).size / 1024;
  const meta = await sharp(src).metadata();

  const pipeline = sharp(src).webp({ quality: QUALITY });
  if ((meta.width ?? 0) > MAX_WIDTH) pipeline.resize({ width: MAX_WIDTH });
  const buf = await pipeline.toBuffer();
  const afterKb = buf.length / 1024;

  before += beforeKb;
  after += afterKb;
  changed++;

  const nextSrc = join(dirname(e.src), `${key}.webp`);
  console.log(
    `${key.padEnd(16)} ${meta.width}×${meta.height} ${e.type} ${beforeKb.toFixed(0)}KB` +
      `  →  webp ${afterKb.toFixed(0)}KB  (${(100 - (afterKb / beforeKb) * 100).toFixed(0)}% 감소)`,
  );

  if (dryRun) continue;

  writeFileSync(join(ASSETS, nextSrc), buf);
  if (nextSrc !== e.src) unlinkSync(src);
  manifest[key] = { ...e, type: "webp", src: nextSrc, version: e.version + 1 };
}

if (changed === 0) {
  console.log("줄일 것이 없다 — 전부 svg다.");
  process.exit(0);
}

console.log(
  `\n합계 ${(before / 1024).toFixed(1)}MB → ${(after / 1024).toFixed(1)}MB` +
    ` (${(100 - (after / before) * 100).toFixed(0)}% 감소)`,
);

if (dryRun) {
  console.log("dry-run — 실제로 쓰려면 --dry-run 빼고 다시.");
} else {
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log("다음: npm run content:check && npm run preview && npm run brief");
}
