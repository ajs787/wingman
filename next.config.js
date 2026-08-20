/** @type {import('next').NextConfig} */
const nextConfig = {
  // @vercel/blob pulls in undici, whose modern syntax the bundler can't parse.
  // It only runs in nodejs route handlers, so require it at runtime instead of
  // bundling it.
  experimental: {
    serverComponentsExternalPackages: ['@vercel/blob'],
  },
};

module.exports = nextConfig;
