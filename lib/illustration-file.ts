/**
 * 삽화 파일 다루기 (spec §5).
 * 단건 교체 스크립트와 일괄 교체 스크립트가 같이 쓴다.
 */
import { readFileSync, copyFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";

export interface Entry {
  type: string;
  src: string;
  alt: string;
  credit: string | null;
  version: number;
}

export const TYPES: Record<string, string> = {
  ".png": "png", ".jpg": "jpg", ".jpeg": "jpg", ".webp": "webp", ".svg": "svg",
};

/** 9:16 세로 카드. 모바일 한 화면을 채우는 형식이다. */
export const DEFAULT_RATIO = 9 / 16;
/** 본문 칼럼이 최대 544px이므로 1080이면 2배수를 넘긴다. */
export const MIN_WIDTH = 1080;

export function parseRatio(spec: string | null | undefined): number {
  if (!spec) return DEFAULT_RATIO;
  const m = /^(\d+(?:\.\d+)?)[:x/](\d+(?:\.\d+)?)$/.exec(spec.trim());
  return m ? Number(m[1]) / Number(m[2]) : NaN;
}

/* ---------- 치수 (의존성 없이 헤더만 읽는다) ---------- */

export function dimensions(buf: Buffer, ext: string): { w: number; h: number } | null {
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
      const vb = /viewBox\s*=\s*["']\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/.exec(
        buf.toString("utf8", 0, 2000),
      );
      return vb ? { w: Number(vb[1]), h: Number(vb[2]) } : null;
    }
  } catch {
    return null;
  }
  return null;
}

/* ---------- 교체 ---------- */

export interface ReplaceResult {
  key: string;
  from: string;
  to: string;
  version: number;
  dim: { w: number; h: number } | null;
  sizeKb: number;
  warnings: string[];
  /** 확장자가 바뀌어 남게 된 이전 파일 */
  orphan: string | null;
}

/** manifest 객체를 제자리에서 고친다. 파일 쓰기는 호출부가 한다. */
export function replaceEntry(
  assetsDir: string,
  manifest: Record<string, Entry>,
  key: string,
  file: string,
  opts: { alt?: string; credit?: string | null; ratio?: number; dryRun?: boolean } = {},
): ReplaceResult {
  const old = manifest[key];
  if (!old) throw new Error(`manifest에 없는 키: ${key}`);

  const ext = extname(file).toLowerCase();
  const type = TYPES[ext];
  if (!type) throw new Error(`지원하지 않는 형식: ${ext} (png, jpg, webp, svg만)`);

  const buf = readFileSync(file);
  const dim = dimensions(buf, ext);
  const sizeKb = statSync(file).size / 1024;
  const wantRatio = opts.ratio ?? DEFAULT_RATIO;
  const warnings: string[] = [];

  if (dim) {
    const ratio = dim.w / dim.h;
    if (Math.abs(ratio - wantRatio) > 0.02) {
      warnings.push(
        `비율이 어긋난다 — ${dim.w}×${dim.h} (${ratio.toFixed(3)}, 기대 ${wantRatio.toFixed(3)}). 아홉 장이 나란히 놓일 때 어긋난다.`,
      );
    }
    if (dim.w < MIN_WIDTH && type !== "svg") {
      warnings.push(`가로 ${dim.w}px — 고해상도 화면에서 뭉갠다. ${MIN_WIDTH}px 이상 권장.`);
    }
  }
  if (sizeKb > 1500) warnings.push(`${sizeKb.toFixed(0)}KB — 모바일에서 무겁다. 압축을 권한다.`);

  const nextSrc = join(dirname(old.src), `${key}${ext}`);   // 작품 폴더는 그대로 쓴다
  const orphan =
    old.src !== nextSrc && existsSync(join(assetsDir, old.src)) ? old.src : null;

  if (!opts.dryRun) {
    // 작품 폴더는 첫 삽화를 받을 때 아직 없다. copyFileSync는 폴더를 안 만든다.
    mkdirSync(dirname(join(assetsDir, nextSrc)), { recursive: true });
    copyFileSync(file, join(assetsDir, nextSrc));
    manifest[key] = {
      type,
      src: nextSrc,
      alt: opts.alt ?? old.alt,
      credit: opts.credit !== undefined ? opts.credit : old.credit,
      // 올리면 URL이 바뀌어 캐시가 깨진다. 앱 배포 없이 그림만 교체된다.
      version: old.version + 1,
    };
  }

  return {
    key, from: old.src, to: nextSrc, version: old.version + 1,
    dim, sizeKb, warnings, orphan,
  };
}
