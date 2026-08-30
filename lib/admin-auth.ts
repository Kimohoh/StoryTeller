import { cookies, headers } from "next/headers";

const COOKIE = "st_admin";

/**
 * 관리자 화면 잠금.
 *
 * ADMIN_TOKEN이 없으면 아무도 못 들어온다 — 안 걸어두면 열려버리는 쪽이 아니라
 * 안 걸어두면 잠기는 쪽으로 기운다. 테스트 규모에 맞는 최소한의 자물쇠고,
 * 사람이 붙기 시작하면 제대로 된 인증으로 바꿔야 한다.
 */
export async function adminOk(token?: string): Promise<"ok" | "no-token-configured" | "denied"> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return "no-token-configured";

  if (token && safeEqual(token, expected)) return "ok";
  const fromCookie = (await cookies()).get(COOKIE)?.value;
  if (fromCookie && safeEqual(fromCookie, expected)) return "ok";
  return "denied";
}

export const ADMIN_COOKIE = COOKIE;

/** 길이와 내용이 다를 때 걸리는 시간이 달라지지 않게 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 로그에 토큰이 남지 않게, 어디서 들어왔는지만 */
export async function requestOrigin(): Promise<string> {
  return (await headers()).get("host") ?? "unknown";
}
