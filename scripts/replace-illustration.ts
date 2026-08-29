/**
 * 삽화 교체 (spec §5).
 *
 * 외부에서 받은 이미지 파일을 assets에 넣고 manifest 한 줄을 고친다.
 * 콘텐츠 JSON도, 스키마도, 화면 코드도 건드리지 않는다 — 그게 이 구조의 요점이다.
 *
 *   npm run illustration                              현재 상태 보기
 *   npm run illustration -- <키> <파일> --alt "설명"   교체
 *   npm run illustration -- <키> <파일> --keep-alt     설명 그대로 두고 교체
 *
 * alt를 강제하는 이유: 이미지가 바뀌면 그 이미지를 설명하는 문장도 같이 바뀌어야 한다.
 * 옛 설명을 새 그림에 얹어두면 화면 리더를 쓰는 사람에게 거짓말이 나간다.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets/illustrations");
const MANIFEST = join(ASSETS, "manifest.json");

interface Entry {
  type: string;
  src: string;
  alt: string;
  credit: string | null;
  version: number;
}

const TYPES: Record<string, string> = {
  ".png": "png", ".jpg": "jpg", ".jpeg": "jpg", ".webp": "webp", ".svg": "svg",
};

/* ---------- 이미지 치수 (의존성 없이 헤더만 읽는다) ---------- */

function dimensions(buf: Buffer, ext: string): { w: number; h: number } | null {
  try {
    if (ext === ".png") {
      if (buf.readUInt32BE(0) !== 0x89504e47) return null;
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (ext === ".jpg" || ext === ".jpeg") {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        // SOF0~SOF15 중 DHT(C4)·JPG(C8)·DAC(CC)를 뺀 것이 실제 프레임 헤더다
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
      return null;
    }
    if (ext === ".webp") {
      const fourcc = buf.toString("ascii", 12, 16);
      if (fourcc === "VP8X") {
        return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
      }
      if (fourcc === "VP8 ") {
        const s = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
        if (s < 0) return null;
        return { w: buf.readUInt16LE(s + 3) & 0x3fff, h: buf.readUInt16LE(s + 5) & 0x3fff };
      }
      return null; // VP8L(무손실)은 비트 단위라 읽지 않는다 — 치수 검사만 건너뛴다
    }
    if (ext === ".svg") {
      const text = buf.toString("utf8", 0, 2000);
      const vb = /viewBox\s*=\s*["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/.exec(text);
      if (vb) return { w: Number(vb[1]), h: Number(vb[2]) };
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

/* ---------- 현재 상태 ---------- */

function list(manifest: Record<string, Entry>) {
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
  console.log(
    "\n교체:  npm run illustration -- <키> <파일경로> --alt \"새 설명\"",
  );
}

/* ---------- 실행 ---------- */

const manifest: Record<string, Entry> = JSON.parse(readFileSync(MANIFEST, "utf8"));
const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1] ?? "") : null;
};
const has = (name: string) => argv.includes(`--${name}`);
const positional = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.match(/^--(alt|credit)$/));

if (positional.length === 0) {
  list(manifest);
  process.exit(0);
}

const [key, file] = positional;
const fail = (msg: string) => { console.error(`\n${msg}\n`); process.exit(1); };

if (!key || !file) fail("사용법: npm run illustration -- <키> <파일경로> --alt \"새 설명\"");
if (!(key in manifest)) {
  fail(`manifest에 없는 키: ${key}\n쓸 수 있는 키: ${Object.keys(manifest).join(", ")}`);
}
if (!existsSync(file)) fail(`파일이 없다: ${file}`);

const ext = extname(file).toLowerCase();
const type = TYPES[ext];
if (!type) fail(`지원하지 않는 형식: ${ext} (png, jpg, webp, svg만)`);

const alt = flag("alt");
if (!alt && !has("keep-alt")) {
  fail(
    "--alt \"새 설명\"이 필요하다.\n" +
    "이미지가 바뀌면 설명도 같이 바뀌어야 한다 (spec §5). 정말 그대로 둘 거면 --keep-alt.",
  );
}

const buf = readFileSync(file);
const dim = dimensions(buf, ext);
const sizeKb = statSync(file).size / 1024;
const warnings: string[] = [];

if (dim) {
  const ratio = dim.w / dim.h;
  if (Math.abs(ratio - 4 / 3) > 0.02) {
    warnings.push(`비율이 4:3이 아니다 — ${dim.w}×${dim.h} (${ratio.toFixed(3)}:1). 8장이 나란히 놓일 때 어긋난다.`);
  }
  if (dim.w < 1200 && type !== "svg") {
    warnings.push(`가로 ${dim.w}px — 고해상도 화면에서 뭉갠다. 1600px 이상 권장.`);
  }
}
if (sizeKb > 1500) warnings.push(`${sizeKb.toFixed(0)}KB — 모바일에서 무겁다. 압축을 권한다.`);

const old = manifest[key];
const dir = dirname(old.src);                    // 작품 폴더는 그대로 쓴다
const nextSrc = join(dir, `${key}${ext}`);
const dest = join(ASSETS, nextSrc);

if (has("dry-run")) {
  console.log(`(dry-run) ${key}: ${old.src} → ${nextSrc}, v${old.version} → ${old.version + 1}`);
  for (const w of warnings) console.warn("  경고: " + w);
  process.exit(0);
}

copyFileSync(file, dest);
manifest[key] = {
  type,
  src: nextSrc,
  alt: alt ?? old.alt,
  credit: flag("credit") ?? old.credit,
  // 올리면 URL이 바뀌어 캐시가 깨진다. 앱 배포 없이 그림만 교체된다.
  version: old.version + 1,
};
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

console.log(`${key} 교체 완료`);
console.log(`  ${old.src} (v${old.version})  →  ${nextSrc} (v${manifest[key].version})`);
if (dim) console.log(`  ${dim.w}×${dim.h}, ${sizeKb.toFixed(0)}KB`);
if (old.src !== nextSrc && existsSync(join(ASSETS, old.src))) {
  console.log(`  이전 파일 ${basename(old.src)}은 남겨뒀다 — 확인 후 지울 것`);
}
for (const w of warnings) console.warn("  경고: " + w);
console.log("\n다음: npm run content:check && npm run preview");
