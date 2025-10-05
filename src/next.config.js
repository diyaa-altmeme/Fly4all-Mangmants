
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https' ,
        hostname: 'assets.sindibad.iq',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ridefly.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fly4all.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'alrawdataintravel.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd3x4b1wy4qlu9.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'flyway.travel',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fly4all-78277122-3cbd0.appspot.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

module.exports = nextConfig;
