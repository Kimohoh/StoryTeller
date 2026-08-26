import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "엄마, 내가 바퀴벌레가 되면 어떡할 거야?",
  description: "프란츠 카프카 『변신』 — 능동적 읽기판",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
