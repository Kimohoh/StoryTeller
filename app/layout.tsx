import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

/**
 * 고정 주소. 터널 주소는 켤 때마다 바뀌므로, 도메인이 생기면 APP_ORIGIN에 넣는다.
 * 그래야 공유 링크와 OG 주소가 지금 보고 있는 호스트가 아니라 그쪽을 가리킨다.
 * 앱 안의 이동은 전부 상대 경로라서 호스트가 바뀌어도 그대로 산다.
 */
const origin = process.env.APP_ORIGIN;

export const metadata: Metadata = {
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
