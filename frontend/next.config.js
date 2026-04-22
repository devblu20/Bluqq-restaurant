const path = require("path");

module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // basePath NAHI chahiye ← remove karo

  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};