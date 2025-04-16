/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds for now
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during production builds for now
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 