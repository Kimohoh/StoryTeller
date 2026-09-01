/**
 * ads.txt — 이 도메인의 광고 재고를 누가 팔 수 있는지 적은 공개 목록이다.
 * 없어도 심사는 통과하지만, 없으면 애드센스가 '수익 손실 위험' 경고를 띄운다.
 *
 * 퍼블리셔 ID가 있어야 쓸 수 있으므로 환경변수로 둔다. 승인 뒤
 * ADSENSE_PUBLISHER_ID(pub-0000000000000000)만 넣으면 이 파일이 살아난다.
 * 값이 없으면 404를 낸다 — 빈 ads.txt는 '아무도 팔 수 없다'는 선언이라
 * 있는 것보다 없는 게 낫다.
 */
export function GET() {
  const pub = process.env.ADSENSE_PUBLISHER_ID;
  if (!pub) return new Response("Not Found", { status: 404 });

  const lines = [`google.com, ${pub}, DIRECT, f08c47fec0942fa0`];

  // 애드핏을 같이 붙이면 여기에 한 줄이 더 붙는다 (카카오가 주는 값 그대로)
  if (process.env.ADFIT_ADS_TXT) lines.push(process.env.ADFIT_ADS_TXT);

  return new Response(lines.join("\n") + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const dynamic = "force-dynamic";
