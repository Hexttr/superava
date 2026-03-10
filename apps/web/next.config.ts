import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@superava/ai-provider", "@superava/shared", "@superava/ui"],
};

export default nextConfig;
