import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@superava/shared", "@superava/ui"],
};

export default nextConfig;
