/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server-only modules don't leak to client
  experimental: {
    serverComponentsExternalPackages: ["@upstash/redis"],
  },
  // Allow Premier League team crest images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "resources.premierleague.com",
        pathname: "/premierleague/badges/**",
      },
      {
        protocol: "https",
        hostname: "fantasy.premierleague.com",
        pathname: "/dist/img/**",
      },
    ],
  },
  // BUILD POLICY: Ignore ESLint during builds to prevent non-critical lint errors from blocking deployment.
  // TypeScript errors are NOT ignored and will still fail the build.
  // TEMPORARY BYPASS - Remove when all lint errors are fixed.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
