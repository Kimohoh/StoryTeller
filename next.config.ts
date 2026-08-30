import type { NextConfig } from "next";

const config: NextConfig = {
  // standalone은 컨테이너 이미지를 작게 만들려는 것이고, 켜두면 `next start`가 막힌다.
  // 로컬에서 그대로 돌려보는 길을 막지 않도록 도커 빌드에서만 켠다.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3"],
};

export default config;
