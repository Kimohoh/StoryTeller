import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: {
    default: "다시 읽는 서재",
    template: "%s — 다시 읽는 서재",
  },
  description:
    "퍼블릭 도메인 고전을 짧게 각색해 읽습니다. 읽는 중 몇 번 당신에게 묻고, 다 읽으면 당신이 읽은 방식을 돌려줍니다.",
  applicationName: "다시 읽는 서재",
  appleWebApp: {
    capable: true,
    title: "서재",
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
