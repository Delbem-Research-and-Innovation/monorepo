/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 5 * 60,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
