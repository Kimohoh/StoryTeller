import { recordOutboundClick } from "@/lib/outbound";
import { workEntry } from "@/lib/works";
import { currentSessionId } from "@/lib/session-cookie";

/**
 * 밖으로 나간 클릭 한 건. sendBeacon이 부르므로 응답은 볼 사람이 없다 —
 * 무엇이 잘못돼도 204로 끝내고 링크는 이미 열려 있다.
 */
export async function POST(req: Request) {
  try {
    const { slug, target } = (await req.json()) as { slug?: string; target?: string };
    if (slug && workEntry(slug)) {
      recordOutboundClick(slug, target === "original" ? "original" : "other", await currentSessionId(slug));
    }
  } catch {
    // 집계 실패는 조용히 넘긴다
  }
  return new Response(null, { status: 204 });
}
