/**
 * 작품 레지스트리와 경로 규칙.
 *
 * 슬러그를 코드에 박지 않는다. 작품을 하나 더 붙이는 일이
 * content/works.json 한 줄 + 폴더 하나가 되도록 여기로 모은다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AxisKey, AxisSource } from "./content-types";

export interface WorkEntry {
  slug: string;
  locales: string[];
  order: number;
  status: "published" | "draft";
}

interface Registry {
  default_locale: string;
  works: WorkEntry[];
}

const root = () => process.cwd();

let registry: Registry | null = null;

export function works(): Registry {
  if (registry && process.env.NODE_ENV === "production") return registry;
  registry = JSON.parse(readFileSync(join(root(), "content/works.json"), "utf8"));
  registry!.works.sort((a, b) => a.order - b.order);
  return registry!;
}

/** 서재에 뜨는 작품. draft는 직접 URL로만 열린다. */
export function publishedWorks(): WorkEntry[] {
  return works().works.filter((w) => w.status === "published");
}

export function workEntry(slug: string): WorkEntry | null {
  return works().works.find((w) => w.slug === slug) ?? null;
}

export function defaultLocale(): string {
  return works().default_locale;
}

/** 작품이 그 로케일을 갖고 있으면 그대로, 아니면 기본 로케일로 떨어진다. */
export function resolveLocale(slug: string, locale?: string): string {
  const w = workEntry(slug);
  if (!w) throw new Error(`works.json에 없는 작품: ${slug}`);
  const want = locale ?? defaultLocale();
  return w.locales.includes(want) ? want : w.locales[0];
}

/* ---------- 경로 ---------- */

export const contentDir = (slug: string) => join(root(), "content", slug);
export const sourcePath = (slug: string, locale: string, ext: "md" | "json" | "results.json") =>
  join(contentDir(slug), `${locale}.${ext}`);
export const buildPath = (slug: string, locale: string) =>
  join(root(), "content/.build", slug, `${locale}.json`);

/* ---------- 전역 축 (spec §3) ---------- */

let axesCache: Record<AxisKey, AxisSource> | null = null;

/**
 * 앱 공통 축. 작품이 늘어나도 이 둘은 공유한다 — 그래야 여러 작품을 읽을수록
 * 사용자 좌표가 정밀해진다. 작품별 json은 축을 정의하지 않고 참조만 한다.
 */
export function globalAxes(): Record<AxisKey, AxisSource> {
  if (axesCache && process.env.NODE_ENV === "production") return axesCache;
  const raw = JSON.parse(readFileSync(join(root(), "content/axes.json"), "utf8"));
  axesCache = raw.axes;
  return axesCache!;
}
