
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
  webpack: (config, { isServer }) => {
    // This is to ignore the warning "require.extensions is not supported by webpack"
    // from handlebars library.
    config.externals.push('handlebars');
    
    // This is required to allow the Next.js dev server to run in a container.
    // It's a workaround for a known issue with file watching in some environments.
    config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
    }

    return config;
  },
  // This is required to allow the Next.js dev server to run in a container.
  // @see https://nextjs.org/docs/pages/api-reference/next-config-js/output#caveats
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
};

module.exports = nextConfig;
