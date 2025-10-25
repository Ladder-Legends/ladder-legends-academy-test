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

    // Disabled quality optimizations since we're using unoptimized on most images
    // But keeping reasonable defaults for any images that do get optimized
    quality: 75, // Lower quality (default is 75, but being explicit)
  },
};

export default nextConfig;
