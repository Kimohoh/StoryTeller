import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

/**
 * OG 주소는 반드시 절대 주소여야 한다 — 카카오톡·트위터 크롤러는 상대 주소를
 * 못 읽고, 그러면 카드에 그림이 안 뜬다.
 *
 * APP_ORIGIN이 있으면 그것을 쓴다(도메인이 정해진 뒤). 없으면 요청이 들어온
 * 호스트에서 만든다 — 터널 주소로 열어도, 도메인으로 열어도 그때그때 맞는
 * 절대 주소가 나간다. 환경변수를 깜빡해도 그림이 안 뜨는 일이 없다.
 */
async function siteOrigin(): Promise<string | null> {
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

export async function generateMetadata(): Promise<Metadata> {
  const origin = await siteOrigin();
  return {
  ...(origin ? { metadataBase: new URL(origin) } : {}),
  title: {
    default: "고독 古讀",
    template: "%s — 고독 古讀",
  },
  description:
    "읽는 중 몇 번은 당신에게 묻고, 이를 통해 당신의 위치를 찾습니다.",
  /**
   * 공유 카드는 한 장으로 고정한다. 작품이 늘어도 그림은 그대로이고, 카톡·트위터에
   * 뜨는 글(title/description)만 페이지마다 달라진다. 결과마다 그림을 새로 그리면
   * 유형 수만큼(작품당 넷) 관리할 것이 늘고, 정작 썸네일에서는 안 읽힌다.
   *
   * 그림을 바꾸려면 public/og.png 한 장만 갈아끼우면 된다.
   */
  openGraph: {
    type: "website",
    siteName: "고독 古讀",
    locale: "ko_KR",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "고독 古讀" }],
  },
  twitter: { card: "summary_large_image" },
  applicationName: "고독 古讀",
  appleWebApp: {
    capable: true,
    title: "고독",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#1B1917",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
