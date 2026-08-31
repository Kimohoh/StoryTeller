import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { createSession } from "@/lib/session-repo";
import { anonymousUserId } from "@/lib/user";
import { sessionCookieName } from "@/lib/session-cookie";
import { loadWork } from "@/lib/work-repo";
import { workEntry } from "@/lib/works";
import { currentUserId } from "@/lib/user";
import { readWorks } from "@/lib/reader";
import { Illustration } from "@/components/Illustration";
import { OfflineSave } from "@/components/OfflineSave";
import { workAssetUrls, workAssetSize } from "@/lib/work-repo";

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
  // 읽기 전용이다 — 표지를 열었다고 id를 발급하지 않는다
  const userId = await currentUserId();
  const done = userId ? readWorks(userId).find((w) => w.slug === slug) : undefined;

  return (
    <main className="wrap cover">
      <Illustration work={slug} k={first?.illustration_key ?? null} className="illustration cover-art" priority />
      <h1>{work.title}</h1>
      <p className="sub">{work.subtitle}</p>
      <p className="note">{work.pages.length}장</p>

      {/* 진입을 둘로 나눈다. 답하며 읽으면 자리가 나오고, 그냥 읽으면 이야기만 남는다. */}
      <div className="entries">
        <form action={start}>
          <button className="next entry" type="submit">
            답하며 읽기
            <small>중간에 몇 번 묻습니다. 답은 이야기를 바꾸지 않고, 다 읽으면 당신의 자리가 나옵니다.</small>
          </button>
        </form>

        <Link className="next entry ghost" href={`/reread/${slug}`}>
          그냥 읽기
          <small>묻지 않습니다. 처음부터 끝까지 이야기만 읽습니다.</small>
        </Link>
      </div>

      {done ? (
        <p className="note reread-note">
          이미 답하며 읽은 작품입니다. <Link href={`/result/${done.session_id}`}>지난 결과 보기</Link>
          {" — "}다시 답하며 읽으면 이번 답으로 바뀝니다.
        </p>
      ) : null}

      <OfflineSave urls={workAssetUrls(slug)} sizeHint={workAssetSize(slug)} />

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
