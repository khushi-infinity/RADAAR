import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API routes call Cognee/n8n/Sarvam — keep them on the Node runtime
  experimental: {},
};

export default nextConfig;
