const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Updated base path
  basePath: "/restaurant",

  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    config.resolve.alias["@"] = path.resolve(__dirname);

    return config;
  },
};

module.exports = nextConfig;
