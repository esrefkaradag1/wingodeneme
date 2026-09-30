/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// Yerelde YKS (3001) + KPSS (3002) aynı anda çalışınca .next çakışmasını önler.
const distDir =
  process.env.NEXT_DIST_DIR ||
  (process.env.NEXT_PUBLIC_APP_MODE === 'kpss' ? '.next-kpss' : '.next');

const nextConfig = {
  distDir,
  transpilePackages: ['@designcodeio/threeui'],
  // Standalone sadece production build'de; dev modda gereksiz yük oluşturuyordu.
  ...(process.env.VERCEL || isDev ? {} : { output: 'standalone' }),
  images: {
    domains: ['wingo-sinav-uploads.s3.eu-central-1.amazonaws.com', 'ui-avatars.com'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
