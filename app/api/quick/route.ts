import { anonymousUserId } from "@/lib/user";
import { scoreQuick, recordQuick } from "@/lib/quick";
import { characters } from "@/lib/characters";
import { globalAxes } from "@/lib/works";

/**
 * 입구의 채점은 서버에서 한다.
 *
 * 축 이름도, 인물이 놓인 자리도 다 답한 뒤에야 내려간다 — 읽기 화면과 같은
 * 규칙이다 (spec §2). 무엇을 재는 중인지 알고 나면 답이 달라지기 때문이다.
 */
export async function POST(req: Request) {
  let picks: string[];
  try {
    const body = (await req.json()) as { picks?: unknown };
    if (!Array.isArray(body.picks)) return new Response("bad request", { status: 400 });
    picks = body.picks.filter((p): p is string => typeof p === "string").slice(0, 20);
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (picks.length === 0) return new Response("bad request", { status: 400 });

  const result = scoreQuick(picks);
  const userId = await anonymousUserId();
  try {
    recordQuick(userId, picks, result);
  } catch {
    // 집계에 실패해도 결과는 보여준다 — 읽는 사람의 일이 우선이다
  }

  return Response.json({
    a: result.a,
    b: result.b,
    axes: globalAxes(),
    characters: characters(),
    // 장면이 나온 인물만. 이 목록에 없는 인물은 이름 없는 점으로 그려진다.
    // 작품 단위로 열면 그 작품의 안 나온 인물까지 이름이 뜬다.
    shownKeys: result.shown.map((c) => c.key),
    near: result.near
      ? { name: result.near.name, source: result.near.source, note: result.near.note }
      : null,
  });
}
