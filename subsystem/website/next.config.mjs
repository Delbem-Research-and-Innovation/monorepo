/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 5 * 60,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['maplibre-gl', '@ttoss/geovis'],
};

export default nextConfig;
