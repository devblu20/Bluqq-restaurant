const path = require("path");

module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // output: 'export' bilkul mat likhna  ← already nahi hai, good

  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    config.resolve.alias["@"] = path.resolve(__dirname);

    return config;
  },
};