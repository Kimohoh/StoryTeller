import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

const COOKIE = "st_uid";

/**
 * 로그인 없음. 쿠키에 담긴 익명 id 하나가 전부다.
 * 마찰이 0이라 완독률이 가장 높고, 나중에 계정을 붙일 때 이 id를 승격시키면 된다.
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
