const path = require("path");

module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ✅ Yeh zaroori hai - static files ka sahi path
  assetPrefix: "https://bluqq-restaurant.vercel.app",

  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};