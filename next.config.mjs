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
};

export default nextConfig;
