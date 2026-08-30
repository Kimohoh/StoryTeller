/**
 * 삽화 교체 구조 (spec §5).
 *
 * 콘텐츠 JSON은 키만 참조한다. 파일 경로도, 확장자도, 치수도 모른다.
 * 작품은 문맥에서 온다 — 작품 둘이 같은 p1_* 키를 써도 부딪히지 않는다.
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

const ASSETS = () => join(process.cwd(), "assets/illustrations");

let cache: Record<string, Record<string, ManifestEntry>> | null = null;

export function manifest(): Record<string, Record<string, ManifestEntry>> {
  if (cache && process.env.NODE_ENV === "production") return cache;
  cache = JSON.parse(readFileSync(join(ASSETS(), "manifest.json"), "utf8"));
  return cache!;
}

export function entry(slug: string, key: string): ManifestEntry | null {
  return manifest()[slug]?.[key] ?? null;
}

/** svg는 인라인으로 박는다 — 팔레트가 테마를 따라가야 하고, 요청이 하나 준다. */
export function inlineSvg(e: ManifestEntry): string {
  return readFileSync(join(ASSETS(), e.src), "utf8");
}

/** 래스터일 때. version이 URL에 있으므로 영구 캐시해도 안전하다. */
export function publicUrl(slug: string, key: string, e: ManifestEntry): string {
  return `/api/illustrations/${slug}/${key}?v=${e.version}`;
}
