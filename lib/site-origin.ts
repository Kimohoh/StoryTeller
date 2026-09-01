import { headers } from "next/headers";

/**
 * 이 사이트가 지금 어떤 주소로 열려 있는가.
 *
 * APP_ORIGIN이 있으면 그것을 쓴다(도메인이 정해진 뒤). 없으면 요청이 들어온
 * 호스트에서 만든다 — 터널 주소로 열어도, 도메인으로 열어도 그때그때 맞는
 * 절대 주소가 나간다. 앞단 주소가 바뀌어도 환경변수를 고칠 필요가 없다.
 *
 * OG 카드·robots·sitemap 모두 절대 주소를 요구한다. 세 곳이 같은 답을 하도록
 * 여기 하나만 둔다.
 */
export async function siteOrigin(): Promise<string | null> {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}
