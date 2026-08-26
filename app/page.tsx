import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSession } from "@/lib/session-repo";
import { anonymousUserId } from "@/lib/user";
import { sessionCookieName } from "@/lib/session-cookie";
import { loadWork } from "@/lib/work-repo";

const SLUG = "metamorphosis";

async function start() {
  "use server";
  const userId = await anonymousUserId();
  const session = createSession(SLUG, userId);
  (await cookies()).set(sessionCookieName(SLUG), session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/read/${SLUG}/1`);
}

export default function Cover() {
  const work = loadWork(SLUG);
  const pages = work.pages.length;

  return (
    <main className="wrap cover">
      <h1>{work.title}</h1>
      <p className="sub">{work.subtitle}</p>
      <p className="note">
        {pages}장. 중간에 몇 번 당신에게 묻습니다. 답은 이야기를 바꾸지 않습니다.
      </p>
      <form action={start}>
        <button className="next" type="submit">읽기 시작</button>
      </form>
    </main>
  );
}
