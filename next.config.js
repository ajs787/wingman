/** @type {import('next').NextConfig} */
const nextConfig = {
  // @vercel/blob pulls in undici, whose modern syntax the bundler can't parse.
  // It only runs in nodejs route handlers, so require it at runtime instead of
  // bundling it.
  experimental: {
    serverComponentsExternalPackages: ['@vercel/blob'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Without HSTS the first visit to a bare "wingman33.com" link goes out
          // over HTTP before the redirect, and mobile browsers flag the page as
          // "Not secure" — especially with a password field on it. This pins the
          // domain to HTTPS so that window never happens again after one visit.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
