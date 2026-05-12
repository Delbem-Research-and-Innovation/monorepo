/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 5 * 60,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['maplibre-gl', '@ttoss/geovis'],
  webpack: (config) => {
    // maplibre-gl's UMD dist bundle contains `import.meta.webpackHot` (inserted
    // by webpack during MapLibre's own build). When Next.js webpack parses the
    // file it does not detect it as an ES module and fails on `import.meta`.
    // `javascript/auto` unlocks import.meta handling without requiring the file
    // to declare `type: module`.
    config.module.rules.push({
      test: /[\\/]node_modules[\\/]maplibre-gl[\\/]/,
      type: 'javascript/auto',
    });
    return config;
  },
};

export default nextConfig;
