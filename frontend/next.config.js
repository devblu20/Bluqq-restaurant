import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  basePath: "/restaurant",

  webpack: (config) => {
    // ✅ Add top-level await support
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // ✅ Your existing alias
    config.resolve.alias["@"] = path.resolve(__dirname);

    return config;
  },
};

export default nextConfig;
