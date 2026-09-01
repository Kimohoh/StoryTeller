import type { Metadata, Viewport } from "next";
import { siteOrigin } from "@/lib/site-origin";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

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
  /**
   * 애드센스 심사는 이 스크립트가 <head>에 있어야 시작된다.
   *
   * 승인 전에도 넣어 둘 수 있고, 넣어 둬야 심사가 걸린다. 값이 없으면
   * 아무것도 나가지 않으므로 개발 중에는 로컬에 변수를 두지 않으면 된다.
   * 승인 뒤 광고 단위를 어디에 붙일지는 이 태그와 별개다 — 자동 광고를
   * 켜면 이것만으로 붙는다.
   */
  const adsense = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  return (
    <html lang="ko">
      <head>
        {adsense ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
