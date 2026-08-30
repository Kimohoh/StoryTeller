import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE = "st_uid";

/**
 * 이미 있는 익명 id를 읽기만 한다. 없으면 null.
 *
 * 서버 컴포넌트는 렌더 중에 쿠키를 쓸 수 없다. 서재처럼 그냥 보여주기만 하는
 * 화면은 이쪽을 쓴다 — 아직 아무것도 읽지 않은 사람에게 id를 발급할 이유도 없다.
 */
export async function currentUserId(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

/**
 * 로그인 없음. 쿠키에 담긴 익명 id 하나가 전부다.
 * 마찰이 0이라 완독률이 가장 높고, 나중에 계정을 붙일 때 이 id를 승격시키면 된다.
 *
 * 쿠키를 새로 굽기 때문에 Server Action이나 Route Handler에서만 부를 수 있다.
 */
export async function anonymousUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 2,
    path: "/",
  });
  return id;
}
