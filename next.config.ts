import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // OMDb poster URLs are often served from Amazon/IMDb domains
      { protocol: "http", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "http", hostname: "img.omdbapi.com" },
      { protocol: "https", hostname: "img.omdbapi.com" },
      { protocol: "http", hostname: "ia.media-imdb.com" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
    ],
  },
};

export default nextConfig;
