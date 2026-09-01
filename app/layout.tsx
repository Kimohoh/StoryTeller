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
    "각색한 고전 문학으로 읽어 내는 나의 위치. 읽는 중 몇 번 당신에게 묻고, 다 읽으면 당신이 읽은 방식을 돌려줍니다.",
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
