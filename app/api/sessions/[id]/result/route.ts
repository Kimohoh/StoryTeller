import { getSession } from "@/lib/session-repo";
import { getDb } from "@/lib/db";
import { buildResult } from "@/lib/verdict";

/**
 * 축이 처음 나가는 지점. 8문항을 다 답하기 전에는 아무것도 주지 않는다.
 * 읽는 중에 채점표를 미리 내려주면 네트워크 탭에 축이 그대로 노출된다.
 */
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) return new Response("session not found", { status: 404 });

  const slug = (
    getDb().prepare("SELECT slug FROM works WHERE id = ?").get(session.work_id) as { slug: string }
  ).slug;

  const result = buildResult(slug, id);
  if (result.answered < result.total) {
    return new Response(
      JSON.stringify({ error: "incomplete", answered: result.answered, total: result.total }),
      { status: 409, headers: { "content-type": "application/json" } },
    );
  }
  return Response.json(result);
}
