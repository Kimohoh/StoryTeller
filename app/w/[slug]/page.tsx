import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createSession } from "@/lib/session-repo";
import { anonymousUserId } from "@/lib/user";
import { sessionCookieName } from "@/lib/session-cookie";
import { loadWork } from "@/lib/work-repo";
import { workEntry } from "@/lib/works";
import { Illustration } from "@/components/Illustration";

export const dynamic = "force-dynamic";

export default async function Cover({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!workEntry(slug)) notFound();

  let work;
  try {
    work = loadWork(slug);
  } catch {
    notFound();
  }

  async function start() {
    "use server";
    const session = createSession(slug, await anonymousUserId());
    (await cookies()).set(sessionCookieName(slug), session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    redirect(`/read/${slug}/1`);
  }

  const first = work.pages[0];

  return (
    <main className="wrap cover">
      <Illustration work={slug} k={first?.illustration_key ?? null} className="illustration cover-art" priority />
      <h1>{work.title}</h1>
      <p className="sub">{work.subtitle}</p>
      <p className="note">
        {work.pages.length}장. 중간에 몇 번 당신에게 묻습니다. 답은 이야기를 바꾸지 않습니다.
      </p>
      <form action={start}>
        <button className="next" type="submit">읽기 시작</button>
      </form>
      <Link className="quiet-link" href="/">서재로</Link>
    </main>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const w = loadWork(slug);
    return { title: w.title, description: w.subtitle };
  } catch {
    return {};
  }
}
