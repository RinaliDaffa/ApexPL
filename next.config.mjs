/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-only modules don't leak to client
  experimental: {
    serverComponentsExternalPackages: ["@upstash/redis"],
  },
};

export default nextConfig;
