import type { MetadataRoute } from "next";
import { publishedWorks } from "@/lib/works";
import { siteOrigin } from "@/lib/site-origin";

/**
 * 색인 대상은 서재 한 장, 작품마다 표지 한 장, '그냥 읽기' 한 장이다.
 * 작품이 늘면 works.json만 보고 저절로 늘어난다.
 *
 * 앞단 주소가 바뀌어도 그때 들어온 호스트로 다시 쓴다. 주소를 못 알아내면
 * 빈 sitemap을 내보낸다 — 틀린 주소를 색인시키는 것보다 낫다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  if (!origin) return [];

  const now = new Date();
  return [
    { url: origin, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...publishedWorks().flatMap((w) => [
      {
        url: `${origin}/w/${w.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      },
      {
        url: `${origin}/reread/${w.slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      },
    ]),
  ];
}

export const dynamic = "force-dynamic";
