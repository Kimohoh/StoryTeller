/**
 * 삽화 교체 구조 (spec §5).
 *
 * 콘텐츠 JSON은 키만 참조한다. 파일 경로도, 확장자도, 치수도 모른다.
 * 교체 = manifest 한 줄 수정 + 파일 추가. 콘텐츠·스키마·코드 변경 없음.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface ManifestEntry {
  type: "svg" | "png" | "jpg" | "webp";
  src: string;
  /** alt는 manifest에 둔다. 이미지가 바뀌면 설명도 같이 바뀌어야 하니까. */
  alt: string;
  credit: string | null;
  /** 올리면 캐시 무효화. 앱 업데이트 없이 삽화만 교체된다. */
  version: number;
}

const ASSETS = join(process.cwd(), "assets/illustrations");

let cache: Record<string, ManifestEntry> | null = null;

export function manifest(): Record<string, ManifestEntry> {
  if (cache && process.env.NODE_ENV === "production") return cache;
  cache = JSON.parse(readFileSync(join(ASSETS, "manifest.json"), "utf8"));
  return cache!;
}

export function entry(key: string): ManifestEntry | null {
  return manifest()[key] ?? null;
}

/** svg는 인라인으로 박는다 — 팔레트가 테마를 따라가야 하고, 요청이 하나 준다. */
export function inlineSvg(e: ManifestEntry): string {
  return readFileSync(join(ASSETS, e.src), "utf8");
}

/** 교체본이 이미지 파일일 때. version이 쿼리로 붙어 캐시를 깬다. */
export function publicUrl(key: string, e: ManifestEntry): string {
  return `/api/illustrations/${key}?v=${e.version}`;
}
