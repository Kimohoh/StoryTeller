import type { MetadataRoute } from "next";

/**
 * 홈 화면에 설치되는 앱의 신원.
 * 세로 읽기 전용이고, 바탕은 삽화와 같은 목탄색이라 실행 순간에도 흰 화면이 안 뜬다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "고독 古讀",
    short_name: "고독",
    description:
      "읽는 중 몇 번은 당신에게 묻고, 이를 통해 당신의 위치를 찾습니다.",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1B1917",
    theme_color: "#1B1917",
    categories: ["books", "education", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
