/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for @netlify/plugin-nextjs
  output: undefined, // Let the Netlify plugin handle this — do NOT set "standalone" or "export"

  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/**",
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // pdf-parse uses canvas on server — alias it away in browser bundles
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};

module.exports = nextConfig;
