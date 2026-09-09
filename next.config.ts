import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "media.valorant-api.com" }],
  },
  // three + drei ship ESM that Next should bundle rather than externalize.
  transpilePackages: ["three"],
};

export default nextConfig;
