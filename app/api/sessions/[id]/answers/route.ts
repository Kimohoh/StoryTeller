import { getSession, recordAnswer, completeSession, getAnswers } from "@/lib/session-repo";
import { anonymousUserId } from "@/lib/user";

/** 서버가 저장하는 건 좌표가 아니라 원본 선택이다 (spec §6). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) return new Response("session not found", { status: 404 });
  if (session.user_id !== (await anonymousUserId())) {
    return new Response("forbidden", { status: 403 });
  }

  const body = (await req.json()) as {
    question_id?: string;
    choice_id?: string;
    dwell_ms?: number;
    complete?: boolean;
  };
  if (!body.question_id || !body.choice_id) {
    return new Response("question_id, choice_id required", { status: 400 });
  }

  try {
    recordAnswer(id, body.question_id, body.choice_id, body.dwell_ms ?? null);
  } catch {
    // FK 위반 = 없는 문항/선택지
    return new Response("unknown question or choice", { status: 400 });
  }
  if (body.complete) completeSession(id);

  return Response.json({ answered: getAnswers(id).length });
}
