/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double rendering on Leaflet map instances
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
