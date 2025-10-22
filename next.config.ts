import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use custom build directory for pre-push hooks to avoid conflicts with dev server
  distDir: process.env.NEXT_BUILD_DIR || '.next',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
    ],
  },
};

export default nextConfig;
