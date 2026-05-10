import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Essencial para o Docker
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
