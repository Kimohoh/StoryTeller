import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site-origin";

/**
 * 검색엔진에 무엇을 보일지.
 *
 * 서재와 표지, 그리고 '그냥 읽기'는 공개한다 — 색인될 것은 이것뿐이고,
 * 이것으로 충분하다.
 *
 * 나머지는 막는다. /read는 세션 쿠키가 없으면 표지로 튕기고, /result는
 * 한 사람의 답으로 만들어진 주소다. 크롤러가 남의 결과를 긁어 가면
 * 안 되고, 긁어 가 봐야 색인할 값도 없다. /admin과 /api는 말할 것도 없다.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/read/", "/result/", "/offline"],
      },
      /**
       * 광고 크롤러는 따로 연다.
       *
       * Mediapartners-Google은 색인을 만들지 않는다 — 광고를 띄울 페이지가
       * 무슨 내용인지 읽어 맞는 광고를 고르는 데만 쓴다. 이걸 막아 두면
       * /read와 /result에는 엉뚱한 광고가 뜨거나 아예 안 뜬다.
       *
       * 즉 '색인은 안 되지만 광고는 제대로 붙는' 상태가 이 둘의 조합이다.
       */
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    ...(origin ? { sitemap: `${origin}/sitemap.xml`, host: origin } : {}),
  };
}

export const dynamic = "force-dynamic";
