import { cookies } from "next/headers";
import { createSession } from "@/lib/session-repo";
import { anonymousUserId } from "@/lib/user";
import { sessionCookieName } from "@/lib/session-cookie";

export async function POST(req: Request) {
  const { slug } = (await req.json()) as { slug?: string };
  if (!slug) return new Response("slug required", { status: 400 });

  const userId = await anonymousUserId();
  let session;
  try {
    session = createSession(slug, userId);
  } catch (e) {
    return new Response((e as Error).message, { status: 404 });
  }

  // 읽기 화면이 세션을 찾는 경로는 하나뿐이다. 표지의 server action으로 들어오든
  // 이 API로 들어오든 같은 쿠키가 서야 한다.
  (await cookies()).set(sessionCookieName(slug), session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ session_id: session.id, scoring_version: session.scoring_version });
}
