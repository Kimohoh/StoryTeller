import { readFileSync } from "node:fs";
import { join } from "node:path";
import { entry } from "@/lib/illustrations";

const MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_: Request, ctx: { params: Promise<{ slug: string; key: string }> }) {
  const { slug, key } = await ctx.params;
  const e = entry(slug, key);
  if (!e) return new Response("not found", { status: 404 });

  // manifest가 가리키는 파일만 읽는다. URL에 담긴 값은 경로로 쓰지 않는다.
  const buf = readFileSync(join(process.cwd(), "assets/illustrations", e.src));
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": MIME[e.type] ?? "application/octet-stream",
      // version이 URL에 있으므로 영구 캐시해도 안전하다
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
