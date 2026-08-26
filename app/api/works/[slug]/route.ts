import { readingPayload } from "@/lib/work-repo";

/** 읽기용. 축·가중치는 이 응답에 존재하지 않는다 (spec §2). */
export async function GET(_: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    return Response.json(readingPayload(slug));
  } catch {
    return new Response("not found", { status: 404 });
  }
}
