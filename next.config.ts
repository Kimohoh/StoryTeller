import type { NextConfig } from "next";

const config: NextConfig = {
  // 컨테이너에 넣을 최소 런타임만 뽑는다
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};

export default config;
