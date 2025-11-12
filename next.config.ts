import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use custom build directory for pre-push hooks to avoid conflicts with dev server
  distDir: process.env.NEXT_BUILD_DIR || '.next',

  images: {
    // Remote patterns for YouTube thumbnails (will use unoptimized prop on components)
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

    // Reduce image optimization costs
    // Images are mostly YouTube thumbnails that don't change often
    formats: ['image/webp'], // Only generate WebP, not AVIF (reduces transformations)
    deviceSizes: [640, 750, 828, 1080, 1200], // Reduced from default (saves transformations)
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Reduced set
    minimumCacheTTL: 31536000, // Cache for 1 year (365 days) - images rarely change
  },

  async redirects() {
    return [
      {
        source: '/videos',
        destination: '/library',
        permanent: true,
      },
      {
        source: '/videos/:path*',
        destination: '/library/:path*',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
