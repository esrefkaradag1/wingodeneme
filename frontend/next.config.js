/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
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
